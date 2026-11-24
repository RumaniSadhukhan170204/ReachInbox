
import { useEffect, useState } from "react";
import { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import {
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  X
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
}

interface EmailSearchResult {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string | null;
}

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Elasticsearch search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmailSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    api.get("/campaigns")
      .then((response) =>
        setCampaigns(response.data.campaigns ?? response.data)
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const searchQuery = query.trim();

    if (!searchQuery) {
      setResults([]);
      setSearched(false);
      setSearchError("Enter something to search.");
      return;
    }

    try {
      setSearching(true);
      setSearchError("");
      setSearched(true);

      const response = await api.get("/search/emails", {
        params: { q: searchQuery }
      });

      setResults(response.data.results ?? []);
    } catch (error: any) {
      console.error("Email search failed:", error);
      setResults([]);
      setSearchError(
        error.response?.data?.message || "Unable to search emails."
      );
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setSearchError("");
  };

  const total = campaigns.reduce(
    (sum, item) => sum + item.totalRecipients, 0
  );

  const sent = campaigns.reduce(
    (sum, item) => sum + item.sentCount, 0
  );

  const failed = campaigns.reduce(
    (sum, item) => sum + item.failedCount, 0
  );

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Dashboard</h1>
            <p className="muted">Your email campaigns at a glance.</p>
          </div>

          <a href="/compose" className="primary-link">
            + New campaign
          </a>
        </header>

        {/* Elasticsearch Email Search */}
        <section className="table-panel">
          <div className="panel-heading">
            <h2>Search emails</h2>
          </div>

          <form
            onSubmit={handleSearch}
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px"
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by recipient, subject or email content..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc"
              }}
            />

            <button
              type="submit"
              disabled={searching}
              className="primary-link"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                border: "none",
                cursor: "pointer"
              }}
            >
              <Search size={17} />
              {searching ? "Searching..." : "Search"}
            </button>

            {searched && (
              <button
                type="button"
                onClick={clearSearch}
                title="Clear search"
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  borderRadius: "8px",
                  border: "1px solid #ccc"
                }}
              >
                <X size={17} />
              </button>
            )}
          </form>

          {searchError && (
            <p className="empty-state">{searchError}</p>
          )}

          {searching && <p>Searching emails...</p>}

          {searched && !searching && !searchError && (
            <div style={{ marginTop: "20px" }}>
              <div className="panel-heading">
                <h2>Search results</h2>
                <span>{results.length} results</span>
              </div>

              {results.length === 0 ? (
                <p className="empty-state">
                  No matching emails found.
                </p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Recipient</th>
                        <th>Subject</th>
                        <th>Content</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {results.map((email) => (
                        <tr key={email.id}>
                          <td>{email.recipient}</td>
                          <td>{email.subject}</td>
                          <td>
                            {email.body?.length > 100
                              ? `${email.body.slice(0, 100)}...`
                              : email.body}
                          </td>
                          <td>
                            <span className="status-pill">
                              {email.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Dashboard Statistics */}
        <section className="stats-grid">
          <article className="stat-card">
            <span><Send /></span>
            <p>Total recipients</p>
            <h2>{total}</h2>
          </article>

          <article className="stat-card">
            <span><CheckCircle /></span>
            <p>Sent</p>
            <h2>{sent}</h2>
          </article>

          <article className="stat-card">
            <span><Clock /></span>
            <p>Campaigns</p>
            <h2>{campaigns.length}</h2>
          </article>

          <article className="stat-card">
            <span><AlertCircle /></span>
            <p>Failed</p>
            <h2>{failed}</h2>
          </article>
        </section>

        {/* Recent Campaigns */}
        <section className="table-panel">
          <div className="panel-heading">
            <h2>Recent campaigns</h2>
            <span>{campaigns.length} campaigns</span>
          </div>

          {loading ? (
            <p>Loading campaigns...</p>
          ) : campaigns.length === 0 ? (
            <p className="empty-state">
              No campaigns yet. Create your first campaign.
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Subject</th>
                    <th>Recipients</th>
                    <th>Sent</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td>{campaign.name}</td>
                      <td>{campaign.subject}</td>
                      <td>{campaign.totalRecipients}</td>
                      <td>{campaign.sentCount}</td>
                      <td>
                        <span className="status-pill">
                          {campaign.status}
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
    </div>
  );
}
