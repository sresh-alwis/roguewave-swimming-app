"use client";

import Link from "next/link";
import { useState } from "react";

type CoachingRecord = {
  name: string;
  role: string;
  sessions: number;
  hours: number;
};

type HistoryStatus = "Completed" | "Cancelled" | "Absent" | "Holiday";

type HistoryRecord = {
  date: string;
  name: string;
  role: string;
  status: HistoryStatus;
};

const monthlyRecords: Record<string, CoachingRecord[]> = {
  "2026-09": [
    {
      name: "RogueWave",
      role: "Head Coach",
      sessions: 8,
      hours: 8,
    },
    {
      name: "Coach Gayani",
      role: "Assistant Coach",
      sessions: 6,
      hours: 6,
    },
    {
      name: "Gold March Academy",
      role: "Assistant Coach",
      sessions: 3,
      hours: 4,
    },
  ],

  "2026-08": [
    {
      name: "RogueWave",
      role: "Head Coach",
      sessions: 7,
      hours: 7,
    },
    {
      name: "Coach Gayani",
      role: "Assistant Coach",
      sessions: 5,
      hours: 5,
    },
    {
      name: "Gold March Academy",
      role: "Assistant Coach",
      sessions: 2,
      hours: 3,
    },
  ],
};

const yearlyRecords: Record<string, CoachingRecord[]> = {
  "2026": [
    {
      name: "RogueWave",
      role: "Head Coach",
      sessions: 54,
      hours: 54,
    },
    {
      name: "Coach Gayani",
      role: "Assistant Coach",
      sessions: 42,
      hours: 42,
    },
    {
      name: "Gold March Academy",
      role: "Assistant Coach",
      sessions: 18,
      hours: 25,
    },
  ],

  "2025": [
    {
      name: "RogueWave",
      role: "Head Coach",
      sessions: 16,
      hours: 16,
    },
    {
      name: "Coach Gayani",
      role: "Assistant Coach",
      sessions: 6,
      hours: 6,
    },
  ],
};

const allTimeRecords: CoachingRecord[] = [
  {
    name: "RogueWave",
    role: "Head Coach",
    sessions: 70,
    hours: 70,
  },
  {
    name: "Coach Gayani",
    role: "Assistant Coach",
    sessions: 48,
    hours: 48,
  },
  {
    name: "Gold March Academy",
    role: "Assistant Coach",
    sessions: 24,
    hours: 31,
  },
];

const history: HistoryRecord[] = [
  {
    date: "2026-09-23",
    name: "RogueWave",
    role: "Head Coach",
    status: "Completed",
  },
  {
    date: "2026-09-22",
    name: "Coach Gayani",
    role: "Assistant Coach",
    status: "Completed",
  },
  {
    date: "2026-09-20",
    name: "Gold March Academy",
    role: "Assistant Coach",
    status: "Completed",
  },
  {
    date: "2026-09-19",
    name: "RogueWave",
    role: "Head Coach",
    status: "Cancelled",
  },
  {
    date: "2026-09-17",
    name: "RogueWave",
    role: "Head Coach",
    status: "Completed",
  },
  {
    date: "2026-09-16",
    name: "Coach Gayani",
    role: "Assistant Coach",
    status: "Absent",
  },
  {
    date: "2026-09-13",
    name: "Coach Gayani",
    role: "Assistant Coach",
    status: "Completed",
  },
  {
    date: "2026-09-12",
    name: "RogueWave",
    role: "Head Coach",
    status: "Completed",
  },
];

const months = [
  { value: "01", name: "January" },
  { value: "02", name: "February" },
  { value: "03", name: "March" },
  { value: "04", name: "April" },
  { value: "05", name: "May" },
  { value: "06", name: "June" },
  { value: "07", name: "July" },
  { value: "08", name: "August" },
  { value: "09", name: "September" },
  { value: "10", name: "October" },
  { value: "11", name: "November" },
  { value: "12", name: "December" },
];

