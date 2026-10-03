"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CoachingHistoryRecord = {
  attendance_id: number;
  date: string;
  session_name: string;
  role: string;
  location: string | null;
  session_status: string;
};

type Session = {
  id: number;
  name: string;
  role: string;
  session_type: string;
  default_location: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  session_schedules: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
};

type MyInfoData = {
  current_swimmers: number;
  total_coaching_sessions: number;
  sessions: Session[];
  history: CoachingHistoryRecord[];
};

export default function MyInfoPage() {
  const [data, setData] = useState<MyInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMyInfo() {
      try {
        const response = await fetch("/api/my-info", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load coaching profile.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load coaching profile.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadMyInfo();
  }, []);

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={loadingStyle}>Loading coaching profile...</section>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={pageStyle}>
        <section style={notFoundStyle}>
          <h1>Error</h1>
          <p style={mutedTextStyle}>{error}</p>
          <Link href="/home" style={buttonLinkStyle}>
            Back to Home
          </Link>
        </section>
      </main>
    );
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

          <Link href="/sessions" style={linkStyle}>
            Sessions
          </Link>

          <Link href="/attendance" style={linkStyle}>
            Attendance
          </Link>

          <Link
            href="/my-info"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
            My Info
          </Link>

          <Link href="/settings" style={linkStyle}>
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <section style={mainContentStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>My Coaching Profile</h1>

            <p style={subtitleStyle}>
              Your all-time coaching record and session history.
            </p>
          </div>

          <Link href="/home" style={secondaryLinkStyle}>
            Back to Home
          </Link>
        </div>

        {/* Coach Info */}
        <div style={coachInfoStyle}>
          <div>
            <h2 style={{ margin: "0 0 5px 0" }}>Sreshta Alwis</h2>
            <p style={coachSquadStyle}>RogueWave Swimming</p>
          </div>

          <span style={coachBadgeStyle}>Coach</span>
        </div>

        {/* Summary */}
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Current Swimmers</span>
            <strong style={summaryNumberStyle}>{data.current_swimmers}</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total Coaching Sessions</span>
            <strong style={summaryNumberStyle}>{data.total_coaching_sessions}</strong>
            <span style={allTimeLabelStyle}>All Time</span>
          </div>
        </div>

        {/* My Sessions */}
        <div style={largeCardStyle}>
          <h2 style={{ margin: 0 }}>My Sessions</h2>

          <p style={subtitleStyle}>Your assigned coaching sessions.</p>

          {data.sessions.length === 0 ? (
            <div style={emptyStyle}>No sessions yet.</div>
          ) : (
            <div style={sessionListStyle}>
              {data.sessions.map((session) => (
                <div key={session.id} style={sessionRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/sessions/edit/${session.id}`}
                      style={sessionNameStyle}
                    >
                      {session.name}
                    </Link>

                    <p style={recordRoleStyle}>{session.role}</p>

                    <p style={sessionDetailStyle}>
                      {session.session_type === "once"
                        ? `Once • ${formatDate(session.session_date || "")} • ${formatTime(session.start_time || "")} - ${formatTime(session.end_time || "")}`
                        : `Recurring • ${session.session_schedules.map((s) => `${getDayName(s.day_of_week)} ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join(", ")}`}
                    </p>

                    {session.default_location && (
                      <p style={sessionLocationStyle}>{session.default_location}</p>
                    )}
                  </div>

                  <span style={typeBadgeStyle}>
                    {session.session_type === "once" ? "Once" : "Recurring"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Coaching History */}
        <div style={{ ...largeCardStyle, marginTop: "25px" }}>
          <h2 style={{ margin: 0 }}>Coaching History</h2>

          <p style={subtitleStyle}>Your recorded coaching sessions.</p>

          {data.history.length === 0 ? (
            <div style={emptyStyle}>No coaching history yet.</div>
          ) : (
            <div style={historyWrapperStyle}>
              <div style={historyTableStyle}>
                <div style={historyHeaderStyle}>
                  <strong>Date</strong>
                  <strong>Session</strong>
                  <strong>Role</strong>
                  <strong>Status</strong>
                </div>

                {data.history.map((record) => (
                  <div
                    key={record.attendance_id}
                    style={historyRowStyle}
                  >
                    <span>{formatDate(record.date)}</span>

                    <div>
                      <strong>{record.session_name}</strong>
                      {record.location && (
                        <p style={recordRoleStyle}>{record.location}</p>
                      )}
                    </div>

                    <span>{record.role}</span>

                    <span
                      style={
                        record.session_status === "cancelled"
                          ? cancelledBadgeStyle
                          : completedBadgeStyle
                      }
                    >
                      {record.session_status === "cancelled" ? "Cancelled" : "Completed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(date: string) {
  if (!date) return "Not set";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time: string) {
  if (!time) return "-";
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

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

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  display: "flex",
  fontFamily: "Arial, sans-serif",
};

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "var(--background)",
  color: "var(--text)",
};

const notFoundStyle = {
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: "var(--card)",
  padding: "30px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  textAlign: "center" as const,
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
  minWidth: 0,
  padding: "40px",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "25px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const coachInfoStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "20px 25px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "25px",
};

const coachSquadStyle = {
  margin: 0,
  color: "var(--secondary-text)",
};

const coachBadgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px",
  marginBottom: "25px",
};

const summaryCardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "22px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column" as const,
  gap: "7px",
};

const summaryLabelStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const summaryNumberStyle = {
  fontSize: "30px",
};

const allTimeLabelStyle = {
  color: "var(--secondary-text)",
  fontSize: "12px",
};

const largeCardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(18px, 4vw, 25px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const sessionListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "15px",
  marginTop: "20px",
};

const sessionRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  padding: "15px",
  backgroundColor: "var(--soft-background)",
  borderRadius: "8px",
  border: "1px solid var(--border)",
};

const sessionNameStyle: React.CSSProperties = {
  fontWeight: "bold",
  fontSize: "16px",
  color: "var(--text)",
  textDecoration: "none",
};

const recordRoleStyle = {
  margin: "5px 0 0 0",
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const sessionDetailStyle = {
  margin: "5px 0 0 0",
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const sessionLocationStyle = {
  margin: "3px 0 0 0",
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const typeBadgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "5px 10px",
  borderRadius: "20px",
  flexShrink: 0,
};

const historyWrapperStyle = {
  width: "100%",
  overflowX: "auto" as const,
  marginTop: "20px",
};

const historyTableStyle = {
  minWidth: "600px",
};

const historyHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 120px 100px",
  gap: "20px",
  padding: "0 0 10px",
  color: "var(--secondary-text)",
  borderBottom: "1px solid var(--border)",
};

const historyRowStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 120px 100px",
  gap: "20px",
  padding: "15px 0",
  borderBottom: "1px solid var(--border)",
  alignItems: "center",
};

const completedBadgeStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "bold",
  textAlign: "center" as const,
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
};

const cancelledBadgeStyle = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "bold",
  textAlign: "center" as const,
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
};

const emptyStyle = {
  padding: "25px 0",
  color: "var(--secondary-text)",
};

const secondaryLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 18px",
  textDecoration: "none",
  fontWeight: "bold",
};

const buttonLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  padding: "10px 18px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};

const mutedTextStyle = {
  color: "var(--secondary-text)",
};
