import jwt from "jsonwebtoken";

// User authentication middleware
const authUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1️⃣ Check if authorization header exists and starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing or invalid format.",
        code: "UNAUTHORIZED",
      });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
        code: "UNAUTHORIZED",
      });
    }

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach decoded user info to request object
    req.user = decoded;

    // 5️⃣ Continue to next middleware
    next();
  } catch (error) {
    console.error("authUser error:", error.message);

    // Handle specific JWT errors gracefully
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Authentication failed.",
        code: "INVALID_TOKEN",
      });
    }

    // Fallback for other errors
    return res.status(500).json({
      success: false,
      message: "Authentication failed: " + error.message,
      code: "AUTH_ERROR",
    });
  }
};

export default authUser;
