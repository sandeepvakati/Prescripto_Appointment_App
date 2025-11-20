// middlewares/authDoctor.js
import jwt from "jsonwebtoken";

/**
 * Verifies Bearer JWT and attaches req.user = { id, ...payload }
 * Expects Authorization: Bearer <token>
 */
const authDoctor = (req, res, next) => {
  try {
    // Ensure secret is present
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET not set in environment");
      return res.status(500).json({ success: false, message: "Server misconfiguration" });
    }

    const authHeader = req.headers.authorization; // headers are lowercased in Node
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      // don't leak jwt internals to client; give generic message
      console.error("JWT verify failed:", err);
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Accept common id fields: id, _id, doctorId
    const id = payload?.id || payload?._id || payload?.doctorId;
    if (!id) {
      console.error("JWT payload missing id:", payload);
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    // Attach user info (you can extend this later)
    req.user = { id, ...payload };

    return next();
  } catch (err) {
    console.error("authDoctor unexpected error:", err);
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
};

export default authDoctor;
