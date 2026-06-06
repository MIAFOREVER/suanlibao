const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TOKEN_TTL = "7d";

function publicUser(row) {
  return {
    id: row.id,
    uid: row.uid,
    email: row.email,
    createdAt: row.created_at
  };
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, uid: user.uid, email: user.email }, JWT_SECRET, {
    expiresIn: TOKEN_TTL
  });
}

function requireAuth(db) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const [, token] = header.match(/^Bearer (.+)$/) || [];
    if (!token) return res.status(401).json({ error: "missing_token" });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.findUserById(payload.sub);
      if (!user) return res.status(401).json({ error: "invalid_user" });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ error: "invalid_token" });
    }
  };
}

module.exports = {
  hashPassword,
  publicUser,
  requireAuth,
  signToken,
  verifyPassword
};
