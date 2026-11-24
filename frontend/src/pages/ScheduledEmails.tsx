
import { useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { api } from "../services/api";

interface Email {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
}

export default function ScheduledEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/emails", {
        params: { status: "SCHEDULED" }
      });

      setEmails(response.data.emails ?? []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to load scheduled emails."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const formatDate = (date: string) =>
    new Date(date).toLocaleString();

  return (
    <main className="page-container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">EMAIL MANAGEMENT</span>
          <h1>Scheduled Emails</h1>
          <p>Manage your upcoming email deliveries.</p>
        </div>

        <button onClick={fetchEmails} className="refresh-button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="email-section">
        <div className="section-heading">
          <h2>
            <Clock size={19} />
            Upcoming emails
          </h2>
          <span>{emails.length} emails</span>
        </div>

        {loading ? (
          <p className="empty-state">Loading scheduled emails...</p>
        ) : error ? (
          <div className="error-state">
            {error}
            <button onClick={fetchEmails}>Try again</button>
          </div>
        ) : emails.length === 0 ? (
          <div className="empty-state">
            <Clock size={32} />
            <h3>No scheduled emails</h3>
            <p>Your scheduled emails will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="email-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Scheduled time</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {emails.map((email) => (
                  <tr key={email.id}>
                    <td>{email.recipient}</td>
                    <td>{email.subject}</td>
                    <td>{formatDate(email.scheduledAt)}</td>
                    <td>
                      <span className="status-badge scheduled">
                        {email.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
