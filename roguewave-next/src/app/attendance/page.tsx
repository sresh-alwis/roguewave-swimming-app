"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

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
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
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
    swimmers: { id: number; name: string; level: string } | null;
  }[];
};

export default function AttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            swimmers:
              (session.session_swimmers || [])
                .map((item) => item.swimmers)
                .filter(
                  (swimmer): swimmer is { id: number; name: string; level: string } =>
                    swimmer !== null,
                ).length,
            schedules: (session.session_schedules || [])
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((schedule) => ({
                day: getDayName(schedule.day_of_week),
                startTime: formatTime(schedule.start_time),
                endTime: formatTime(schedule.end_time),
              })),
            date: session.session_date
              ? formatDate(session.session_date)
              : undefined,
            startTime: session.start_time
              ? formatTime(session.start_time)
              : undefined,
            endTime: session.end_time
              ? formatTime(session.end_time)
              : undefined,
            location: session.default_location || undefined,
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

  return (
    <AppShell>
      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={headingStyle}>
          <h1 style={{ margin: 0 }}>Attendance</h1>

          <p style={subtitleStyle}>
            Select a coaching session to mark or review attendance.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={emptyStyle}>
            <p style={subtitleStyle}>Loading sessions...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={errorStyle}>
            <strong>Could not load sessions.</strong>

            <p style={subtitleStyle}>{error}</p>
          </div>
        )}

        {/* Sessions */}
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

                    {session.role === "Head Coach" ? (
                      <span style={swimmerBadgeStyle}>
                        {session.swimmers} swimmers
                      </span>
                    ) : (
                      <span style={assistantBadgeStyle}>Coach attendance only</span>
                    )}
                  </div>

                  {/* Schedule */}
                  <div style={{ marginTop: "20px" }}>
                    <strong>
                      {session.schedules.length > 0 ? "Schedule" : "Session Date"}
                    </strong>

                    <div style={scheduleListStyle}>
                      {session.schedules.length > 0 ? (
                        session.schedules.map((schedule) => (
                          <div
                            key={`${session.id}-${schedule.day}`}
                            style={scheduleRowStyle}
                          >
                            <span style={dayStyle}>{schedule.day}</span>

                            <span>
                              {schedule.startTime} - {schedule.endTime}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={scheduleRowStyle}>
                          <span style={dayStyle}>{session.date || "Not set"}</span>

                          <span>
                            {session.startTime || "-"} -{" "}
                            {session.endTime || "-"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {session.location && (
                    <p style={locationStyle}>
                      <strong>Location:</strong> {session.location}
                    </p>
                  )}

                  {/* Explanation */}
                  <p style={helperTextStyle}>
                    {session.role === "Head Coach"
                      ? "Mark each swimmer as present or absent."
                      : "Swimmer attendance is not managed for Assistant Coach sessions."}
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

            {/* Empty State */}
            {sessions.length === 0 && (
              <div style={emptyStyle}>
                <h3>No sessions yet</h3>

                <p style={subtitleStyle}>
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
    </AppShell>
  );
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

const mainContentStyle = {
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

const locationStyle = {
  color: "var(--secondary-text)",
  fontSize: "14px",
  margin: "12px 0 0 0",
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
