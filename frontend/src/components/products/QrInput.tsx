import React, { useRef, useState } from "react";
import axios from "axios";
import jsQR from "jsqr";

import { PRODUCTS_API_BASE_URL } from "../../config/api";
import TransactionHistory from "./TransactionHistory";

type ProductStatus = "registered" | "verified" | "suspicious";
type Availability = "available" | "reserved" | "sold";

type RegisteredBy = {
  user_id: number;
  username: string;
  role_id: string;
} | null;

type CurrentOwner =
  | {
      user_id: number;
      username: string;
      role_id: string;
      start_on?: string;
    }
  | null;

type LatestListing =
  | {
      listing_id: number;
      price: string;
      currency: string;
      status: Availability;
      created_on: string;
    }
  | null;

/** What YOUR UI wants to render */
type VerifyData = {
  serial: string;
  model: string | null; // display title
  status: ProductStatus;
  registeredOn: string;
  registeredBy: RegisteredBy;
  currentOwner: CurrentOwner;
  latestListing: LatestListing;
  isAuthentic: boolean | null;
};

/** What BACKEND actually returns now (blockchain-integrated) */
type VerifyResponse = {
  success: boolean;
  data?: {
    productId?: number;
    productName?: string | null;
    serialNumber?: string;
    batchNumber?: string | null;
    category?: string | null;
    manufactureDate?: string | null;
    productDescription?: string | null;
    status?: ProductStatus;
    registeredOn?: string;

    manufacturer?: {
      userId?: number;
      username?: string;
      publicKey?: string;
      verified?: boolean;
    } | null;

    currentOwner?: {
      userId?: number;
      username?: string;
      publicKey?: string;
    } | null;

    lifecycleStatus?: string;
    blockchainStatus?: string;
    isAuthentic?: boolean | null;
  };
  error?: string;
  details?: string;
};

type QrInputProps = {
  onSerialChange?: (serial: string) => void;
};

/**
 * Accepts:
 * - QR payload from your app (varies): "FYP25|NIKE-AIR-001|2|hash..." OR "FYP25|productId|SERIAL|manufacturerId|hash"
 * - or direct serial: "NIKE-AIR-001"
 */
const extractSerial = (inputRaw: string): string => {
  const input = (inputRaw ?? "").trim();
  if (!input) return "";

  const parts = input.split("|").map((p) => p.trim());

  // If QR is delimited, try to find the part that looks like a serial
  if (parts.length >= 2) {
    // Common patterns:
    // - FYP25|NIKE-AIR-001|...
    // - FYP25|productId|NIKE-AIR-001|...
    if (parts[0].toUpperCase().includes("FYP25")) {
      // If parts[1] looks like serial, use it; else use parts[2]
      const candidate1 = parts[1] || "";
      const candidate2 = parts[2] || "";
      // heuristic: serial usually contains letters/numbers and a dash, e.g. NIKE-AIR-001
      if (candidate1 && /[A-Za-z].*-.*\d/.test(candidate1)) return candidate1;
      if (candidate2) return candidate2;
    }
  }

  return input;
};

