
import { Mail, ArrowRight } from "lucide-react";

export default function Login() {
  const login = () => {
    window.location.href =
      "http://localhost:5000/api/auth/google";
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <Mail size={28} />
        </div>

        <h1>ReachInbox</h1>
        <p className="muted">
          Your email outreach, organized and automated.
        </p>

        <button className="google-button" onClick={login}>
          Continue with Google
          <ArrowRight size={18} />
        </button>

        <p className="login-footer">
          Schedule. Send. Track.
        </p>
      </section>
    </main>
  );
}
