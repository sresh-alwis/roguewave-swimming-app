"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

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
  is_archived?: boolean;
  sessions: ApiSession[];
  sessionsCompleted: number;
  has_attendance_history?: boolean;
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
  assignedSessions: ApiSession[];
  extraDetails: string;
  isArchived: boolean;
  hasAttendanceHistory: boolean;
};

export default function SwimmerProfilePage() {
  const params = useParams<{ id: string }>();

  const swimmerId = params.id;

  const [swimmer, setSwimmer] = useState<Swimmer | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

          sessionsCompleted: apiSwimmer.sessionsCompleted ?? 0,

          assignedSessions: apiSwimmer.sessions || [],

          extraDetails: apiSwimmer.notes || "",

          isArchived: apiSwimmer.is_archived ?? false,
          hasAttendanceHistory: apiSwimmer.has_attendance_history ?? false,
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
     ARCHIVE / RESTORE
   ========================= */

  async function handleArchiveClick() {
    if (!swimmer) return;

    const confirmed = window.confirm(
      `Archive ${swimmer.name}? They will no longer appear in the active swimmers list or be assignable to sessions. Their attendance history will be kept.`,
    );

    if (!confirmed) return;

    try {
      setIsArchiving(true);

      const response = await fetch(`/api/swimmers/${swimmer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to archive swimmer.");
      }

      setSwimmer((current) =>
        current ? { ...current, isArchived: true, assignedSessions: [] } : current,
      );
      setFeedback({ type: "success", message: "Swimmer archived successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to archive swimmer.",
      });
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleRestoreClick() {
    if (!swimmer) return;

    const confirmed = window.confirm(
      `Restore ${swimmer.name}? They will become active and can be assigned to sessions again.`,
    );

    if (!confirmed) return;

    try {
      setIsRestoring(true);

      const response = await fetch(`/api/swimmers/${swimmer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to restore swimmer.");
      }

      setSwimmer((current) =>
        current ? { ...current, isArchived: false } : current,
      );
      setFeedback({ type: "success", message: "Swimmer restored successfully." });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to restore swimmer.",
      });
    } finally {
      setIsRestoring(false);
    }
  }

  async function handleDeleteClick() {
    if (!swimmer) return;

    const confirmed = window.confirm(
      `Permanently delete ${swimmer.name}? This cannot be undone.`,
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

      setFeedback({ type: "success", message: "Swimmer deleted successfully." });
      // Redirect to swimmers list after successful delete
      window.location.href = "/swimmers";
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete swimmer.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  /* =========================
     LOADING
   ========================= */

  if (loading) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={notFoundStyle}>
            <p>Loading swimmer...</p>
          </section>
        </main>
      </AppShell>
    );
  }

  /* =========================
     ERROR / NOT FOUND
   ========================= */

  if (error || !swimmer) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={notFoundStyle}>
            <h1>Swimmer not found</h1>

            <p style={mutedTextStyle}>{error}</p>

            <Link href="/swimmers" style={buttonLinkStyle}>
              Back to Swimmers
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
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

              {swimmer.isArchived && (
                <span style={archivedBadgeStyle}>Archived</span>
              )}
            </div>

            <p style={subtitleStyle}>Swimmer Profile</p>
          </div>

          <div style={headerActionsStyle}>
            <Link href={`/swimmers/${swimmer.id}/edit`} style={buttonLinkStyle}>
              Edit Swimmer
            </Link>

            {swimmer.isArchived ? (
              <button
                type="button"
                onClick={handleRestoreClick}
                disabled={isRestoring}
                style={restoreButtonStyle}
              >
                {isRestoring ? "Restoring..." : "Restore Swimmer"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleArchiveClick}
                disabled={isArchiving}
                style={archiveButtonStyle}
              >
                {isArchiving ? "Archiving..." : "Archive Swimmer"}
              </button>
            )}

            {!swimmer.hasAttendanceHistory && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting}
                style={deleteButtonStyle}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
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

            <strong>Assigned Sessions</strong>

            {swimmer.assignedSessions.length > 0 ? (
              <div style={assignedSessionsListStyle}>
                {swimmer.assignedSessions.map((session) => (
                  <div key={session.id} style={assignedSessionItemStyle}>
                    <Link href={`/sessions/edit/${session.id}`} style={assignedSessionNameStyle}>
                      {session.name}
                    </Link>
                    <div style={assignedSessionDetailStyle}>
                      {session.session_type === "once"
                        ? `Once • ${formatDate(session.session_date || "")} • ${formatTime(session.start_time || "")} - ${formatTime(session.end_time || "")}`
                        : `Recurring • ${session.session_schedules.map((s) => `${getDayName(s.day_of_week)} ${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join(", ")}`}
                    </div>
                    {session.default_location && (
                      <div style={assignedSessionLocationStyle}>
                        • {session.default_location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={mutedTextStyle}>
                {swimmer.isArchived
                  ? "No sessions assigned (swimmer is archived)."
                  : "No sessions assigned."}
              </p>
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
    </AppShell>
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

function formatTime(time: string) {
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
  marginBottom: "30px",
};

const headerActionsStyle = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap" as const,
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

const archivedBadgeStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--secondary-text)",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "5px 10px",
  borderRadius: "20px",
  border: "1px solid var(--border)",
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

const archiveButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const restoreButtonStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const deleteButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--danger, #dc3545)",
  border: "1px solid var(--danger, #dc3545)",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
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

const assignedSessionsListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
  marginTop: "8px",
};

const assignedSessionItemStyle = {
  padding: "12px",
  backgroundColor: "var(--soft-background)",
  borderRadius: "6px",
  border: "1px solid var(--border)",
};

const assignedSessionNameStyle = {
  fontWeight: "bold",
  marginBottom: "4px",
};

const assignedSessionDetailStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const assignedSessionLocationStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
  marginTop: "2px",
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