export default function MyInfoPage() {
  const [viewBy, setViewBy] = useState<"month" | "year" | "all">("month");

  const [selectedMonth, setSelectedMonth] = useState("09");

  const [selectedYear, setSelectedYear] = useState("2026");

  const [showFullHistory, setShowFullHistory] = useState(false);

  let displayedRecords: CoachingRecord[] = [];

  if (viewBy === "month") {
    displayedRecords = monthlyRecords[`${selectedYear}-${selectedMonth}`] || [];
  }

  if (viewBy === "year") {
    displayedRecords = yearlyRecords[selectedYear] || [];
  }

  if (viewBy === "all") {
    displayedRecords = allTimeRecords;
  }

  const totalSessions = allTimeRecords.reduce(
    (total, record) => total + record.sessions,
    0,
  );

  const totalHours = allTimeRecords.reduce(
    (total, record) => total + record.hours,
    0,
  );

  const visibleHistory = showFullHistory ? history : history.slice(0, 4);

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

          <Link href="/attendance" style={linkStyle}>
            Attendance
          </Link>

          <Link href="/sessions" style={linkStyle}>
            Sessions
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
            <h2
              style={{
                margin: "0 0 5px 0",
              }}
            >
              Sreshta Alwis
            </h2>

            <p style={coachSquadStyle}>RogueWave Swimming</p>
          </div>

          <span style={coachBadgeStyle}>Coach</span>
        </div>

        {/* Summary */}
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>My Swimmers</span>

            <strong style={summaryNumberStyle}>4</strong>

            <span style={allTimeLabelStyle}>All Time</span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total Coaching Sessions</span>

            <strong style={summaryNumberStyle}>{totalSessions}</strong>

            <span style={allTimeLabelStyle}>All Time</span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total Coaching Hours</span>

            <strong style={summaryNumberStyle}>{totalHours}</strong>

            <span style={allTimeLabelStyle}>Hours • All Time</span>
          </div>
        </div>

        {/* Coaching Record */}
        <div style={largeCardStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Coaching Record</h2>

            <p style={subtitleStyle}>
              View your coaching activity by month, year or all time.
            </p>
          </div>

          {/* Filters */}
          <div style={filterRowStyle}>
            <label>
              View By
              <select
                value={viewBy}
                onChange={(e) =>
                  setViewBy(e.target.value as "month" | "year" | "all")
                }
                style={selectStyle}
              >
                <option value="month">Month</option>

                <option value="year">Year</option>

                <option value="all">All Time</option>
              </select>
            </label>

            {viewBy === "month" && (
              <label>
                Month
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={selectStyle}
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {(viewBy === "month" || viewBy === "year") && (
              <label>
                Year
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={selectStyle}
                >
                  <option value="2026">2026</option>

                  <option value="2025">2025</option>
                </select>
              </label>
            )}
          </div>

          {/* Records */}
          {displayedRecords.length === 0 ? (
            <div style={emptyStyle}>No coaching records for this period.</div>
          ) : (
            <div>
              {displayedRecords.map((record) => (
                <div key={record.name} style={recordRowStyle}>
                  <div>
                    <strong>{record.name}</strong>

                    <p style={recordRoleStyle}>{record.role}</p>
                  </div>

                  <div style={recordNumbersStyle}>
                    <div>
                      <span style={smallLabelStyle}>Sessions</span>

                      <strong>{record.sessions}</strong>
                    </div>

                    <div>
                      <span style={smallLabelStyle}>Hours</span>

                      <strong>{record.hours}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session History */}
        <div
          style={{
            ...largeCardStyle,
            marginTop: "25px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Session History</h2>

            <p style={subtitleStyle}>Your recorded coaching sessions.</p>
          </div>

          <div style={historyWrapperStyle}>
            <div style={historyTableStyle}>
              <div style={historyHeaderStyle}>
                <strong>Date</strong>

                <strong>Session</strong>

                <strong>Status</strong>
              </div>

              {visibleHistory.map((session, index) => (
                <div
                  key={`${session.date}-${session.name}-${index}`}
                  style={historyRowStyle}
                >
                  <span>{formatDate(session.date)}</span>

                  <div>
                    <strong>{session.name}</strong>

                    <p style={recordRoleStyle}>{session.role}</p>
                  </div>

                  <span style={getStatusStyle(session.status)}>
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {history.length > 4 && (
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => setShowFullHistory((current) => !current)}
            >
              {showFullHistory ? "Show Less" : "View Full History"}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusStyle(status: HistoryStatus) {
  if (status === "Completed") {
    return {
      ...statusBadgeStyle,
      backgroundColor: "var(--success-background)",
      color: "var(--success-text)",
    };
  }

  if (status === "Cancelled") {
    return {
      ...statusBadgeStyle,
      backgroundColor: "var(--danger-background)",
      color: "var(--danger-text)",
    };
  }

  if (status === "Absent") {
    return {
      ...statusBadgeStyle,
      backgroundColor: "var(--warning-background)",
      color: "var(--warning-text)",
    };
  }

  return {
    ...statusBadgeStyle,
    backgroundColor: "var(--soft-background)",
    color: "var(--secondary-text)",
    border: "1px solid var(--border)",
  };
}

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

const filterRowStyle = {
  display: "flex",
  gap: "15px",
  alignItems: "end",
  flexWrap: "wrap" as const,
  marginTop: "22px",
  marginBottom: "22px",
};

const selectStyle = {
  display: "block",
  minWidth: "140px",
  padding: "10px",
  marginTop: "6px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
};

const recordRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  padding: "18px 0",
  borderBottom: "1px solid var(--border)",
};

const recordRoleStyle = {
  margin: "5px 0 0 0",
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const recordNumbersStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(70px, 90px))",
  gap: "15px",
  textAlign: "right" as const,
};

const smallLabelStyle = {
  display: "block",
  color: "var(--secondary-text)",
  fontSize: "12px",
  marginBottom: "4px",
};

const historyWrapperStyle = {
  width: "100%",
  overflowX: "auto" as const,
};

const historyTableStyle = {
  minWidth: "560px",
};

const historyHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "150px 1fr 130px",
  gap: "20px",
  padding: "20px 0 10px",
  color: "var(--secondary-text)",
  borderBottom: "1px solid var(--border)",
};

const historyRowStyle = {
  display: "grid",
  gridTemplateColumns: "150px 1fr 130px",
  gap: "20px",
  padding: "15px 0",
  borderBottom: "1px solid var(--border)",
  alignItems: "center",
};

const statusBadgeStyle = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
  textAlign: "center" as const,
};

const emptyStyle = {
  padding: "25px 0",
  color: "var(--secondary-text)",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
  marginTop: "20px",
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
