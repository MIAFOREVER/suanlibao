const { spawn } = require("child_process");
const EventEmitter = require("events");
const fs = require("fs");

const DEFAULT_MINERS = {
  XMR: { engine: "xmrig", type: "cpu", args: ["--donate-level=1"] },
  RVN: { engine: "kawpow", type: "gpu", args: [] },
  CFX: { engine: "octopus", type: "gpu", args: [] },
  PRL: { engine: "custom", type: "gpu", args: [] }
};

class MinerManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.processes = new Map();
    this.simulators = new Map();
  }

  list() {
    return Object.entries(DEFAULT_MINERS).map(([coin, meta]) => ({
      coin,
      ...meta,
      status: this.processes.has(coin) || this.simulators.has(coin) ? "running" : "stopped",
      configured: Boolean(this.config[coin]?.path)
    }));
  }

  start(coin, options = {}) {
    const upperCoin = String(coin).toUpperCase();
    const meta = DEFAULT_MINERS[upperCoin];
    if (!meta) throw new Error(`Unsupported coin: ${coin}`);
    if (this.processes.has(upperCoin) || this.simulators.has(upperCoin)) {
      return this.state(upperCoin, "running");
    }

    const miner = this.config[upperCoin];
    if (!miner?.path || !fs.existsSync(miner.path)) {
      return this.startSimulator(upperCoin, meta);
    }

    const args = [...(miner.args || meta.args), ...(options.extraArgs || [])];
    const child = spawn(miner.path, args, {
      cwd: miner.cwd || process.cwd(),
      windowsHide: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.processes.set(upperCoin, child);
    this.emit("event", this.state(upperCoin, "running", 0, "started official miner process"));

    child.stdout.on("data", (chunk) => this.emitLog(upperCoin, chunk));
    child.stderr.on("data", (chunk) => this.emitLog(upperCoin, chunk));
    child.on("exit", (code) => {
      this.processes.delete(upperCoin);
      this.emit("event", this.state(upperCoin, "stopped", 0, `process exited: ${code}`));
    });

    return this.state(upperCoin, "running");
  }

  stop(coin) {
    const upperCoin = String(coin).toUpperCase();
    const child = this.processes.get(upperCoin);
    if (child) {
      child.kill();
      this.processes.delete(upperCoin);
    }

    const timer = this.simulators.get(upperCoin);
    if (timer) {
      clearInterval(timer);
      this.simulators.delete(upperCoin);
    }

    const next = this.state(upperCoin, "stopped");
    this.emit("event", next);
    return next;
  }

  stopAll() {
    for (const coin of [...this.processes.keys(), ...this.simulators.keys()]) {
      this.stop(coin);
    }
  }

  startSimulator(coin, meta) {
    let tick = 0;
    const timer = setInterval(() => {
      tick += 1;
      const base = meta.type === "cpu" ? 2.4 : 68;
      const hashrate = Number((base + Math.sin(tick / 2) * base * 0.18).toFixed(2));
      this.emit("event", this.state(coin, "running", hashrate, "simulation mode"));
    }, 1500);
    this.simulators.set(coin, timer);
    const state = this.state(coin, "running", 0, "simulation mode: miner path is not configured");
    this.emit("event", state);
    return state;
  }

  emitLog(coin, chunk) {
    const text = chunk.toString("utf8").trim();
    if (!text) return;
    this.emit("log", { coin, text, at: new Date().toISOString() });
  }

  state(coin, status, hashrate = 0, message = "") {
    const meta = DEFAULT_MINERS[coin] || {};
    return {
      coin,
      engine: meta.engine || "unknown",
      status,
      hashrate,
      message,
      at: new Date().toISOString()
    };
  }
}

module.exports = { MinerManager, DEFAULT_MINERS };
