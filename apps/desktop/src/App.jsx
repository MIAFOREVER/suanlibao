import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Cpu,
  Gauge,
  HelpCircle,
  Home,
  Laptop,
  LogOut,
  Menu,
  MonitorPlay,
  Play,
  Settings,
  Square,
  Terminal,
  UserCircle,
  X
} from "lucide-react";
import { api, clearToken, getToken, login, me, register } from "./api";
import brandLogo from "./assets/brand-logo.png";

const coins = ["XMR", "RVN", "CFX", "PRL"];
const gpuCoins = ["PRL", "CFX", "RVN"];

export function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [device, setDevice] = useState({ deviceId: "", hostname: "DESKTOP" });
  const [view, setView] = useState("home");
  const [minerStates, setMinerStates] = useState({});
  const [selectedGpuCoin, setSelectedGpuCoin] = useState(
    () => localStorage.getItem("xinghuo_gpu_coin") || "PRL"
  );
  const [logs, setLogs] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("xinghuo_sidebar_collapsed") === "true"
  );

  useEffect(() => {
    async function boot() {
      const desktopDevice = await window.desktop?.device?.();
      if (desktopDevice) setDevice(desktopDevice);

      if (getToken()) {
        try {
          const current = await me();
          setUser(current);
        } catch {
          clearToken();
        }
      }
      setBooting(false);
    }
    boot();
  }, []);

  useEffect(() => {
    if (!user || !device.deviceId) return;
    const beat = () =>
      api("/devices/heartbeat", {
        method: "POST",
        body: { deviceId: device.deviceId, hostname: device.hostname, status: "online" }
      }).catch(() => {});
    beat();
    const timer = setInterval(beat, 30000);
    return () => clearInterval(timer);
  }, [user, device]);

  useEffect(() => {
    let offEvent = () => {};
    let offLog = () => {};
    async function wire() {
      const list = await window.desktop?.miners?.list?.();
      if (list) {
        setMinerStates(
          Object.fromEntries(list.map((item) => [item.coin, { ...item, hashrate: 0 }]))
        );
      }
      offEvent =
        window.desktop?.miners?.onEvent?.((event) => {
          setMinerStates((prev) => ({ ...prev, [event.coin]: { ...prev[event.coin], ...event } }));
          setLogs((prev) => [formatEvent(event), ...prev].slice(0, 80));
          if (user && device.deviceId) {
            api("/miner/events", {
              method: "POST",
              body: { ...event, deviceId: device.deviceId }
            }).catch(() => {});
          }
        }) || offEvent;
      offLog =
        window.desktop?.miners?.onLog?.((log) => {
          setLogs((prev) => [`${timeOnly(log.at)} [${log.coin}] ${log.text}`, ...prev].slice(0, 80));
        }) || offLog;
    }
    wire();
    return () => {
      offEvent();
      offLog();
    };
  }, [user, device.deviceId]);

  const gpuRunning = useMemo(
    () => minerStates[selectedGpuCoin]?.status === "running",
    [minerStates, selectedGpuCoin]
  );
  const cpuRunning = minerStates.XMR?.status === "running";

  if (booting) return <div className="boot">正在启动...</div>;
  if (!user) return <AuthScreen onAuthed={setUser} />;

  function logout() {
    clearToken();
    setUser(null);
  }

  async function toggleCoin(coin) {
    const running = minerStates[coin]?.status === "running";
    const next = running
      ? await window.desktop.miners.stop(coin)
      : await window.desktop.miners.start(coin);
    setMinerStates((prev) => ({ ...prev, [coin]: { ...prev[coin], ...next } }));
  }

  async function toggleGpu() {
    if (gpuRunning) {
      const next = await window.desktop.miners.stop(selectedGpuCoin);
      setMinerStates((prev) => ({ ...prev, [selectedGpuCoin]: { ...prev[selectedGpuCoin], ...next } }));
      return;
    }

    for (const coin of gpuCoins) {
      if (coin !== selectedGpuCoin && minerStates[coin]?.status === "running") {
        const stopped = await window.desktop.miners.stop(coin);
        setMinerStates((prev) => ({ ...prev, [coin]: { ...prev[coin], ...stopped } }));
      }
    }

    const next = await window.desktop.miners.start(selectedGpuCoin);
    setMinerStates((prev) => ({ ...prev, [selectedGpuCoin]: { ...prev[selectedGpuCoin], ...next } }));
  }

  function changeGpuCoin(coin) {
    setSelectedGpuCoin(coin);
    localStorage.setItem("xinghuo_gpu_coin", coin);
  }

  function toggleSidebar() {
    setSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      localStorage.setItem("xinghuo_sidebar_collapsed", String(next));
      return next;
    });
  }

  return (
    <div className={sidebarCollapsed ? "shell sidebarCollapsed" : "shell"}>
      <aside className="sidebar">
        <div className="brand">
          <img className="brandIcon brandLogo" src={brandLogo} alt="星火 AI" />
          <div className="brandText">
            <strong>星火 AI</strong>
            <span>Xinghuo AI</span>
          </div>
          <button className="brandMenu" onClick={toggleSidebar} title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}>
            <Menu size={24} />
          </button>
        </div>
        <nav>
          <SideButton icon={Home} active={view === "home"} label="首页" onClick={() => setView("home")} />
          <SideButton icon={Settings} active={view === "settings"} label="设置" onClick={() => setView("settings")} />
          <SideButton icon={Terminal} active={view === "logs"} label="日志" onClick={() => setView("logs")} />
        </nav>
        <div className="sidebarFoot">
          <p><span className="dot" /> {user.email}</p>
          <button onClick={logout} title="退出登录"><LogOut size={24} /><span className="sideLabel">退出登录</span></button>
          <b>v0.1.0</b>
        </div>
      </aside>

      <main className="main">
        <header className="titlebar">
          <div />
          <div className="titleTools">
            <MonitorPlay size={20} />
            <Bell size={20} />
            <UserCircle size={34} />
            <span><small>UID</small>{user.uid}</span>
            <i />
            <button onClick={() => window.desktop?.minimize?.()}>-</button>
            <button onClick={() => window.desktop?.close?.()}><X size={20} /></button>
          </div>
        </header>
        {view === "home" && (
          <HomeView
            device={device}
            minerStates={minerStates}
            cpuRunning={cpuRunning}
            gpuRunning={gpuRunning}
            selectedGpuCoin={selectedGpuCoin}
            onToggleCoin={toggleCoin}
            onToggleGpu={toggleGpu}
            onGpuCoinChange={changeGpuCoin}
          />
        )}
        {view === "settings" && <SettingsView minerStates={minerStates} />}
        {view === "logs" && <LogsView logs={logs} />}
      </main>
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = mode === "login" ? await login(email, password) : await register(email, password);
      onAuthed(user);
    } catch (err) {
      setError(errorText(err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authPage">
      <section className="authPanel">
        <img className="authBrand brandLogo" src={brandLogo} alt="星火 AI" />
        <h1>星火 AI</h1>
        <p>登录后绑定本机设备，手动启动 CPU/GPU 算力任务。</p>
        <form onSubmit={submit}>
          <label>邮箱<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" /></label>
          <label>密码<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="至少 8 位" /></label>
          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={busy}>{busy ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}</button>
        </form>
        <button className="link" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "没有账号？立即注册" : "已有账号？返回登录"}
        </button>
      </section>
    </div>
  );
}

