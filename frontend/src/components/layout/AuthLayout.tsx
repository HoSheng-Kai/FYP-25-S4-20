import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      {/* Left hero panel */}
      <div className="auth-hero">
        <div className="auth-hero-inner">
          {/* Logo row */}
          <div className="auth-logo">
            <div className="auth-logo-icon">BT</div>
            <div>
              <div className="auth-logo-title">BlockTrace</div>
              <div className="auth-logo-subtitle">
                Blockchain Anti-counterfeiting
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="auth-hero-title">
            Blockchain-based<br />
            Traceable Anti-counterfeiting System
          </h1>

          {/* Text */}
          <p className="auth-hero-text">
            Secure your products with blockchain-backed authenticity. Track
            every transaction from manufacturer to end consumer.
          </p>

          {/* Feature bullets */}
          <div className="auth-hero-features">
            <div className="auth-feature">
              <div className="auth-feature-icon">🛡</div>
              <div>
                <div className="auth-feature-title">Immutable Records</div>
                <div className="auth-feature-text">
                  Every product event recorded on the blockchain.
                </div>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">🔍</div>
              <div>
                <div className="auth-feature-title">QR Verification</div>
                <div className="auth-feature-text">
                  Scan to verify authenticity in seconds.
                </div>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon">👥</div>
              <div>
                <div className="auth-feature-title">Multi-role Access</div>
                <div className="auth-feature-text">
                  Manufacturer, Distributor, Retailer & Consumer.
                </div>
              </div>
            </div>
          </div>

          <div className="auth-hero-footer">
            © 2025 BlockTrace. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-wrapper">
        {children}
      </div>
    </div>
  );
}
