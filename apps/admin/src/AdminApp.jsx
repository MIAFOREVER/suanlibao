import React, { useEffect, useState } from "react";
import { RefreshCw, ShieldCheck, Users } from "lucide-react";

const API_BASE = "http://127.0.0.1:8787";
const TOKEN_KEY = "hash_treasure_admin_token";

function token() {
  return localStorage.getItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "request_failed");
  return data;
}

export function AdminApp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token()) return;
    request("/auth/me")
      .then((data) => {
        setUser(data.user);
        return loadUsers();
      })
      .catch(() => localStorage.removeItem(TOKEN_KEY));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await request("/auth/login", { method: "POST", body: { email, password } });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      await loadUsers();
    } catch {
      setError("登录失败，请确认账号密码");
    }
  }

  async function loadUsers() {
    const data = await request("/admin/users");
    setUsers(data.users);
  }

  if (!user) {
    return (
      <main className="login">
        <form onSubmit={submit}>
          <ShieldCheck size={42} />
          <h1>用户后台</h1>
          <label>邮箱<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p>{error}</p>}
          <button>登录后台</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header>
        <div>
          <h1>算力宝用户后台</h1>
          <p>{user.email} / UID {user.uid}</p>
        </div>
        <button onClick={loadUsers}><RefreshCw size={18} />刷新</button>
      </header>
      <section className="summary">
        <div><Users size={24} /><strong>{users.length}</strong><span>用户总数</span></div>
        <div><ShieldCheck size={24} /><strong>{users.reduce((n, item) => n + item.devices, 0)}</strong><span>绑定设备</span></div>
      </section>
      <section className="tablePanel">
        <table>
          <thead>
            <tr>
              <th>UID</th>
              <th>邮箱</th>
              <th>设备数</th>
              <th>注册时间</th>
              <th>最后在线</th>
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.uid}</td>
                <td>{item.email}</td>
                <td>{item.devices}</td>
                <td>{item.createdAt}</td>
                <td>{item.lastSeenAt || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
