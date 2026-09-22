import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Icon, Logo, ThemeSwitch } from "./UI";

export default function Layout() {
  const { profile, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    const close = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  const links = [
    ["dashboard", "Dashboard"],
    ["transactions", "Transactions"],
    ["budget", "Budget"],
    ["goals", "Financial Goals"],
    ["reports", "Reports"],
    ["settings", "Settings"],
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <Logo />
        <nav className="side-nav" aria-label="Main navigation">
          {links.map(([path, label]) => (
            <NavLink key={path} to={`/${path}`}>
              <Icon name={path} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="side-profile">
          <div className="avatar">
            {profile.name
              .split(" ")
              .map((word) => word[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div className="who">
            <strong>{profile.name}</strong>
            <span>{profile.email}</span>
          </div>
        </div>
        <button
          className="logout-btn"
          onClick={() => {
            notify("Logged out of the demo");
            navigate("/login");
          }}
        >
          Log out
        </button>
      </aside>
      <div
        className={`sidebar-overlay${open ? " open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <div className="main">
        <div className="topbar">
          <button
            className="hamburger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div style={{ flex: 1 }} />
          <form
            className="search-box"
            onSubmit={(event) => {
              event.preventDefault();
              navigate(`/transactions?q=${encodeURIComponent(search)}`);
            }}
          >
            <Icon name="search" />
            <input
              aria-label="Search transactions"
              placeholder="Search transactions"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <ThemeSwitch />
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
