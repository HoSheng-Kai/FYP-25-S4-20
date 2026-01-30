import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = {
  userId: number;
  role: "admin" | "manufacturer" | "distributor" | "retailer" | "consumer";
  username: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

const COOKIE_NAME = "bt_session";

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET in backend/.env");
  return s;
}

export function setAuthCookie(res: Response, payload: AuthPayload) {
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,       // set true only when using HTTPS
    sameSite: "lax",     // OK for localhost ports
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    res.status(401).json({ success: false, error: "Not authenticated" });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid session" });
  }
}

export function requireRole(allow: AuthPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    if (!allow.includes(req.auth.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    next();
  };
}
