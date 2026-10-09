"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Level = "Beginner" | "Intermediate" | "Advanced";

type Swimmer = {
  id: number;
  name: string;
  sessionsCompleted: number;
  level: Level;
  is_archived?: boolean;
};

type ApiSwimmer = {
  id: number;
  name: string;
  level: string;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  is_archived?: boolean;
  sessionsCompleted?: number;
};

export default function SwimmersPage() {
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [view, setView] = useState<"active" | "archived">("active");

  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    async function loadSwimmers() {
      try {
        const endpoint =
          view === "archived" ? "/api/swimmers?archived=true" : "/api/swimmers";
        const response = await fetch(endpoint, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load swimmers.");
        }

        const formattedSwimmers: Swimmer[] = (data as ApiSwimmer[]).map(
          (swimmer) => ({
            id: swimmer.id,

            name: swimmer.name,

            level: getLevel(swimmer.level),

            sessionsCompleted: swimmer.sessionsCompleted ?? 0,

            is_archived: swimmer.is_archived,
          }),
        );

        setSwimmers(formattedSwimmers);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load swimmers.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSwimmers();
  }, [view]);

  const filteredSwimmers = swimmers.filter((swimmer) =>
    swimmer.name.toLowerCase().includes(search.toLowerCase().trim()),
  );

  async function archiveSwimmer(id: number, name: string) {
    const confirmed = window.confirm(
      `Archive "${name}"? They will no longer appear in the active swimmers list or be assignable to sessions. Their attendance history will be kept.`,
    );

    if (!confirmed) return;

    try {
      setArchivingId(id);

      const response = await fetch(`/api/swimmers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive swimmer.");
      }

      setSwimmers((current) => current.filter((s) => s.id !== id));
      setFeedback({ type: "success", message: "Swimmer archived successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to archive swimmer.",
      });
    } finally {
      setArchivingId(null);
    }
  }

  async function restoreSwimmer(id: number, name: string) {
    const confirmed = window.confirm(
      `Restore "${name}"? They will become active and can be assigned to sessions again.`,
    );

    if (!confirmed) return;

    try {
      setRestoringId(id);

      const response = await fetch(`/api/swimmers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore swimmer.");
      }

      setSwimmers((current) => current.filter((s) => s.id !== id));
      setFeedback({ type: "success", message: "Swimmer restored successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to restore swimmer.",
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <AppShell>
      {/* Main Content */}
      <section style={mainContentStyle}>
        {/* Heading */}

        <div style={topStyle}>
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              Swimmers
            </h1>

            <p style={subtitleStyle}>
              Manage your swimmers and view their coaching records.
            </p>
          </div>

          <Link href="/swimmers/add">
            <button style={buttonStyle}>+ Add Swimmer</button>
          </Link>
        </div>

        {/* View Tabs */}
        <div style={tabContainerStyle}>
          <button
            style={{
              ...tabStyle,
              ...(view === "active" ? activeTabStyle : {}),
            }}
            onClick={() => setView("active")}
          >
            Active
          </button>
          <button
            style={{
              ...tabStyle,
              ...(view === "archived" ? activeTabStyle : {}),
            }}
            onClick={() => setView("archived")}
          >
            Archived
          </button>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            style={
              feedback.type === "success"
                ? feedbackSuccessStyle
                : feedbackErrorStyle
            }
          >
            {feedback.message}
          </div>
        )}

        {/* Search */}

        <div style={toolbarStyle}>
          <input
            type="search"
            placeholder="Search swimmers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchStyle}
          />

          <span style={countStyle}>
            {filteredSwimmers.length} swimmer
            {filteredSwimmers.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Loading */}

        {loading && (
          <div style={emptyStyle}>
            <p style={subtitleStyle}>Loading swimmers...</p>
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div style={errorStyle}>
            <h3
              style={{
                marginTop: 0,
              }}
            >
              Could not load swimmers
            </h3>

            <p style={subtitleStyle}>{error}</p>
          </div>
        )}

        {/* Swimmers */}

        {!loading &&
          !error &&
          (filteredSwimmers.length > 0 ? (
            <div style={gridStyle}>
              {filteredSwimmers.map((swimmer) => (
                <div key={swimmer.id} style={cardStyle}>
                  <div>
                    <div style={cardHeaderStyle}>
                      <h2
                        style={{
                          margin: 0,
                        }}
                      >
                        {swimmer.name}
                      </h2>
                      {swimmer.is_archived && (
                        <span style={archivedBadgeStyle}>Archived</span>
                      )}
                    </div>

                    <span style={levelBadgeStyle}>{swimmer.level}</span>
                  </div>

                  <div style={informationStyle}>
                    <span style={labelStyle}>Sessions Completed</span>

                    <strong style={sessionNumberStyle}>
                      {swimmer.sessionsCompleted}
                    </strong>
                  </div>

                  <div style={cardActionsStyle}>
                    <Link
                      href={`/swimmers/${swimmer.id}`}
                      style={profileLinkStyle}
                    >
                      <button style={profileButtonStyle}>View Profile</button>
                    </Link>

                    {view === "active" ? (
                      <button
                        style={{
                          ...archiveButtonStyle,
                          opacity: archivingId === swimmer.id ? 0.6 : 1,
                          cursor: archivingId === swimmer.id ? "not-allowed" : "pointer",
                        }}
                        disabled={archivingId === swimmer.id}
                        onClick={() => archiveSwimmer(swimmer.id, swimmer.name)}
                      >
                        {archivingId === swimmer.id ? "Archiving..." : "Archive"}
                      </button>
                    ) : (
                      <button
                        style={{
                          ...restoreButtonStyle,
                          opacity: restoringId === swimmer.id ? 0.6 : 1,
                          cursor: restoringId === swimmer.id ? "not-allowed" : "pointer",
                        }}
                        disabled={restoringId === swimmer.id}
                        onClick={() => restoreSwimmer(swimmer.id, swimmer.name)}
                      >
                        {restoringId === swimmer.id ? "Restoring..." : "Restore"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyStyle}>
              <h3
                style={{
                  marginTop: 0,
                }}
              >
                {search.trim()
                  ? "No swimmers found"
                  : view === "archived"
                    ? "No archived swimmers"
                    : "No swimmers yet"}
              </h3>

              <p style={subtitleStyle}>
                {search.trim()
                  ? "Try another name."
                  : view === "archived"
                    ? "Archived swimmers will appear here."
                    : "Add your first swimmer to get started."}
              </p>
            </div>
          ))}
      </section>
    </AppShell>
  );
}

function getLevel(level: string): Level {
  if (level === "Intermediate" || level === "Advanced") {
    return level;
  }

  return "Beginner";
}

const mainContentStyle = {
  padding: "40px",
  minWidth: 0,
};

const topStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "20px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const tabContainerStyle = {
  display: "flex",
  gap: "8px",
  marginBottom: "25px",
};

const tabStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "8px 20px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const activeTabStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "1px solid var(--button)",
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "25px",
};

const searchStyle = {
  width: "100%",
  maxWidth: "400px",
  padding: "11px 12px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
};

const countStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const cardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "24px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column" as const,
  gap: "22px",
};

const cardHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const archivedBadgeStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--secondary-text)",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 8px",
  borderRadius: "20px",
  border: "1px solid var(--border)",
};

const levelBadgeStyle = {
  display: "inline-block",
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  fontSize: "13px",
  fontWeight: "bold",
  padding: "5px 9px",
  borderRadius: "20px",
};

const informationStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
};

const labelStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const sessionNumberStyle = {
  fontSize: "26px",
};

const cardActionsStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const profileLinkStyle = {
  width: "100%",
};

const buttonStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
};

const profileButtonStyle = {
  ...buttonStyle,
  width: "100%",
};

const archiveButtonStyle = {
  ...buttonStyle,
  width: "100%",
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

const restoreButtonStyle = {
  ...buttonStyle,
  width: "100%",
};

const emptyStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "40px",
  textAlign: "center" as const,
};

const errorStyle = {
  ...emptyStyle,
  border: "1px solid var(--danger)",
};

const feedbackSuccessStyle = {
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
  padding: "14px 18px",
  borderRadius: "8px",
  marginBottom: "20px",
  fontWeight: "bold",
};

const feedbackErrorStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  padding: "14px 18px",
  borderRadius: "8px",
  marginBottom: "20px",
  fontWeight: "bold",
};
