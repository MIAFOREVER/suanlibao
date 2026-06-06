require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const os = require("os");
const { createDb } = require("./db");
const {
  hashPassword,
  publicUser,
  requireAuth,
  signToken,
  verifyPassword
} = require("./auth");

const db = createDb();
const app = express();
const port = Number(process.env.API_PORT || 8787);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const auth = requireAuth(db);

app.get("/health", (_req, res) => {
  res.json({ ok: true, hostname: os.hostname() });
});

app.post("/auth/register", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "invalid_email" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "weak_password" });
  }

  const exists = db.findUserByEmail(email);
  if (exists) return res.status(409).json({ error: "email_exists" });

  const uid = String(2000 + crypto.randomInt(800000));
  const passwordHash = await hashPassword(password);
  const user = db.createUser({ email, passwordHash, uid });
  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

app.post("/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

app.get("/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

app.post("/devices/heartbeat", auth, (req, res) => {
  const deviceId = String(req.body.deviceId || "");
  const hostname = String(req.body.hostname || "DESKTOP");
  const status = String(req.body.status || "online");
  if (!deviceId) return res.status(400).json({ error: "missing_device_id" });

  db.upsertDevice({ userId: req.user.id, deviceId, hostname, status });

  res.json({ ok: true });
});

app.post("/miner/events", auth, (req, res) => {
  const event = {
    deviceId: String(req.body.deviceId || ""),
    coin: String(req.body.coin || "").toUpperCase(),
    engine: String(req.body.engine || ""),
    status: String(req.body.status || "unknown"),
    hashrate: Number(req.body.hashrate || 0)
  };
  if (!event.deviceId || !event.coin || !event.engine) {
    return res.status(400).json({ error: "invalid_event" });
  }

  db.createMinerEvent({
    user_id: req.user.id,
    device_id: event.deviceId,
    coin: event.coin,
    engine: event.engine,
    status: event.status,
    hashrate: event.hashrate
  });

  res.status(201).json({ ok: true });
});

app.get("/admin/users", auth, (req, res) => {
  const users = db.listUsersWithDevices();
  res.json({ users });
});

if (require.main === module) {
  app.listen(port, "127.0.0.1", () => {
    console.log(`API listening on http://127.0.0.1:${port}`);
  });
}

module.exports = { app, db };
