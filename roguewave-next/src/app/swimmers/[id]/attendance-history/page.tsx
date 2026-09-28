import Link from "next/link";

type AttendanceStatus = "Present" | "Absent";

type AttendanceRecord = {
  date: string;
  status: AttendanceStatus;
};

type Swimmer = {
  id: number;
  name: string;
  attendance: AttendanceRecord[];
};

const swimmers: Swimmer[] = [
  {
    id: 1,
    name: "Isali Rozairo",
    attendance: [
      {
        date: "2026-09-17",
        status: "Present",
      },
      {
        date: "2026-09-12",
        status: "Present",
      },
      {
        date: "2026-09-10",
        status: "Absent",
      },
      {
        date: "2026-09-05",
        status: "Present",
      },
    ],
  },

  {
    id: 2,
    name: "Pawani Rozairo",
    attendance: [
      {
        date: "2026-09-17",
        status: "Present",
      },
      {
        date: "2026-09-12",
        status: "Absent",
      },
      {
        date: "2026-09-10",
        status: "Present",
      },
    ],
  },

  {
    id: 3,
    name: "Swimmer 3",
    attendance: [
      {
        date: "2026-09-17",
        status: "Present",
      },
      {
        date: "2026-09-12",
        status: "Present",
      },
      {
        date: "2026-09-10",
        status: "Present",
      },
    ],
  },
];

export default async function AttendanceHistoryPage({
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

  const attendance = [...swimmer.attendance].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

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

      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>Attendance History</h1>

            <p style={subtitleStyle}>{swimmer.name}</p>
          </div>

          <Link href={`/swimmers/${swimmer.id}`} style={secondaryLinkStyle}>
            Back to Profile
          </Link>
        </div>

        <div style={cardStyle}>
          <div style={tableHeaderStyle}>
            <strong>Date</strong>

            <strong>Status</strong>
          </div>

          {attendance.length > 0 ? (
            attendance.map((record) => (
              <div key={record.date} style={attendanceRowStyle}>
                <span>{formatDate(record.date)}</span>

                <span
                  style={
                    record.status === "Present"
                      ? presentBadgeStyle
                      : absentBadgeStyle
                  }
                >
                  {record.status}
                </span>
              </div>
            ))
          ) : (
            <div style={emptyStyle}>No attendance records yet.</div>
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

const headerStyle = {
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

const cardStyle = {
  maxWidth: "850px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(18px, 4vw, 25px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: "20px",
  padding: "0 12px 12px",
  color: "var(--secondary-text)",
  borderBottom: "1px solid var(--border)",
};

const attendanceRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "20px",
  padding: "15px 12px",
  borderBottom: "1px solid var(--border)",
};

const presentBadgeStyle = {
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
  minWidth: "75px",
  textAlign: "center" as const,
};

const absentBadgeStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
  minWidth: "75px",
  textAlign: "center" as const,
};

const emptyStyle = {
  padding: "35px",
  textAlign: "center" as const,
  color: "var(--secondary-text)",
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

const secondaryLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "10px 18px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};

const notFoundStyle = {
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: "var(--card)",
  padding: "30px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};
