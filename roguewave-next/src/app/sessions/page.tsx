"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

type Swimmer = {
  id: number;
  name: string;
  level: string;
};

type Session = {
  id: number;
  name: string;
  role: "Head Coach" | "Assistant Coach";
  type: "Recurring" | "Once";
  swimmers: Swimmer[];
  schedules: Schedule[];
  date?: string;
  startTime?: string;
  endTime?: string;
  has_attendance?: boolean;
  is_archived?: boolean;
};

type ApiSchedule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ApiSession = {
  id: number;
  name: string;
  role: "Head Coach" | "Assistant Coach";
  session_type: string;
  default_location: string | null;

  session_date: string | null;
  start_time: string | null;
  end_time: string | null;

  session_schedules: ApiSchedule[];

  session_swimmers: {
    swimmers: Swimmer | null;
  }[];

  has_attendance?: boolean;
  is_archived?: boolean;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const endpoint =
          view === "archived" ? "/api/sessions?archived=true" : "/api/sessions";
        const response = await fetch(endpoint, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load sessions.");
        }

        const formattedSessions: Session[] = (data as ApiSession[]).map(
          (session) => ({
            id: session.id,

            name: session.name,

            role: session.role,

            type:
              session.session_type.toLowerCase() === "once"
                ? "Once"
                : "Recurring",

            swimmers: (session.session_swimmers || [])
              .map((item) => item.swimmers)
              .filter((swimmer): swimmer is Swimmer => swimmer !== null),

            date: session.session_date
              ? formatDate(session.session_date)
              : undefined,

            startTime: session.start_time
              ? formatTime(session.start_time)
              : undefined,

            endTime: session.end_time
              ? formatTime(session.end_time)
              : undefined,

            schedules: (session.session_schedules || [])
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((schedule) => ({
                day: getDayName(schedule.day_of_week),

                startTime: formatTime(schedule.start_time),

                endTime: formatTime(schedule.end_time),
              })),

            has_attendance: session.has_attendance,
            is_archived: session.is_archived,
          }),
        );

        setSessions(formattedSessions);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load sessions.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSessions();
  }, [view]);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function deleteSession(id: number, name: string) {
    const confirmed = window.confirm(`Delete "${name}"?`);

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(`/api/sessions/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete session.");
      }

      setSessions((current) => current.filter((session) => session.id !== id));
      setFeedback({ type: "success", message: "Session deleted successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete session.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function archiveSession(id: number, name: string) {
    const confirmed = window.confirm(
      `Archive "${name}"? It will stop appearing in active schedules and future calendar occurrences. Attendance history will be kept.`,
    );

    if (!confirmed) return;

    try {
      setArchivingId(id);

      const response = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive session.");
      }

      setSessions((current) => current.filter((session) => session.id !== id));
      setFeedback({ type: "success", message: "Session archived successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to archive session.",
      });
    } finally {
      setArchivingId(null);
    }
  }

  async function restoreSession(id: number, name: string) {
    const confirmed = window.confirm(
      `Restore "${name}"? It will become active and start generating future occurrences again.`,
    );

    if (!confirmed) return;

    try {
      setRestoringId(id);

      const response = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore session.");
      }

      setSessions((current) => current.filter((session) => session.id !== id));
      setFeedback({ type: "success", message: "Session restored successfully." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to restore session.",
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <AppShell>
      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={topStyle}>
          <div>
            <h1
              style={{
                margin: 0,
              }}
            >
              Sessions
            </h1>

            <p style={subtitleStyle}>
              Manage your recurring and one-off coaching sessions.
            </p>
          </div>

          <Link href="/sessions/add">
            <button style={buttonStyle}>+ Add Session</button>
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

        {/* Loading */}

        {loading && (
          <div style={emptyStyle}>
            <p style={mutedTextStyle}>Loading sessions...</p>
          </div>
        )}

        {/* Error */}

        {!loading && error && (
          <div style={errorStyle}>
            <strong>Could not load sessions.</strong>

            <p style={mutedTextStyle}>{error}</p>
          </div>
        )}

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

        {/* Session Cards */}

        {!loading && !error && (
          <div style={sessionListStyle}>
            {sessions.map((session) => (
              <div key={session.id} style={cardStyle}>
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Header */}

                  <div style={cardHeaderStyle}>
                    <div>
                      <h2
                        style={{
                          margin: "0 0 6px 0",
                        }}
                      >
                        {session.name}
                      </h2>

                      <p style={roleStyle}>{session.role}</p>
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {session.is_archived && (
                        <span style={archivedBadgeStyle}>Archived</span>
                      )}
                      <span style={badgeStyle}>{session.type}</span>
                    </div>
                  </div>

                  {/* Recurring */}

                  {session.type === "Recurring" && (
                    <div
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      <strong>Schedule</strong>

                      <div style={scheduleListStyle}>
                        {session.schedules.map((schedule, index) => (
                          <div
                            key={`${schedule.day}-${index}`}
                            style={scheduleRowStyle}
                          >
                            <span style={dayStyle}>{schedule.day}</span>

                            <span>
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                        ))}

                        {session.schedules.length === 0 && (
                          <span style={mutedTextStyle}>No schedule added.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* One-Off */}

                  {session.type === "Once" && (
                    <div
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      <strong>Session Date</strong>

                      <div style={scheduleListStyle}>
                        <div style={scheduleRowStyle}>
                          <span style={dayStyle}>
                            {session.date || "Not set"}
                          </span>

                          <span>
                            {session.startTime || "-"} -{" "}
                            {session.endTime || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Swimmers */}

                  <div
                    style={{
                      marginTop: "18px",
                    }}
                  >
                    {session.swimmers.length > 0 ? (
                      <>
                        <span style={swimmerInfoStyle}>
                          {session.swimmers.length}{" "}
                          {session.swimmers.length === 1
                            ? "swimmer"
                            : "swimmers"}{" "}
                          assigned
                        </span>

                        <div style={swimmerNamesStyle}>
                          {session.swimmers.map((swimmer, index) => (
                            <span key={swimmer.id}>
                              {index > 0 && ", "}
                              <Link
                                href={`/swimmers/${swimmer.id}`}
                                style={swimmerLinkStyle}
                              >
                                {swimmer.name}
                              </Link>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <span style={mutedTextStyle}>No swimmers assigned</span>
                    )}
                  </div>
                </div>

                {/* Actions */}

                <div style={actionStyle}>
                  {view === "active" ? (
                    <>
                      <Link
                        href={`/sessions/edit/${session.id}`}
                        style={actionLinkStyle}
                      >
                        <button style={actionButtonStyle}>Edit</button>
                      </Link>

                      {session.has_attendance ? (
                        <div style={deleteDisabledStyle}>
                          <button
                            style={archiveButtonStyle}
                            disabled={archivingId === session.id}
                            onClick={() => archiveSession(session.id, session.name)}
                          >
                            {archivingId === session.id ? "Archiving..." : "Archive"}
                          </button>
                          <span style={deleteExplanationStyle}>
                            Attendance history exists, so this session can be archived but not deleted.
                          </span>
                        </div>
                      ) : (
                        <button
                          style={{
                            ...deleteButtonStyle,

                            opacity: deletingId === session.id ? 0.6 : 1,

                            cursor:
                              deletingId === session.id ? "not-allowed" : "pointer",
                          }}
                          disabled={deletingId === session.id}
                          onClick={() => deleteSession(session.id, session.name)}
                        >
                          {deletingId === session.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        style={restoreButtonStyle}
                        disabled={restoringId === session.id}
                        onClick={() => restoreSession(session.id, session.name)}
                      >
                        {restoringId === session.id ? "Restoring..." : "Restore"}
                      </button>

                      {!session.has_attendance && (
                        <button
                          style={{
                            ...deleteButtonStyle,

                            opacity: deletingId === session.id ? 0.6 : 1,

                            cursor:
                              deletingId === session.id ? "not-allowed" : "pointer",
                          }}
                          disabled={deletingId === session.id}
                          onClick={() => deleteSession(session.id, session.name)}
                        >
                          {deletingId === session.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Empty State */}

            {sessions.length === 0 && (
              <div style={emptyStyle}>
                <h3>{view === "archived" ? "No archived sessions" : "No sessions yet"}</h3>

                <p style={mutedTextStyle}>
                  {view === "archived"
                    ? "Archived sessions will appear here."
                    : "Add your first coaching session to get started."}
                </p>

                {view === "active" && (
                  <Link href="/sessions/add">
                    <button style={buttonStyle}>+ Add Session</button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}

/* =========================
   HELPERS
   ========================= */

function getDayName(dayOfWeek: number) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[dayOfWeek] ?? "Unknown";
}

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");

  const hour = Number(hourText);

  const period = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* =========================
   STYLES
   ========================= */

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

const sessionListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "20px",
};

const cardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: "30px",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap" as const,
  gap: "20px",
};

const roleStyle = {
  margin: 0,
  color: "var(--secondary-text)",
};

const badgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  fontSize: "13px",
  fontWeight: "bold",
  padding: "6px 10px",
  borderRadius: "20px",
};

const archivedBadgeStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--secondary-text)",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "5px 10px",
  borderRadius: "20px",
  border: "1px solid var(--border)",
};

const scheduleListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  marginTop: "10px",
};

const scheduleRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(100px, 120px) 1fr",
  gap: "15px",
  padding: "9px 12px",
  backgroundColor: "var(--soft-background)",
  color: "var(--text)",
  borderRadius: "6px",
  border: "1px solid var(--border)",
};

const dayStyle = {
  fontWeight: "bold",
};

const swimmerInfoStyle = {
  color: "var(--accent-text)",
  fontWeight: "bold",
};

const swimmerNamesStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
  marginTop: "4px",
};

const swimmerLinkStyle = {
  color: "var(--accent-text)",
  textDecoration: "none",
  fontWeight: "bold",
};

const mutedTextStyle = {
  color: "var(--secondary-text)",
};

const actionStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
  justifyContent: "center",
  minWidth: "110px",
};

const actionLinkStyle = {
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

const actionButtonStyle = {
  ...buttonStyle,
  width: "100%",
};

const deleteButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: "var(--danger)",
};

const archiveButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
};

const restoreButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
};

const deleteDisabledStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "6px",
};

const deleteExplanationStyle = {
  fontSize: "12px",
  color: "var(--secondary-text)",
  maxWidth: "200px",
};

const emptyStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "40px",
  textAlign: "center" as const,
  borderRadius: "10px",
  border: "1px solid var(--border)",
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
