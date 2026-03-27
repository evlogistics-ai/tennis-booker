import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuthForm() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">🎾 Tennis Booker</h1>
        <h2>{isSignup ? "Create Account" : "Sign In"}</h2>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder={isSignup ? "At least 6 characters" : "Your password"}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-btn" disabled={submitting}>
            {submitting ? "..." : isSignup ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <p className="auth-switch">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            className="auth-switch-btn"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
