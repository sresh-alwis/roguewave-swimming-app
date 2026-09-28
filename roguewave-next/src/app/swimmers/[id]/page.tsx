import Link from "next/link";

type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

type AssignedSession = {
  id: number;
  name: string;
  schedules: Schedule[];
};

type Swimmer = {
  id: number;
  name: string;
  level: string;
  dateOfBirth: string;
  height: string;
  weight: string;
  dateJoined: string;
  sessionsCompleted: number;
  extraDetails: string;
  assignedSession: AssignedSession | null;
};

const rogueWaveSession: AssignedSession = {
  id: 1,
  name: "RogueWave Learn to Swim",

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
};

const swimmers: Swimmer[] = [
  {
    id: 1,
    name: "Isali Rozairo",
    level: "Beginner",
    dateOfBirth: "10/05/2012",
    height: "4 ft 8 in",
    weight: "38 kg",
    dateJoined: "07/05/2026",
    sessionsCompleted: 7,
    extraDetails: "Working on breathing, body balance and freestyle kick.",
    assignedSession: rogueWaveSession,
  },

  {
    id: 2,
    name: "Pawani Rozairo",
    level: "Intermediate",
    dateOfBirth: "15/08/2010",
    height: "5 ft 1 in",
    weight: "45 kg",
    dateJoined: "07/05/2026",
    sessionsCompleted: 6,
    extraDetails: "Working on freestyle technique and breathing.",
    assignedSession: rogueWaveSession,
  },

  {
    id: 3,
    name: "Swimmer 3",
    level: "Advanced",
    dateOfBirth: "20/03/2008",
    height: "5 ft 6 in",
    weight: "58 kg",
    dateJoined: "15/04/2026",
    sessionsCompleted: 18,
    extraDetails: "Advanced swimmer training.",
    assignedSession: rogueWaveSession,
  },
];

export default async function SwimmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const swimmer = swimmers.find((swimmer) => swimmer.id === Number(id));

  if (!swimmer) {
    return (
      <main style={pageStyle}>
        <section style={notFoundStyle}>
          <h1>Swimmer not found</h1>

          <Link href="/swimmers" style={buttonLinkStyle}>
            Back to Swimmers
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

          <Link
            href="/swimmers"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
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
        <div style={topStyle}>
          <div>
            <div style={nameRowStyle}>
              <h1 style={{ margin: 0 }}>{swimmer.name}</h1>

              <span style={levelBadgeStyle}>{swimmer.level}</span>
            </div>

            <p style={subtitleStyle}>Swimmer Profile</p>
          </div>

          <Link href={`/swimmers/${swimmer.id}/edit`} style={buttonLinkStyle}>
            Edit Swimmer
          </Link>
        </div>

        {/* Profile Cards */}
        <div style={profileGridStyle}>
          {/* Personal */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Personal Details</h2>

            <div style={detailListStyle}>
              <DetailRow label="Date of Birth" value={swimmer.dateOfBirth} />

              <DetailRow label="Swimming Level" value={swimmer.level} />

              <DetailRow label="Height" value={swimmer.height} />

              <DetailRow label="Weight" value={swimmer.weight} />

              <DetailRow label="Date Joined" value={swimmer.dateJoined} />
            </div>
          </div>

          {/* Coaching Record */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Coaching Record</h2>

            <div style={sessionCountStyle}>
              <span style={smallLabelStyle}>Sessions Completed</span>

              <strong style={sessionNumberStyle}>
                {swimmer.sessionsCompleted}
              </strong>
            </div>

            <div style={dividerStyle} />

            <strong>Assigned Session</strong>

            {swimmer.assignedSession ? (
              <div
                style={{
                  marginTop: "12px",
                }}
              >
                <p style={sessionNameStyle}>{swimmer.assignedSession.name}</p>

                <div style={scheduleListStyle}>
                  {swimmer.assignedSession.schedules.map((schedule) => (
                    <div key={schedule.day} style={scheduleRowStyle}>
                      <strong>{schedule.day}</strong>

                      <span>
                        {schedule.startTime} - {schedule.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={mutedTextStyle}>No session assigned.</p>
            )}

            <Link
              href={`/swimmers/${swimmer.id}/attendance-history`}
              style={historyLinkStyle}
            >
              View Attendance History
            </Link>
          </div>

          {/* Extra Details */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Extra Details</h2>

            {swimmer.extraDetails ? (
              <p style={notesStyle}>{swimmer.extraDetails}</p>
            ) : (
              <p style={mutedTextStyle}>No extra details added.</p>
            )}
          </div>
        </div>

        {/* Back */}
        <div style={{ marginTop: "25px" }}>
          <Link href="/swimmers" style={secondaryLinkStyle}>
            Back to Swimmers
          </Link>
        </div>
      </section>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRowStyle}>
      <span style={smallLabelStyle}>{label}</span>

      <strong>{value}</strong>
    </div>
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

const topStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "30px",
};

const nameRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const levelBadgeStyle = {
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  padding: "5px 10px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
};

const profileGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
  alignItems: "start",
};

const cardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const cardTitleStyle = {
  margin: "0 0 20px 0",
};

const detailListStyle = {
  display: "flex",
  flexDirection: "column" as const,
};

const detailRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "12px 0",
  borderBottom: "1px solid var(--border)",
};

const smallLabelStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
};

const sessionCountStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "5px",
};

const sessionNumberStyle = {
  fontSize: "30px",
};

const dividerStyle = {
  borderTop: "1px solid var(--border)",
  margin: "20px 0",
};

const sessionNameStyle = {
  margin: "0 0 10px 0",
  fontWeight: "bold",
  color: "var(--accent-text)",
};

const scheduleListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const scheduleRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
  gap: "15px",
  backgroundColor: "var(--soft-background)",
  color: "var(--text)",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
};

const notesStyle = {
  color: "var(--text)",
  lineHeight: 1.6,
  margin: 0,
};

const mutedTextStyle = {
  color: "var(--secondary-text)",
};

const buttonLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  borderRadius: "6px",
  padding: "10px 18px",
  textDecoration: "none",
  fontWeight: "bold",
};

const historyLinkStyle = {
  ...buttonLinkStyle,
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

const notFoundStyle = {
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: "var(--card)",
  padding: "30px",
  border: "1px solid var(--border)",
  borderRadius: "10px",
};
