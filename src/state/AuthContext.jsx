import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api, getToken, setToken } from "../lib/api";

const AuthContext = createContext(null);

// Real accounts now come from PHP/MySQL. No passwords ship in the React bundle.

function splitName(name = "") {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: words.shift() || "", last_name: words.join(" ") || "—" };
}

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [registrationOpen, setRegistrationOpenState] = useState(true);

  useEffect(() => {
    // Check a stored token with PHP before showing protected pages.
    if (!getToken()) { setLoading(false); return; }
    api("/profile").then(setAccount).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api("/auth/registration-status", { token: null })
      .then((result) => setRegistrationOpenState(result.registrationOpen))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (account?.role !== "admin") { setUsers([]); setActivity([]); return; }
    refreshAdmin().catch(console.error);
  }, [account?.id, account?.role]);

  async function login(email, password, expectedRole = "user") {
    const result = await api("/auth/login", {
      method: "POST", body: { email, password }, token: null,
    });
    if (result.user.role !== expectedRole) {
      await api("/auth/logout", { method: "POST", token: result.token }).catch(() => {});
      throw new Error(`Use the ${result.user.role} sign-in page for this account.`);
    }
    setToken(result.token);
    setAccount(result.user);
    return result.user;
  }

  async function register(values) {
    return api("/auth/register", {
      method: "POST",
      body: { ...splitName(values.name), email: values.email, password: values.password },
      token: null,
    });
  }

  async function verifyOtp(email, otp) {
    return api("/auth/verify-otp", { method: "POST", body: { email, otp }, token: null });
  }

  async function resendOtp(email) {
    // The backend limits resend requests and only accepts unverified accounts.
    return api("/auth/resend-otp", { method: "POST", body: { email }, token: null });
  }

  async function logout() {
    try { if (getToken()) await api("/auth/logout", { method: "POST" }); }
    finally { setToken(null); setAccount(null); }
  }

  async function updateIdentity(name, email, phone = "") {
    const revised = await api("/profile", {
      method: "PUT", body: { ...splitName(name), email, phone },
    });
    setAccount(revised);
    return revised;
  }

  async function refreshAdmin() {
    const [firstPage, logs, settings] = await Promise.all([
      api("/admin/users?per_page=100"),
      api("/admin/activity-logs?per_page=200"),
      api("/admin/settings"),
    ]);
    // The existing admin table uses created/lastLogin field names.
    const pages = Math.ceil(firstPage.total / 100);
    const extraPages = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      api(`/admin/users?per_page=100&page=${index + 2}`)));
    const people = [...firstPage.items, ...extraPages.flatMap((page) => page.items)];
    setUsers(people.map((user) => ({ ...user,
      created: user.createdAt, lastLogin: user.lastLoginAt })));
    setActivity(logs.items);
    setRegistrationOpenState(settings.registrationOpen);
  }

  async function createUser(values, selfRegistration = false) {
    if (selfRegistration) return register(values);
    const created = await api("/admin/users", {
      method: "POST",
      body: { ...splitName(values.name), email: values.email, password: values.password },
    });
    await refreshAdmin();
    return created;
  }

  async function updateUser(id, values) {
    if (values.status) {
      await api(`/admin/users/${id}/status`, { method: "PATCH", body: { status: values.status } });
    } else {
      await api(`/admin/users/${id}`, {
        method: "PUT",
        body: { ...splitName(values.name), email: values.email,
          ...(values.password ? { password: values.password } : {}) },
      });
    }
    await refreshAdmin();
  }

  async function setRegistrationOpen(value) {
    const result = await api("/admin/settings", {
      method: "PUT", body: { registrationOpen: value },
    });
    setRegistrationOpenState(result.registrationOpen);
  }

  return <AuthContext.Provider value={{
    account, loading, users, activity, registrationOpen,
    login, register, verifyOtp, resendOtp, logout, updateIdentity,
    createUser, updateUser, setRegistrationOpen, refreshAdmin,
  }}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be inside AuthProvider");
  return value;
}

export function RequireRole({ role }) {
  const { account } = useAuth();
  if (!account) return <Navigate replace to={role === "admin" ? "/admin/login" : "/login"} />;
  // Missing roles never pass. PHP also checks permissions on every request.
  if (account.role !== role) {
    return <Navigate replace to={account.role === "admin" ? "/admin" : "/dashboard"} />;
  }
  return <Outlet />;
}