const safeToLocale = (iso: string | null | undefined) => {
  if (!iso) return "Unknown";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

const QrInput: React.FC<QrInputProps> = ({ onSerialChange }) => {
  const [productCode, setProductCode] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [result, setResult] = useState<VerifyData | null>(null);

  const [serialForHistory, setSerialForHistory] = useState<string | undefined>(
    undefined
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  const setSerialEverywhere = (serial: string) => {
    const trimmed = serial.trim();
    setSerialForHistory(trimmed);
    onSerialChange?.(trimmed);
  };

  const verifyProduct = async (code: string) => {
    const raw = code.trim();
    if (!raw) {
      setStatusMessage("Please scan or enter a product code first.");
      return;
    }

    const serial = extractSerial(raw);
    if (!serial) {
      setStatusMessage("Invalid QR payload. Cannot extract serial number.");
      return;
    }

    setSerialEverywhere(serial);
    setStatusMessage(null);
    setResult(null);

    try {
      setIsVerifying(true);

      const res = await axios.get<VerifyResponse>(
        `${PRODUCTS_API_BASE_URL}/verify`,
        { params: { serial } }
      );

      if (!res.data.success || !res.data.data) {
        setStatusMessage(
          res.data.details || res.data.error || "Product not found."
        );
        setResult(null);
        return;
      }

      const payload = res.data.data;

      if (!payload) {
        setStatusMessage("Product data missing from server response.");
        setResult(null);
        return;
      }

      // ✅ In your backend, product fields are directly in `data`
      const mapped: VerifyData = {
        serial: payload.serialNumber ?? serial,
        model: payload.productName ?? null,
        status: (payload.status ?? "registered") as ProductStatus,
        registeredOn: payload.registeredOn ?? "",

        registeredBy: payload.manufacturer?.username
          ? {
              user_id: Number(payload.manufacturer.userId ?? 0) || 0,
              username: payload.manufacturer.username,
              role_id: "manufacturer",
            }
          : null,

        currentOwner: payload.currentOwner?.username
          ? {
              user_id: Number(payload.currentOwner.userId ?? 0) || 0,
              username: payload.currentOwner.username,
              role_id: "consumer", // backend doesn't send role; keep generic
              start_on: "",
            }
          : null,

        // Your verify response doesn't include listing info (keep null)
        latestListing: null,

        isAuthentic:
          payload.isAuthentic === undefined ? null : payload.isAuthentic,
      };

      setResult(mapped);
      setSerialEverywhere(mapped.serial);
      setStatusMessage(null);

    } catch (err: any) {
      setStatusMessage(
        err.response?.data?.error ||
          err.response?.data?.details ||
          "Failed to verify product."
      );
      setResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  // ========= CAMERA SCANNING =========

  const stopCamera = () => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

    if (qrCode?.data) {
      const code = qrCode.data.trim();
      setProductCode(code);
      setStatusMessage("QR code detected from camera. Verifying...");
      stopCamera();
      void verifyProduct(code);
      return;
    }

    animationRef.current = requestAnimationFrame(scanFrame);
  };

  const handleToggleCamera = async () => {
    if (isCameraOpen) {
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMessage("Camera not supported on this device.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      setIsCameraOpen(true);
      setStatusMessage("Point your camera at the QR code.");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        animationRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setStatusMessage("Unable to access camera. Check permissions.");
    }
  };

  // ========= IMAGE UPLOAD SCANNING =========

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const img = new Image();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, canvas.width, canvas.height);

      if (qrCode?.data) {
        const code = qrCode.data.trim();
        setProductCode(code);
        setStatusMessage("QR code detected from image. Verifying...");
        void verifyProduct(code);
      } else {
        setStatusMessage("No QR code found in the uploaded image.");
      }
    };

    reader.readAsDataURL(file);
  };

  // ========= MANUAL VERIFY BUTTON =========

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void verifyProduct(productCode);
  };

  // ========= STATUS COLOURS =========

  const getStatusStyles = (status: ProductStatus) => {
    switch (status) {
      case "verified":
        return { bg: "#ecfdf3", border: "#22c55e", text: "#15803d" };
      case "registered":
        return { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" };
      case "suspicious":
        return { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c" };
      default:
        return { bg: "#f9fafb", border: "#e5e7eb", text: "#374151" };
    }
  };

  const statusStyles = result ? getStatusStyles(result.status) : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>Scan or Enter Product Code</h2>
      <p style={{ marginBottom: 24, color: "#6b7280" }}>
        Use your camera or upload an image to scan the QR code. You can also
        enter the product code manually to verify authenticity.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: 24,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              border: "1px dashed #cbd5f5",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              marginBottom: 16,
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#f9fafb",
            }}
          >
            {!isCameraOpen && (
              <>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    border: "2px dashed #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    marginBottom: 16,
                  }}
                >
                  📷
                </div>
                <p style={{ marginBottom: 16, color: "#6b7280" }}>
                  Point your camera at the QR code. The code is usually on the
                  packaging or product tag.
                </p>
              </>
            )}

            {isCameraOpen && (
              <video
                ref={videoRef}
                style={{
                  width: "100%",
                  maxWidth: 420,
                  borderRadius: 12,
                  background: "black",
                }}
                muted
                playsInline
              />
            )}

            <button
              type="button"
              onClick={handleToggleCamera}
              style={{
                marginTop: 16,
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: "#1d4ed8",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {isCameraOpen ? "Close Camera Scanner" : "Open Camera Scanner"}
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>
              Or upload a QR image
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ fontSize: 14 }}
            />
          </div>

          <form onSubmit={handleVerifySubmit}>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>
              Or enter serial number manually
            </p>
            <input
              type="text"
              placeholder="Enter Serial (e.g., NIKE-AIR-001)"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                marginBottom: 12,
                fontSize: 14,
              }}
            />

            {statusMessage && !result && (
              <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 8 }}>
                {statusMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!productCode.trim() || isVerifying}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 999,
                border: "none",
                background: productCode.trim() ? "#111827" : "#9ca3af",
                color: "white",
                cursor: productCode.trim() ? "pointer" : "not-allowed",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              {isVerifying ? "Verifying..." : "Verify Product"}
            </button>
          </form>
        </section>

        {/* RIGHT */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {result && statusStyles ? (
            <div
              style={{
                background: statusStyles.bg,
                borderRadius: 16,
                padding: 20,
                border: `1px solid ${statusStyles.border}`,
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 4,
                  color: statusStyles.text,
                }}
              >
                {result.status === "verified"
                  ? "Product Verified"
                  : result.status === "registered"
                  ? "Product Registered"
                  : "Suspicious Product"}
              </h3>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: 12,
                  color: statusStyles.text,
                  fontSize: 13,
                }}
              >
                {result.isAuthentic === true &&
                  "This product is authentic and registered in BlockTrace."}
                {result.isAuthentic === false &&
                  "This product is flagged as suspicious. Please contact support or the seller."}
                {result.isAuthentic === null &&
                  "This product is registered but not yet fully verified."}
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1.4fr",
                  gap: 16,
                  fontSize: 14,
                  color: "#374151",
                }}
              >
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>
                    {result.model ?? "Unknown Model"}
                  </h4>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Serial No: <strong>{result.serial}</strong>
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    Registered on: {safeToLocale(result.registeredOn)}
                  </p>
                </div>

                <div style={{ fontSize: 13 }}>
                  <p style={{ margin: 0, marginBottom: 4 }}>
                    <strong>Registered by:</strong>{" "}
                    {result.registeredBy ? result.registeredBy.username : "Unknown"}
                  </p>
                  <p style={{ margin: 0, marginBottom: 4 }}>
                    <strong>Current owner:</strong>{" "}
                    {result.currentOwner ? result.currentOwner.username : "Unknown"}
                  </p>

                  {result.latestListing && (
                    <p style={{ margin: 0 }}>
                      <strong>Latest listing:</strong>{" "}
                      {result.latestListing.price} {result.latestListing.currency} (
                      {result.latestListing.status}) on{" "}
                      {new Date(result.latestListing.created_on).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 16,
                padding: 20,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                color: "#4b5563",
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8 }}>
                Product Verification
              </h4>
              <p style={{ margin: 0 }}>
                Scan/upload to auto-verify and see product details. Transaction
                history will appear below after a serial is detected.
              </p>
            </div>
          )}
        </section>
      </div>

      <div style={{ marginTop: 28 }}>
        <TransactionHistory serial={serialForHistory} />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden />
    </div>
  );
};

export default QrInput;
