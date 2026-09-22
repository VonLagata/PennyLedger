import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../state/AppContext";
import { Field, Logo, PasswordField, ThemeSwitch } from "../components/UI";

export default function Auth({ signup = false }) {
  const navigate = useNavigate();
  const { notify } = useApp();
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    if (signup && password.length < 6)
      return setError("Password should be at least 6 characters.");
    if (signup && password !== form.get("verify-password"))
      return setError("Passwords don't match.");
    setError("");
    notify(
      signup
        ? "Demo account ready — welcome to your dashboard"
        : "Welcome back — demo dashboard opened",
    );
    navigate("/dashboard");
  }
  return (
    <>
      <header className="auth-header">
        <Logo />
        <div className="auth-header-actions">
          <ThemeSwitch />
          <Link to="/" className="btn btn-outline btn-sm">
            Home
          </Link>
        </div>
      </header>
      <main className="auth-wrap">
        <div className="auth-copy">
          <h1>
            {signup
              ? "Manage your Money Securely with trust."
              : "Welcome Back!"}
          </h1>
          <p>
            At PennyLedger, your financial privacy and peace of mind are our
            highest priorities. Track your financial logs, budgets, and savings
            goals in one place.
          </p>
        </div>
        <div className="auth-card">
          <h2>{signup ? "Create Account" : "Login"}</h2>
          <p>
            {signup
              ? "Fill your information below to try PennyLedger."
              : "Fill your information below to access your dashboard."}
          </p>
          <form onSubmit={submit}>
            <Field label="Name" name="name" autoComplete="name" required />
            <Field
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <PasswordField
              autoComplete={signup ? "new-password" : "current-password"}
              required
            />
            {signup && (
              <PasswordField
                label="Verify Password"
                name="verify-password"
                autoComplete="new-password"
                required
              />
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <label className="check-row">
              <input type="checkbox" required />
              <span>
                Agree With{" "}
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    notify(
                      "Terms & Conditions are a placeholder in this demo.",
                    );
                  }}
                >
                  Terms &amp; Condition
                </a>
              </span>
            </label>
            <button type="submit" className="btn btn-dark">
              {signup ? "Sign Up" : "Login"}
            </button>
          </form>
          <p className="auth-foot">
            {signup ? (
              <>
                Already have an account? <Link to="/login">Sign in</Link>
              </>
            ) : (
              <>
                No Account yet? <Link to="/signup">Sign up</Link>
              </>
            )}
          </p>
          <p className="demo-note">
            Demo only — no real account is created. Passwords are not saved.
          </p>
        </div>
      </main>
    </>
  );
}
