
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../services/api";
import { Upload, FileText, X, Users } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Compose() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("");
  const [startAt, setStartAt] = useState("");
  const [delayMs, setDelayMs] = useState(1000);
  const [hourlyLimit, setHourlyLimit] = useState(100);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");

  const recipientList = Array.from(
    new Set(
      recipients
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_REGEX.test(email))
    )
  );

  async function handleFileUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!["csv", "txt"].includes(extension || "")) {
      setError("Please upload a CSV or TXT file.");
      event.target.value = "";
      return;
    }

    try {
      const content = await file.text();

      const extracted = content.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      ) || [];

      const existing = recipients
        .split(/[\s,;]+/)
        .map((email) => email.trim())
        .filter(Boolean);

      const combined = [...existing, ...extracted];

      const unique = Array.from(
        new Set(combined.map((email) => email.toLowerCase()))
      );

      setRecipients(unique.join("\n"));
      setFileName(file.name);

      if (extracted.length === 0) {
        setError("No email addresses were found in this file.");
      }
    } catch {
      setError("Unable to read the uploaded file.");
    }

    event.target.value = "";
  }

  async function submitCampaign(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (recipientList.length === 0) {
      setError("Please enter or upload at least one valid email address.");
      return;
    }

    if (!startAt || new Date(startAt).getTime() <= Date.now()) {
      setError("Please select a future campaign start time.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/campaigns", {
        name,
        subject,
        body,
        recipients: recipientList,
        startAt: new Date(startAt).toISOString(),
        delayMs,
        hourlyLimit
      });

      navigate("/");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Unable to create campaign"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <div className="page-header">
          <div>
            <p className="eyebrow">CAMPAIGNS</p>
            <h1>Create campaign</h1>
            <p className="muted">
              Prepare and schedule your outreach.
            </p>
          </div>
        </div>

        <form className="compose-panel" onSubmit={submitCampaign}>
          <label>Campaign name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product launch outreach"
          />

          <label>Email subject</label>
          <input
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A quick introduction"
          />

          <label>Email body</label>
          <textarea
            required
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email..."
          />

          <label>Upload recipient file (CSV or TXT)</label>

          <div className="upload-area">
            <input
              id="recipient-file"
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={handleFileUpload}
              hidden
            />

            <label
              htmlFor="recipient-file"
              className="upload-label"
            >
              <Upload size={22} />
              <span>Click to upload CSV or TXT</span>
              <small>We'll extract email addresses automatically.</small>
            </label>
          </div>

          {fileName && (
            <div className="uploaded-file">
              <FileText size={17} />
              <span>{fileName}</span>
              <button
                type="button"
                onClick={() => setFileName("")}
                aria-label="Clear uploaded filename"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <label>Recipients (comma or newline separated)</label>
          <textarea
            rows={5}
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)}
            placeholder={"alex@example.com\nsam@example.com"}
          />

          <div className="recipient-count">
            <Users size={18} />
            <span>
              {recipientList.length} valid unique recipient(s)
            </span>
          </div>

          <div className="form-grid">
            <div>
              <label>Start time</label>
              <input
                required
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>

            <div>
              <label>Delay between emails (ms)</label>
              <input
                type="number"
                min={1000}
                value={delayMs}
                onChange={(e) => setDelayMs(Number(e.target.value))}
              />
            </div>

            <div>
              <label>Hourly limit</label>
              <input
                type="number"
                min={1}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
              />
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button className="primary-button" disabled={saving}>
            {saving ? "Scheduling..." : "Schedule campaign"}
          </button>
        </form>
      </main>
    </div>
  );
}
