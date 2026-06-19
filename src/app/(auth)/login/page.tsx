'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/proxy/me', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!response.ok) return;

        const data = await response.json();
        if (data?.success) {
          router.replace('/dashboard');
        }
      } catch {
        // stay on login page
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/proxy/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usr: email, pwd: password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && (data?.message === 'Logged In' || data?.success === true)) {
        router.replace('/dashboard');
        return;
      }

      setError(data?.message || data?.exception || 'Login failed. Check your credentials and try again.');
    } catch {
      setError('Unable to reach the server. Make sure Frappe is running and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html, body) {
          margin: 0;
          padding: 0;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background:
            radial-gradient(circle at top left, rgba(79, 70, 229, 0.14), transparent 28%),
            radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.12), transparent 30%),
            linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          color: #0f172a;
        }

        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
        }

        .brandPanel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92)),
            linear-gradient(135deg, #0f172a, #1e293b);
          color: #fff;
          position: relative;
          overflow: hidden;
        }

        .brandPanel::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.28), transparent 30%),
            radial-gradient(circle at 80% 70%, rgba(56, 189, 248, 0.18), transparent 26%);
          pointer-events: none;
        }

        .brandContent,
        .brandFooter {
          position: relative;
          z-index: 1;
        }

        .logoRow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.96);
        }

        .logoMark {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #6366f1, #0ea5e9);
          box-shadow: 0 10px 30px rgba(14, 165, 233, 0.25);
          font-size: 18px;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.84);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .heroTitle {
          margin: 0 0 16px;
          font-size: clamp(36px, 4vw, 56px);
          line-height: 1.05;
          letter-spacing: -0.04em;
          font-weight: 800;
          max-width: 10ch;
        }

        .heroText {
          margin: 0;
          max-width: 52ch;
          font-size: 16px;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.74);
        }

        .featureList {
          margin-top: 40px;
          display: grid;
          gap: 14px;
          max-width: 560px;
        }

        .featureItem {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .featureIcon {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          color: #c7d2fe;
        }

        .featureTitle {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 700;
        }

        .featureDesc {
          margin: 0;
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.68);
        }

        .brandFooter {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: rgba(255, 255, 255, 0.64);
          font-size: 13px;
        }

        .loginPanel {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
        }

        .loginCard {
          width: 100%;
          max-width: 460px;
          padding: 36px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.7);
          box-shadow:
            0 20px 50px rgba(15, 23, 42, 0.08),
            0 8px 24px rgba(15, 23, 42, 0.05);
          backdrop-filter: blur(18px);
        }

        .loginHeader {
          margin-bottom: 28px;
        }

        .loginTitle {
          margin: 0 0 8px;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: -0.03em;
          font-weight: 800;
          color: #0f172a;
        }

        .loginSubtitle {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
        }

        .form {
          display: grid;
          gap: 18px;
        }

        .field {
          display: grid;
          gap: 8px;
        }

        .label {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
        }

        .inputWrap {
          position: relative;
        }

        .input {
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: 1px solid #dbe2ea;
          background: rgba(255, 255, 255, 0.96);
          padding: 0 16px;
          font-size: 15px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .input::placeholder {
          color: #94a3b8;
        }

        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
          background: #fff;
        }

        .passwordInput {
          padding-right: 52px;
        }

        .toggleBtn {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .toggleBtn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: -4px;
        }

        .helperText {
          font-size: 13px;
          color: #64748b;
        }

        .linkBtn {
          font-size: 13px;
          color: #4f46e5;
          text-decoration: none;
          font-weight: 600;
        }

        .linkBtn:hover {
          text-decoration: underline;
        }

        .errorBox {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          padding: 14px 16px;
          border-radius: 14px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #991b1b;
          font-size: 14px;
          line-height: 1.5;
        }

        .submitBtn {
          height: 52px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #4f46e5, #2563eb);
          color: white;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          box-shadow: 0 14px 30px rgba(79, 70, 229, 0.26);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submitBtn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 18px 36px rgba(79, 70, 229, 0.3);
        }

        .submitBtn:disabled {
          cursor: not-allowed;
          opacity: 0.7;
          transform: none;
          box-shadow: none;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        .footerNote {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid #e2e8f0;
          display: grid;
          gap: 6px;
        }

        .footerTitle {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          font-weight: 700;
        }

        .footerText {
          font-size: 13px;
          color: #475569;
          line-height: 1.6;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 980px) {
          .page {
            grid-template-columns: 1fr;
          }

          .brandPanel {
            display: none;
          }

          .loginPanel {
            min-height: 100vh;
            padding: 20px;
          }

          .loginCard {
            padding: 28px 22px;
            border-radius: 22px;
          }
        }

        @media (max-width: 480px) {
          .loginTitle {
            font-size: 26px;
          }

          .row {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <main className="page">
        <section className="brandPanel" aria-hidden="true">
          <div className="brandContent">
            <div className="logoRow">
              <div className="logoMark">◫</div>
              <span>POS System</span>
            </div>

            <div style={{ marginTop: 72 }}>
              <div className="eyebrow">Retail operations, faster</div>
              <h1 className="heroTitle">Run your counter with less friction.</h1>
              <p className="heroText">
                Track stock, serve customers, and monitor daily sales from one clean workspace built for fast-moving retail teams.
              </p>

              <div className="featureList">
                <div className="featureItem">
                  <div className="featureIcon">◩</div>
                  <div>
                    <p className="featureTitle">Inventory control</p>
                    <p className="featureDesc">Keep products, pricing, and availability aligned in real time.</p>
                  </div>
                </div>

                <div className="featureItem">
                  <div className="featureIcon">◎</div>
                  <div>
                    <p className="featureTitle">Customer checkout</p>
                    <p className="featureDesc">Move faster at the counter with a simpler and more focused workflow.</p>
                  </div>
                </div>

                <div className="featureItem">
                  <div className="featureIcon">▣</div>
                  <div>
                    <p className="featureTitle">Daily visibility</p>
                    <p className="featureDesc">Review sales, orders, and business activity from one dashboard.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="brandFooter">
            <span>Secure session</span>
            <span>Role-based access</span>
            <span>Frappe-powered workflow</span>
          </div>
        </section>

        <section className="loginPanel">
          <div className="loginCard">
            <div className="loginHeader">
              <h1 className="loginTitle">Sign in</h1>
              <p className="loginSubtitle">
                Use your Frappe account to access the POS dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="form" noValidate>
              <div className="field">
                <label htmlFor="email" className="label">
                  Email or username
                </label>
                <div className="inputWrap">
                  <input
                    id="email"
                    name="username"
                    type="text"
                    autoComplete="username"
                    inputMode="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email or username"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <div className="inputWrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="input passwordInput"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="toggleBtn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '◉' : '◌'}
                  </button>
                </div>
              </div>

              <div className="row">
                <span className="helperText">Use your ERPNext / Frappe credentials.</span>
                <a href="#" className="linkBtn">
                  Need help?
                </a>
              </div>

              {error && (
                <div className="errorBox" role="alert" aria-live="polite">
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="submitBtn" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Signing in...
                  </>
                ) : (
                  'Sign in to dashboard'
                )}
              </button>
            </form>

            <div className="footerNote">
              <div className="footerTitle">Access</div>
              <div className="footerText">
                Recommended account: <strong>Administrator</strong> or any user with POS access.
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}