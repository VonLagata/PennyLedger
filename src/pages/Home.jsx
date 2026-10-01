import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ThemeSwitch } from "../components/UI";
import logoBlack from "../assets/logo-black.svg";
import logoWhite from "../assets/logo-white.svg";

export default function Home() {
  const root = useRef(null);
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
        <Link className="logo" to="/">
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
            <a href="#top">Home</a>
            <a href="#features">Features</a>
            <a href="#security">Security</a>
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
              PennyLedger is an intuitive personal budget and expense tracker
              designed to help you gain total control over your daily finances.
              By seamlessly logging transactions, categorizing spending, and
              visualizing your cash flow, it turns complex financial data into
              actionable insights.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/signup">
                Sign Up
              </Link>
              <Link className="btn btn-ghost-light" to="/login">
                Log In
              </Link>
            </div>
          </div>
        </div>
        <div className="stat-callout">
          <p className="label">Join using PennyLedger.</p>
          <div className="ring-row">
            <div className="ring"></div>
            <div className="ring-text">
              <strong>65%</strong>
              <small>of our users are Filipinos!</small>
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
              Log income and expenses in seconds and see exactly where your
              money goes, categorized automatically.
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
      </section>

      <section className="section" id="security" style={{ paddingTop: "0" }}>
        <div className="section-head">
          <span className="eyebrow">Built on trust</span>
          <h2>Manage your money securely, with trust</h2>
          <p>
            At PennyLedger, your financial privacy and peace of mind are our
            highest priorities. We protect your account using end-to-end
            encryption and bank-level security protocols, ensuring your
            financial logs, budgets, and sensitive credentials remain strictly
            confidential and shielded from unauthorized access.
          </p>
        </div>
      </section>

      <div className="cta-band">
        <div>
          <h2>Ready to take control of your money?</h2>
          <p>Create your free PennyLedger account in under a minute.</p>
        </div>
        <Link className="btn btn-primary" to="/signup">
          Get Started — It's Free
        </Link>
      </div>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="logo" to="/">
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
            <a href="#features">Features</a>
            <a href="#security">Security</a>
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
