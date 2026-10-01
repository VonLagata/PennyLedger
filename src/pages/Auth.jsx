import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Field, Logo, PasswordField, ThemeSwitch } from "../components/UI";

export default function Auth({ signup = false, admin = false }) {
  const { account, login, register, verifyOtp, resendOtp, registrationOpen } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [notice, setNotice] = useState("");
  const [otp, setOtp] = useState("");
  if (account)
    return (
      <Navigate
        replace
        to={account.role === "admin" ? "/admin" : "/dashboard"}
      />
    );
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");
    // Match PHP's signup rule here so the user sees the reason immediately.
    if (signup && String(password).length < 8)
      return setError("Password must be at least 8 characters.");
    if (signup && password !== form.get("verify-password"))
      return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    try {
      if (signup) {
        // Registration creates an unverified account. The user must enter the
        // emailed code before login is allowed by PHP.
        const result = await register({ name: form.get("name"), email: form.get("email"), password });
        setVerificationEmail(form.get("email"));
        // Registration may succeed even when SMTP is temporarily unavailable.
        // Keep the account's email here so the user can request another code.
        if (result.emailSent) setNotice("Verification code sent. Check your email.");
        else setError("Account created, but email could not be sent. Check mail settings, then use Resend code.");
        return;
      }
      await login(form.get("email"), password, admin ? "admin" : "user");
      navigate(admin ? "/admin" : "/dashboard", { replace: true });
    } catch (error) {
      // PHP supplies field-specific validation errors; show the password
      // message instead of the generic "Validation failed" response.
      setError(error.fields?.password || error.message);
    } finally {
      setBusy(false);
    }
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
            {admin
              ? "Administration"
              : signup
                ? "Manage your Money Securely with trust."
                : "Welcome Back!"}
          </h1>
          <p>
            {admin
              ? "Manage user accounts, review account activity, and control registration from your admin workspace."
              : "Track your transactions, budgets, and savings goals in your own account."}
          </p>
        </div>
        <div className="auth-card">
          <h2>
            {admin ? "Admin Sign In" : signup ? "Create Account" : "Login"}
          </h2>
          <p>
            {admin
              ? "Administrator accounts only"
              : "Your personal finance workspace"}
          </p>
          {notice && <p role="status" className="report-caption">{notice}</p>}
          {verificationEmail ? (
            <form key="verification" onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                await verifyOtp(verificationEmail, otp);
                navigate("/login", { replace: true });
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}>
              <p>Enter the six-digit code sent to {verificationEmail}.</p>
              <Field label="Verification code" name="otp" inputMode="numeric"
                value={otp} onChange={(event) => setOtp(event.target.value)} required />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-dark" disabled={busy}>Verify email</button>
              <button type="button" className="btn btn-outline" disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  setNotice("");
                  try {
                    await resendOtp(verificationEmail);
                    setNotice("New verification code sent. Check your email.");
                  } catch (failure) {
                    setError(failure.message);
                  } finally {
                    setBusy(false);
                  }
                }}>Resend code</button>
            </form>
          ) : showResend ? (
            <form key="resend" onSubmit={async (event) => {
              event.preventDefault();
              const email = new FormData(event.currentTarget).get("email");
              setBusy(true);
              setError("");
              setNotice("");
              try {
                await resendOtp(email);
                setVerificationEmail(email);
                setNotice("New verification code sent. Check your email.");
              } catch (failure) {
                setError(failure.fields?.email || failure.message);
              } finally {
                setBusy(false);
              }
            }}>
              <p>Enter the email for your unverified account.</p>
              <Field label="Email" name="email" type="email" autoComplete="email" required />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-dark" disabled={busy}>Send new code</button>
              <button type="button" className="btn btn-outline" onClick={() => {
                setShowResend(false);
                setError("");
              }}>Back</button>
            </form>
          ) : signup && !registrationOpen ? (
            <p role="alert">
              Registration is currently closed. Please contact an administrator.
            </p>
          ) : (
            <form key="account" onSubmit={submit}>
              {signup && (
                <Field
                  label="Name"
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              )}
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
                <>
                  <PasswordField
                    label="Verify Password"
                    name="verify-password"
                    autoComplete="new-password"
                    required
                  />
                  <label className="check-row">
                    <input type="checkbox" required />
                    <span>I agree to create an account.</span>
                  </label>
                </>
              )}
              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-dark" disabled={busy}>
                {busy ? "Please wait…" : signup ? "Sign Up" : "Login"}
              </button>
            </form>
          )}
          <p className="auth-foot">
            {admin ? (
              <Link to="/login">User sign in</Link>
            ) : (
              <>
                <Link to={signup ? "/login" : "/signup"}>
                  {signup ? "Already registered? Sign in" : "Create an account"}
                </Link>{" "}
                · <Link to="/admin/login">Admin sign in</Link>
              </>
            )}
          </p>
          {!admin && !verificationEmail && !showResend && (
            <p className="auth-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => {
                setShowResend(true);
                setError("");
              }}>Resend verification code</button>
            </p>
          )}
          <p className="demo-note">Accounts are stored on the PennyLedger server.</p>
        </div>
      </main>
    </>
  );
}
