
import { useEffect, useState } from "react";
import { api } from "../services/api";
import Sidebar from "../components/Sidebar";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
}

export default function Settings() {
  const [connected, setConnected] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const statusResponse = await api.get("/slack/status");
      const status = statusResponse.data;

      setConnected(status.connected);
      setTeamName(status.teamName ?? "");
      setChannelId(status.channelId ?? "");

      if (status.connected) {
        const channelResponse = await api.get("/slack/channels");
        setChannels(channelResponse.data.channels ?? []);
      } else {
        setChannels([]);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Unable to load Slack settings."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackResult = params.get("slack");

    if (slackResult === "connected") {
      setMessage("Slack workspace connected successfully.");
      window.history.replaceState({}, "", "/settings");
    } else if (slackResult === "error") {
      setError("Slack connection failed. Please try again.");
      window.history.replaceState({}, "", "/settings");
    }

    void loadSettings();
  }, []);

  async function connectSlack() {
    try {
      setConnecting(true);
      setError("");

      const response = await api.post("/slack/authorize");

      window.location.assign(response.data.authorizationUrl);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Unable to start Slack authorization."
      );
      setConnecting(false);
    }
  }

  async function saveChannel() {
    if (!channelId) {
      setError("Please select a Slack channel.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.put("/slack/channel", { channelId });

      setMessage("Slack notification channel saved successfully.");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        "Unable to save Slack channel."
      );
    } finally {
      setSaving(false);
    }
  }

  const memberChannels = channels.filter(
    (channel) => channel.is_member
  );

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">PREFERENCES</p>
            <h1>Settings</h1>
            <p className="muted">
              Manage your workspace integrations.
            </p>
          </div>
        </header>

        <section className="table-panel">
          <div className="panel-heading">
            <h2>Slack integration</h2>
            <MessageSquare size={24} />
          </div>

          {loading ? (
            <p>Loading integration settings...</p>
          ) : (
            <>
              <div style={{ marginTop: 20 }}>
                {connected ? (
                  <div>
                    <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle color="green" size={19} />
                      Slack connected
                    </p>

                    <p className="muted">
                      Workspace: <strong>{teamName || "Connected workspace"}</strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="muted">
                      Connect your Slack workspace to receive campaign
                      completion and failure notifications.
                    </p>

                    <button
                      className="primary-button"
                      onClick={connectSlack}
                      disabled={connecting}
                    >
                      <MessageSquare size={18} />
                      {connecting ? "Connecting..." : "Connect Slack"}
                    </button>
                  </div>
                )}
              </div>

              {connected && (
                <div style={{ marginTop: 28 }}>
                  <label htmlFor="slack-channel">
                    Notification channel
                  </label>

                  <select
                    id="slack-channel"
                    value={channelId}
                    onChange={(event) => setChannelId(event.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 12,
                      marginTop: 10,
                      borderRadius: 8
                    }}
                  >
                    <option value="">Select a Slack channel</option>

                    {memberChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        #{channel.name}
                        {channel.is_private ? " (Private)" : ""}
                      </option>
                    ))}
                  </select>

                  {memberChannels.length === 0 && (
                    <p className="muted">
                      No accessible channels found. Invite the ReachInbox
                      Slack app into a channel, then refresh.
                    </p>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button
                      className="primary-button"
                      onClick={saveChannel}
                      disabled={saving || !channelId}
                    >
                      {saving ? "Saving..." : "Save channel"}
                    </button>

                    <button
                      type="button"
                      onClick={loadSettings}
                      disabled={loading}
                      className="primary-button"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {message && (
            <p style={{ color: "green", marginTop: 18 }}>
              <CheckCircle size={16} /> {message}
            </p>
          )}

          {error && (
            <p className="error-message" style={{ marginTop: 18 }}>
              <AlertCircle size={16} /> {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
