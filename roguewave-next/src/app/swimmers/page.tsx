"use client";

import Link from "next/link";
import { useState } from "react";

type Swimmer = {
  id: number;
  name: string;
  sessionsCompleted: number;
  level: "Beginner" | "Intermediate" | "Advanced";
};

const swimmers: Swimmer[] = [
  {
    id: 1,
    name: "Isali Rozairo",
    sessionsCompleted: 7,
    level: "Beginner",
  },
  {
    id: 2,
    name: "Pawani Rozairo",
    sessionsCompleted: 6,
    level: "Intermediate",
  },
  {
    id: 3,
    name: "Swimmer 3",
    sessionsCompleted: 18,
    level: "Advanced",
  },
];

export default function SwimmersPage() {
  const [search, setSearch] = useState("");

  const filteredSwimmers = swimmers.filter((swimmer) =>
    swimmer.name.toLowerCase().includes(search.toLowerCase().trim()),
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
        {/* Heading */}
        <div style={topStyle}>
          <div>
            <h1 style={{ margin: 0 }}>Swimmers</h1>

            <p style={subtitleStyle}>
              Manage your swimmers and view their coaching records.
            </p>
          </div>

          <Link href="/swimmers/add">
            <button style={buttonStyle}>+ Add Swimmer</button>
          </Link>
        </div>

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

        {/* Swimmer Cards */}
        {filteredSwimmers.length > 0 ? (
          <div style={gridStyle}>
            {filteredSwimmers.map((swimmer) => (
              <div key={swimmer.id} style={cardStyle}>
                <div>
                  <h2
                    style={{
                      margin: "0 0 8px 0",
                    }}
                  >
                    {swimmer.name}
                  </h2>

                  <span style={levelBadgeStyle}>{swimmer.level}</span>
                </div>

                <div style={informationStyle}>
                  <span style={labelStyle}>Sessions Completed</span>

                  <strong style={sessionNumberStyle}>
                    {swimmer.sessionsCompleted}
                  </strong>
                </div>

                <Link href={`/swimmers/${swimmer.id}`} style={profileLinkStyle}>
                  <button style={profileButtonStyle}>View Profile</button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div style={emptyStyle}>
            <h3 style={{ marginTop: 0 }}>No swimmers found</h3>

            <p style={subtitleStyle}>Try another name or add a new swimmer.</p>
          </div>
        )}
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

const emptyStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "40px",
  textAlign: "center" as const,
};
