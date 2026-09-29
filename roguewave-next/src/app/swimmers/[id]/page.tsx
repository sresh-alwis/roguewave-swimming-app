"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ApiSession = {
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

type ApiSwimmer = {
  id: number;
  name: string;
  level: string;
  date_of_birth: string | null;
  date_joined: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
  session: ApiSession | null;
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
  assignedSession: string;
  extraDetails: string;
};

export default function SwimmerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const swimmerId = params.id;

  const [swimmer, setSwimmer] = useState<Swimmer | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadSwimmer() {
      try {
        const response = await fetch(`/api/swimmers/${swimmerId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load swimmer.");
        }

        const apiSwimmer = data as ApiSwimmer;

        setSwimmer({
          id: apiSwimmer.id,

          name: apiSwimmer.name,

          level: apiSwimmer.level,

          dateOfBirth: apiSwimmer.date_of_birth
            ? formatDate(apiSwimmer.date_of_birth)
            : "Not set",

          height:
            apiSwimmer.height_cm !== null
              ? formatHeight(apiSwimmer.height_cm)
              : "Not set",

          weight:
            apiSwimmer.weight_kg !== null
              ? `${apiSwimmer.weight_kg} kg`
              : "Not set",

          dateJoined: apiSwimmer.date_joined
            ? formatDate(apiSwimmer.date_joined)
            : "Not set",

          // Attendance is not connected yet.
          sessionsCompleted: 0,

          assignedSession: apiSwimmer.session?.name || "",

          extraDetails: apiSwimmer.notes || "",
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load swimmer.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (swimmerId) {
      loadSwimmer();
    }
  }, [swimmerId]);

  /* =========================
     DELETE FUNCTION
  ========================= */

  async function handleDeleteClick() {
    if (!swimmer) return;

    const confirmed = window.confirm(
      `Delete ${swimmer.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/swimmers/${swimmer.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete swimmer.");
      }

      // Redirect to swimmers list on success
      router.push("/swimmers");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete swimmer."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={notFoundStyle}>
          <p>Loading swimmer...</p>
        </section>
      </main>
    );
  }

  /* =========================
     ERROR / NOT FOUND
  ========================= */

  if (error || !swimmer) {
    return (
      <main style={pageStyle}>
        <section style={notFoundStyle}>
          <h1>Swimmer not found</h1>

          <p style={mutedTextStyle}>{error}</p>

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
              <h1
                style={{
                  margin: 0,
                }}
              >
                {swimmer.name}
              </h1>

              <span style={levelBadgeStyle}>{swimmer.level}</span>
            </div>

            <p style={subtitleStyle}>Swimmer Profile</p>
          </div>

          <Link href={`/swimmers/${swimmer.id}/edit`} style={buttonLinkStyle}>
            Edit Swimmer
          </Link>

          <button
            type="button"
            onClick={() => handleDeleteClick()}
            disabled={isDeleting}
            style={deleteButtonStyle}
          >
            {isDeleting ? "Deleting..." : "Delete Swimmer"}
          </button>
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

          {/* Training Record */}

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Training Record</h2>

            <div style={sessionCountStyle}>
              <span style={smallLabelStyle}>Sessions Completed</span>

              <strong style={sessionNumberStyle}>
                {swimmer.sessionsCompleted}
              </strong>
            </div>

            <div style={dividerStyle} />

            <strong>Assigned Session</strong>

            {swimmer.assignedSession ? (
              <p style={notesStyle}>{swimmer.assignedSession}</p>
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

        <div
          style={{
            marginTop: "25px",
          }}
        >
          <Link href="/swimmers" style={secondaryLinkStyle}>
            Back to Swimmers
          </Link>
        </div>
      </section>
    </main>
  );
}

/* =========================
   COMPONENTS
========================= */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailRowStyle}>
      <span style={smallLabelStyle}>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

/* =========================
   HELPERS
========================= */

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHeight(heightCm: number) {
  const totalInches = heightCm / 2.54;

  let feet = Math.floor(totalInches / 12);

  let inches = Math.round(totalInches - feet * 12);

  if (inches === 12) {
    feet += 1;
    inches = 0;
  }

  return `${feet} ft ${inches} in`;
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

  const deleteButtonStyle = {
    backgroundColor: "var(--danger)",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "14px",
  };