function HomeView({ device, minerStates, cpuRunning, gpuRunning, selectedGpuCoin, onToggleCoin, onToggleGpu, onGpuCoinChange }) {
  return (
    <section className="content">
      <div className="deviceCard">
        <Laptop size={36} />
        <div>
          <h2>{device.hostname}</h2>
          <p>ID: {device.deviceId.slice(0, 32)}</p>
        </div>
        <span className="online"><span className="dot" /> 在线</span>
      </div>

      <div className="cards">
        <MineCard title="CPU" icon={Cpu} detail="XMR" running={cpuRunning} hashrate={minerStates.XMR?.hashrate} onClick={() => onToggleCoin("XMR")} />
        <MineCard title="GPU" icon={MonitorPlay} detail={selectedGpuCoin} running={gpuRunning} hashrate={minerStates[selectedGpuCoin]?.hashrate} onClick={onToggleGpu}>
          <label className="coinSelect">
            <span>GPU 币种</span>
            <select value={selectedGpuCoin} onChange={(event) => onGpuCoinChange(event.target.value)}>
              {gpuCoins.map((coin) => (
                <option key={coin} value={coin}>{coin} / {minerStates[coin]?.algorithm || "-"}</option>
              ))}
            </select>
          </label>
        </MineCard>
      </div>

      <div className="trend">
        <h3><Gauge size={22} /> 算力趋势</h3>
        <div className="chart">
          {Array.from({ length: 28 }).map((_, index) => (
            <span key={index} style={{ height: `${index < 3 && (cpuRunning || gpuRunning) ? 65 - index * 12 : 2}%` }} />
          ))}
        </div>
        <div className="legend"><span />CPU <b />GPU</div>
      </div>

      <div className="helpDock">
        <button><HelpCircle size={20} /> 帮助</button>
      </div>
    </section>
  );
}

