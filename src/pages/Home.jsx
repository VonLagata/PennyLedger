import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon, ThemeSwitch } from "../components/UI";
import { useAuth } from "../state/AuthContext";
import logoBlack from "../assets/logo-black.svg";
import logoWhite from "../assets/logo-white.svg";

export default function Home() {
  const { account } = useAuth();
  const logoDestination = account ? account.role === "admin" ? "/admin" : "/dashboard" : "/";
  const root = useRef(null);
  const location = useLocation();
  useEffect(() => {
    const section = location.hash.slice(1);
    if (["top", "features", "security"].includes(section)) {
      root.current?.querySelector(`#${section}`)?.scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [location.hash]);
  useEffect(() => {
    const targets = root.current.querySelectorAll(
      ".section-head, .feature-grid, .cta-band",
    );
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((target) => {
      target.classList.add(
        target.classList.contains("feature-grid") ? "reveal-group" : "reveal",
      );
      observer.observe(target);
    });
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root}>
      <header className="site-header">
        <Link className="logo" to={logoDestination}>
          <img
            className="logo-img logo-light"
            src={logoBlack}
            alt="PennyLedger"
          />
          <img
            className="logo-img logo-dark"
            src={logoWhite}
            alt="PennyLedger"
          />
        </Link>
        <nav>
          <div className="nav-links">
            <Link to="/#top">Home</Link>
            <Link to="/#features">Features</Link>
            <Link to="/#security">Security</Link>
          </div>
        </nav>
        <div className="auth-links">
          <ThemeSwitch></ThemeSwitch>
          <Link className="btn btn-outline btn-sm" to="/login">
            Log In
          </Link>
          <Link className="btn btn-primary btn-sm" to="/signup">
            Sign Up
          </Link>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true"></div>
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="hero-eyebrow">
              Personal budget &amp; expense tracker
            </span>
            <h1>Take control of your money, one penny at a time.</h1>
            <p>
              Your cash, GCash, bank balances, and savings plans deserve one clear
              picture. Track income and expenses, build category budgets, and
              put money toward the goals that matter to you—all in one workspace.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/signup">
                Start Your Money Plan
              </Link>
              <Link className="btn btn-ghost-light" to="/login">
                Log In
              </Link>
            </div>
          </div>
        </div>
        <div className="stat-callout">
          <p className="label">A clearer picture, every day.</p>
          <div className="ring-row">
            <div className="ring"></div>
            <div className="ring-text">
              <strong>One view</strong>
              <small>All your wallet balances, budgets, and goals.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-head">
          <span className="eyebrow">Why PennyLedger</span>
          <h2>Everything you need to stay ahead of your money</h2>
          <p>
            Whether you're saving for a major milestone or simply trimming
            everyday costs, PennyLedger gives you the clarity needed to reach
            your money goals.
          </p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div
              className="fc-icon"
              style={{ background: "var(--blue-50)", color: "var(--blue)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="18" x2="14" y2="18"></line>
              </svg>
            </div>
            <h3>Track every transaction</h3>
            <p>
              Record income and expenses with your chosen category. Search and
              filter your history by type, category, and month.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="fc-icon"
              style={{
                background: "var(--success-50)",
                color: "var(--success)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="6" width="20" height="14" rx="2"></rect>
                <path d="M2 10h20"></path>
                <circle cx="17" cy="15" r="1"></circle>
              </svg>
            </div>
            <h3>Set smart budgets</h3>
            <p>
              Put a limit on every category and get a clear signal the moment
              you're at risk of going over.
            </p>
          </div>
          <div className="feature-card">
            <div
              className="fc-icon"
              style={{ background: "#FDEEE3", color: "#C2703A" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 21V4"></path>
                <path d="M5 4h13l-3 4 3 4H5"></path>
              </svg>
            </div>
            <h3>Reach your goals faster</h3>
            <p>
              From an emergency fund to a dream vacation, watch every peso saved
              move you closer to the finish line.
            </p>
          </div>
        </div>
        <div className="feature-grid landing-extra-features">
          <article className="feature-card"><div className="fc-icon"><Icon name="wallet" /></div><h3>Bring your wallets together</h3><p>Keep cash, digital wallets, and bank balances in one place. Your Total Balance combines the current balance of every wallet you record.</p></article>
          <article className="feature-card"><div className="fc-icon"><Icon name="budget" /></div><h3>Know what you can spend</h3><p>Compare this month’s income, expenses, and budget limits. See what remains in your budget before planning your next purchase.</p></article>
          <article className="feature-card"><div className="fc-icon"><Icon name="plus" /></div><h3>Make saving a habit</h3><p>Create a goal with a target and date, then use Add Money to record each contribution. Watch your progress grow without rewriting the goal.</p></article>
        </div>
      </section>

      <section className="section landing-how">
        <div className="section-head"><span className="eyebrow">A routine you can keep</span><h2>From scattered numbers to a plan</h2><p>Built for everyday expenses, student budgets, and the milestones you’re saving toward.</p></div>
        <div className="feature-grid">
          <article className="feature-card"><span className="eyebrow">01 · Set up</span><h3>Start with your balances</h3><p>Add your wallets and their current balances. Choose the currency and date format that feel familiar.</p></article>
          <article className="feature-card"><span className="eyebrow">02 · Record</span><h3>Give every transaction a place</h3><p>Log your allowance, salary, purchases, and bills. Set category spending limits with a budget process.</p></article>
          <article className="feature-card"><span className="eyebrow">03 · Review</span><h3>Turn progress into your next step</h3><p>Review your dashboard, explore spending categories, and add contributions to your savings goals.</p></article>
        </div>
        <p className="landing-note">You record and manage your balances. PennyLedger does not connect to your bank or move money between financial accounts.</p>
      </section>

      <section className="section" id="security" style={{ paddingTop: "0" }}>
        <div className="section-head">
          <span className="eyebrow">Built on trust</span>
          <h2>Manage your money securely, with trust</h2>
          <p>
            Your personal ledger belongs to your account. PennyLedger uses
            password hashing, email verification, authenticated sessions, and
            account ownership checks to protect access to your records.
          </p>
        </div>
        <div className="feature-grid">
          <article className="feature-card"><h3>Verified account access</h3><p>Verify your email before signing in. Passwords are stored as hashes, and password changes sign you out of existing sessions.</p></article>
          <article className="feature-card"><h3>Your own financial workspace</h3><p>Personal records are checked against the signed-in account. Administrator tools use a separate role for account management.</p></article>
          <article className="feature-card"><h3>Control your records</h3><p>Export your ledger data and archive transactions you want to keep out of your main history. Restore archived records when you need them.</p></article>
        </div>
      </section>

      <div className="cta-band">
        <div>
          <h2>Ready to take control of your money?</h2>
          <p>Build a budget, organize your wallets, and take the next step toward your savings goals.</p>
        </div>
        <Link className="btn btn-primary" to="/signup">
          Get Started — It's Free
        </Link>
      </div>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="logo" to={logoDestination}>
              <img
                className="logo-img logo-light"
                src={logoBlack}
                alt="PennyLedger"
              />
              <img
                className="logo-img logo-dark"
                src={logoWhite}
                alt="PennyLedger"
              />
            </Link>
            <p>
              The simple way to track spending, set budgets, and reach your
              money goals — built for everyday life.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Email us">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 6-10 7L2 6"></path>
                </svg>
              </a>
              <a href="#" aria-label="Visit our site">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"></path>
                </svg>
              </a>
              <a href="#" aria-label="Chat with us">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"></path>
                </svg>
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/#features">Features</Link>
            <Link to="/#security">Security</Link>
            <Link to="/signup">Get Started</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 PennyLedger. All rights reserved.</span>
          <div className="footer-legal-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
