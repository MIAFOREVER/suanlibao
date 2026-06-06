const fs = require("fs");
const path = require("path");

function createDb() {
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "app.json");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], devices: [], minerEvents: [] }, null, 2));
  }

  function read() {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  }

  function write(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  }

  function nextId(rows) {
    return rows.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
  }

  return {
    findUserByEmail(email) {
      return read().users.find((user) => user.email === email);
    },
    findUserById(id) {
      return read().users.find((user) => user.id === Number(id));
    },
    createUser({ email, passwordHash, uid }) {
      const data = read();
      const user = {
        id: nextId(data.users),
        email,
        password_hash: passwordHash,
        uid,
        created_at: new Date().toISOString()
      };
      data.users.push(user);
      write(data);
      return user;
    },
    upsertDevice({ userId, deviceId, hostname, status }) {
      const data = read();
      let device = data.devices.find((item) => item.device_id === deviceId);
      if (!device) {
        device = {
          id: nextId(data.devices),
          user_id: userId,
          device_id: deviceId,
          hostname,
          status,
          created_at: new Date().toISOString()
        };
        data.devices.push(device);
      }
      device.user_id = userId;
      device.hostname = hostname;
      device.status = status;
      device.last_seen_at = new Date().toISOString();
      write(data);
      return device;
    },
    createMinerEvent(event) {
      const data = read();
      data.minerEvents.push({
        id: nextId(data.minerEvents),
        ...event,
        created_at: new Date().toISOString()
      });
      write(data);
    },
    listUsersWithDevices() {
      const data = read();
      return data.users
        .map((user) => {
          const devices = data.devices.filter((device) => device.user_id === user.id);
          return {
            id: user.id,
            uid: user.uid,
            email: user.email,
            createdAt: user.created_at,
            devices: devices.length,
            lastSeenAt: devices.map((device) => device.last_seen_at).filter(Boolean).sort().at(-1) || null
          };
        })
        .sort((a, b) => b.id - a.id);
    }
  };
}

module.exports = { createDb };
