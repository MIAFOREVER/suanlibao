const { spawn } = require("child_process");
const EventEmitter = require("events");
const fs = require("fs");

const DEFAULT_MINERS = {
  XMR: { kernel: "xmrig", engine: "xmrig", type: "cpu", algorithm: "RandomX", args: ["--donate-level=1"] },
  RVN: { kernel: "lolminer", engine: "lolminer", type: "gpu", algorithm: "KAWPOW", args: [] },
  CFX: { kernel: "lolminer", engine: "lolminer", type: "gpu", algorithm: "OCTOPUS", args: [] },
  PRL: { kernel: "alpha-miner", engine: "alpha-miner", type: "gpu", algorithm: "pearl-pow", args: [] }
};

class MinerManager extends EventEmitter {
  constructor(config = {}, options = {}) {
    super();
    this.config = config;
    this.baseDir = options.baseDir || process.cwd();
    this.processes = new Map();
    this.simulators = new Map();
  }

  list() {
    return Object.entries(DEFAULT_MINERS).map(([coin, meta]) => ({
      coin,
      ...this.getCoinConfig(coin, meta),
      status: this.processes.has(coin) || this.simulators.has(coin) ? "running" : "stopped",
      configured: Boolean(this.getKernelConfig(coin)?.path)
    }));
  }

  start(coin, options = {}) {
    const upperCoin = String(coin).toUpperCase();
    const meta = DEFAULT_MINERS[upperCoin];
    if (!meta) throw new Error(`Unsupported coin: ${coin}`);
    if (this.processes.has(upperCoin) || this.simulators.has(upperCoin)) {
      return this.state(upperCoin, "running");
    }

    const coinConfig = this.getCoinConfig(upperCoin, meta);
    const kernelConfig = this.getKernelConfig(upperCoin);
    if (!kernelConfig?.path || !fs.existsSync(kernelConfig.path)) {
      return this.startSimulator(upperCoin, meta);
    }

    const args = [
      ...(kernelConfig.args || []),
      ...(coinConfig.args || meta.args || []),
      ...(options.extraArgs || [])
    ];
    const child = spawn(kernelConfig.path, args, {
      cwd: kernelConfig.cwd || process.cwd(),
      windowsHide: false,
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.processes.set(upperCoin, child);
    this.emit("event", this.state(upperCoin, "running", 0, `started ${coinConfig.engine} process`));

    child.stdout.on("data", (chunk) => this.emitLog(upperCoin, chunk));
    child.stderr.on("data", (chunk) => this.emitLog(upperCoin, chunk));
    child.on("exit", (code) => {
      this.processes.delete(upperCoin);
      this.emit("event", this.state(upperCoin, "stopped", 0, `process exited: ${code}`));
    });

    return this.state(upperCoin, "running");
  }

  getCoinConfig(coin, fallback = DEFAULT_MINERS[coin] || {}) {
    const configured = this.config.coins?.[coin] || this.config[coin] || {};
    const kernel = configured.kernel || fallback.kernel || fallback.engine;
    return {
      ...fallback,
      ...configured,
      kernel,
      engine: configured.engine || kernel || fallback.engine || "unknown",
      algorithm: configured.algorithm || fallback.algorithm || fallback.engine || "unknown",
      args: configured.args || fallback.args || []
    };
  }

  getKernelConfig(coin) {
    const coinConfig = this.getCoinConfig(coin);
    const kernelConfig = this.config.kernels?.[coinConfig.kernel] || {};
    const legacyConfig = this.config[coin] || {};
    const rawPath = kernelConfig.path || legacyConfig.path || "";
    return {
      ...legacyConfig,
      ...kernelConfig,
      args: kernelConfig.args || [],
      path: rawPath ? this.resolvePath(rawPath) : ""
    };
  }

  resolvePath(filePath) {
    if (!filePath || /^[a-zA-Z]:[\\/]/.test(filePath) || filePath.startsWith("\\\\")) {
      return filePath;
    }
    return require("path").resolve(this.baseDir, filePath);
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
    const meta = this.getCoinConfig(coin);
    return {
      coin,
      engine: meta.engine || "unknown",
      algorithm: meta.algorithm || "unknown",
      status,
      hashrate,
      message,
      at: new Date().toISOString()
    };
  }
}

module.exports = { MinerManager, DEFAULT_MINERS };
