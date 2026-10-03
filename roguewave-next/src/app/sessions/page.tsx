"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const response = await fetch("/api/sessions", {
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
  }, []);

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
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete session.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main style={pageStyle}>
      {/* Sidebar */}

      <aside style={sidebarStyle}>
        <h2 style={{ margin: 0 }}>ROGUEWAVE</h2>

        <p style={sidebarSubtitleStyle}>Coaching Management</p>

        <nav style={navStyle}>
          <Link href="/home" style={linkStyle}>
            Home
          </Link>

          <Link href="/swimmers" style={linkStyle}>
            Swimmers
          </Link>

          <Link
            href="/sessions"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
            Sessions
          </Link>

          <Link href="/attendance" style={linkStyle}>
            Attendance
          </Link>

          <Link href="/my-info" style={linkStyle}>
            My Info
          </Link>

          <Link href="/settings" style={linkStyle}>
            Settings
          </Link>
        </nav>
      </aside>

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

                    <span style={badgeStyle}>{session.type}</span>
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
                  <Link
                    href={`/sessions/edit/${session.id}`}
                    style={actionLinkStyle}
                  >
                    <button style={actionButtonStyle}>Edit</button>
                  </Link>

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
                </div>
              </div>
            ))}

            {/* Empty State */}

            {sessions.length === 0 && (
              <div style={emptyStyle}>
                <h3>No sessions yet</h3>

                <p style={mutedTextStyle}>
                  Add your first coaching session to get started.
                </p>

                <Link href="/sessions/add">
                  <button style={buttonStyle}>+ Add Session</button>
                </Link>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
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

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  display: "flex",
  fontFamily: "Arial, sans-serif",
};

const sidebarStyle = {
  width: "220px",
  flexShrink: 0,
  backgroundColor: "var(--sidebar)",
  color: "var(--sidebar-text)",
  padding: "30px 20px",
};

const sidebarSubtitleStyle = {
  color: "var(--sidebar-secondary-text)",
  fontSize: "13px",
  marginTop: "5px",
};

const navStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  marginTop: "35px",
};

const linkStyle = {
  color: "var(--sidebar-text)",
  textDecoration: "none",
  fontSize: "16px",
  padding: "10px 12px",
  borderRadius: "6px",
};

const activeLinkStyle = {
  backgroundColor: "rgba(255,255,255,0.12)",
};

const mainContentStyle = {
  flex: 1,
  padding: "40px",
  minWidth: 0,
};

const topStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "30px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
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
