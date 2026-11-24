
import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw } from "lucide-react";
import { api } from "../services/api";

interface Email {
  id: string;
  recipient: string;
  subject: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
}

export default function SentEmails() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchEmails = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/emails", {
        params: { status: "SENT" }
      });

      setEmails(response.data.emails ?? []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to load sent emails."
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
          <h1>Sent Emails</h1>
          <p>View your successfully processed email deliveries.</p>
        </div>

        <button onClick={fetchEmails} className="refresh-button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <section className="email-section">
        <div className="section-heading">
          <h2>
            <CheckCircle size={19} />
            Delivery history
          </h2>
          <span>{emails.length} emails</span>
        </div>

        {loading ? (
          <p className="empty-state">Loading sent emails...</p>
        ) : error ? (
          <div className="error-state">
            {error}
            <button onClick={fetchEmails}>Try again</button>
          </div>
        ) : emails.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={32} />
            <h3>No sent emails yet</h3>
            <p>Successfully sent emails will appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="email-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Subject</th>
                  <th>Sent time</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {emails.map((email) => (
                  <tr key={email.id}>
                    <td>{email.recipient}</td>
                    <td>{email.subject}</td>
                    <td>
                      {email.sentAt
                        ? formatDate(email.sentAt)
                        : "Not available"}
                    </td>
                    <td>
                      <span className="status-badge sent">
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