function MineCard({ title, icon: Icon, detail, running, hashrate, onClick, children }) {
  return (
    <div className="mineCard">
      <div className="mineHead"><Icon size={26} /><h3>{title}</h3></div>
      <p>{detail}</p>
      {children && <div className="mineControls">{children}</div>}
      <strong>{running ? `${Number(hashrate || 0).toFixed(2)} H/s` : "--"}</strong>
      <button className={running ? "stopBtn" : "startBtn"} onClick={onClick}>
        {running ? <Square size={18} /> : <Play size={18} />} {running ? "停止" : "启动"}
      </button>
    </div>
  );
}

function SettingsView({ minerStates }) {
  return (
    <section className="content">
      <div className="plainPanel">
        <h2>内核配置</h2>
        <p>在 `apps/desktop/electron/miners.json` 填入官方内核路径和矿池参数；未配置时会进入模拟模式。</p>
        <div className="coinGrid">
          {coins.map((coin) => (
            <div key={coin}>
              <b>{coin}</b>
              <span>{minerStates[coin]?.engine || "unknown"}</span>
              <small>{minerStates[coin]?.algorithm || "-"}</small>
              <em>{minerStates[coin]?.configured ? "已配置" : "模拟模式"}</em>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LogsView({ logs }) {
  return (
    <section className="content logsContent">
      <div className="plainPanel logPanel">
        <h2>运行日志</h2>
        <pre>{logs.length ? logs.join("\n") : "暂无日志"}</pre>
      </div>
    </section>
  );
}

function SideButton({ icon: Icon, active, label, onClick }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick} title={label}>
      <Icon size={26} />
      <span className="sideLabel">{label}</span>
    </button>
  );
}

function timeOnly(value) {
  return new Date(value).toLocaleTimeString("zh-CN", { hour12: false });
}

function formatEvent(event) {
  return `${timeOnly(event.at)} [${event.coin}] ${event.status} ${event.hashrate || 0} H/s ${event.message || ""}`;
}

function errorText(code) {
  const map = {
    invalid_email: "邮箱格式不正确",
    weak_password: "密码至少需要 8 位",
    email_exists: "这个邮箱已经注册",
    invalid_credentials: "邮箱或密码错误"
  };
  return map[code] || "请求失败，请确认后台 API 已启动";
}
