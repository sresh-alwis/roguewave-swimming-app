import Link from "next/link";

type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

type Session = {
  id: number;
  name: string;
  role: "Head Coach" | "Assistant Coach";
  swimmers: number;
  schedules: Schedule[];
};

const sessions: Session[] = [
  {
    id: 1,
    name: "RogueWave Learn to Swim",
    role: "Head Coach",
    swimmers: 4,

    schedules: [
      {
        day: "Thursday",
        startTime: "7:00 PM",
        endTime: "8:00 PM",
      },
      {
        day: "Saturday",
        startTime: "7:00 PM",
        endTime: "8:00 PM",
      },
    ],
  },

  {
    id: 2,
    name: "Coach Gayani Adult Class",
    role: "Assistant Coach",
    swimmers: 0,

    schedules: [
      {
        day: "Wednesday",
        startTime: "7:00 PM",
        endTime: "8:00 PM",
      },
      {
        day: "Saturday",
        startTime: "6:00 PM",
        endTime: "7:00 PM",
      },
      {
        day: "Sunday",
        startTime: "6:00 PM",
        endTime: "7:00 PM",
      },
    ],
  },
];

export default function AttendancePage() {
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
            href="/attendance"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
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

      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={headingStyle}>
          <h1 style={{ margin: 0 }}>Attendance</h1>

          <p style={subtitleStyle}>
            Select a coaching session to mark or review attendance.
          </p>
        </div>

        <div style={sessionListStyle}>
          {sessions.map((session) => (
            <div key={session.id} style={cardStyle}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {/* Session Header */}
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

                  {session.swimmers > 0 ? (
                    <span style={swimmerBadgeStyle}>
                      {session.swimmers} swimmers
                    </span>
                  ) : (
                    <span style={assistantBadgeStyle}>My attendance only</span>
                  )}
                </div>

                {/* Schedule */}
                <div style={{ marginTop: "20px" }}>
                  <strong>Schedule</strong>

                  <div style={scheduleListStyle}>
                    {session.schedules.map((schedule) => (
                      <div
                        key={`${session.id}-${schedule.day}`}
                        style={scheduleRowStyle}
                      >
                        <span style={dayStyle}>{schedule.day}</span>

                        <span>
                          {schedule.startTime} - {schedule.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <p style={helperTextStyle}>
                  {session.swimmers > 0
                    ? "Mark each swimmer as present or absent."
                    : "Record your own coaching attendance for this session."}
                </p>
              </div>

              {/* Action */}
              <div style={actionStyle}>
                <Link
                  href={`/attendance/${session.id}`}
                  style={actionLinkStyle}
                >
                  <button style={buttonStyle}>Mark Attendance</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
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

const activeLinkStyle = {
  backgroundColor: "rgba(255,255,255,0.12)",
};

const mainContentStyle = {
  flex: 1,
  padding: "40px",
  minWidth: 0,
};

const headingStyle = {
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

const swimmerBadgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  fontSize: "13px",
  fontWeight: "bold",
  padding: "6px 10px",
  borderRadius: "20px",
};

const assistantBadgeStyle = {
  backgroundColor: "var(--soft-background)",
  color: "var(--secondary-text)",
  fontSize: "13px",
  fontWeight: "bold",
  padding: "6px 10px",
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
  border: "1px solid var(--border)",
  borderRadius: "6px",
};

const dayStyle = {
  fontWeight: "bold",
};

const helperTextStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
  margin: "18px 0 0 0",
};

const actionStyle = {
  display: "flex",
  alignItems: "center",
  minWidth: "150px",
};

const actionLinkStyle = {
  width: "100%",
};

const buttonStyle = {
  width: "100%",
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
};
