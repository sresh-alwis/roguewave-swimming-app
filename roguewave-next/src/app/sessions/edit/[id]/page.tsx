"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type SessionType = "recurring" | "once" | "";

type Role = "head" | "assistant" | "";

type ScheduleRow = {
  day: string;
  startTime: string;
  endTime: string;
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
  session_schedules: ApiSchedule[];
};

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const sessionId = params.id;

  const [className, setClassName] = useState("");

  const [sessionType, setSessionType] = useState<SessionType>("");

  const [role, setRole] = useState<Role>("");

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /* =========================
     LOAD SESSION
  ========================= */

  useEffect(() => {
    async function loadSession() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load session.");
        }

        const session = data as ApiSession;

        setClassName(session.name);

        setSessionType(
          session.session_type.toLowerCase() === "once" ? "once" : "recurring",
        );

        setRole(session.role === "Head Coach" ? "head" : "assistant");

        const loadedSchedules = (session.session_schedules || [])
          .sort((a, b) => a.day_of_week - b.day_of_week)
          .map((schedule) => ({
            day: getDayName(schedule.day_of_week),

            startTime: formatTimeForInput(schedule.start_time),

            endTime: formatTimeForInput(schedule.end_time),
          }));

        setSchedules(
          loadedSchedules.length > 0
            ? loadedSchedules
            : [
                {
                  day: "",
                  startTime: "",
                  endTime: "",
                },
              ],
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load session.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  /* =========================
     SCHEDULE FUNCTIONS
  ========================= */

  function updateSchedule(
    index: number,
    field: keyof ScheduleRow,
    value: string,
  ) {
    setSchedules((current) =>
      current.map((schedule, scheduleIndex) =>
        scheduleIndex === index
          ? {
              ...schedule,
              [field]: value,
            }
          : schedule,
      ),
    );
  }

  function addScheduleRow() {
    setSchedules((current) => [
      ...current,
      {
        day: "",
        startTime: "",
        endTime: "",
      },
    ]);
  }

  function removeScheduleRow(index: number) {
    if (schedules.length === 1) {
      return;
    }

    setSchedules((current) =>
      current.filter((_, scheduleIndex) => scheduleIndex !== index),
    );
  }

  /* =========================
     UPDATE SESSION
  ========================= */

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!className.trim()) {
      alert("Please enter a class name.");

      return;
    }

    if (!role) {
      alert("Please select your role.");

      return;
    }

    if (!sessionType) {
      alert("Please select a session type.");

      return;
    }

    if (sessionType === "once") {
      alert("One-off session database support is not connected yet.");

      return;
    }

    const invalidSchedule = schedules.some(
      (schedule) => !schedule.day || !schedule.startTime || !schedule.endTime,
    );

    if (invalidSchedule) {
      alert("Please complete all schedule rows.");

      return;
    }

    const selectedDays = schedules.map((schedule) => schedule.day);

    const duplicateDays = new Set(selectedDays).size !== selectedDays.length;

    if (duplicateDays) {
      alert("The same day cannot be added twice.");

      return;
    }

    const invalidTime = schedules.some(
      (schedule) => schedule.startTime >= schedule.endTime,
    );

    if (invalidTime) {
      alert("End time must be after the start time.");

      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: className.trim(),

          role: role === "head" ? "Head Coach" : "Assistant Coach",

          session_type: "recurring",

          schedules: schedules.map((schedule) => ({
            day_of_week: getDayNumber(schedule.day),

            start_time: schedule.startTime,

            end_time: schedule.endTime,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update session.");
      }

      alert("Session updated successfully.");

      router.push("/sessions");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update session.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     LOADING / ERROR
  ========================= */

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={formCardStyle}>
          <p>Loading session...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageStyle}>
        <section style={formCardStyle}>
          <h2>Could not load session</h2>

          <p style={subtitleStyle}>{error}</p>

          <button
            style={secondaryButtonStyle}
            onClick={() => router.push("/sessions")}
          >
            Back to Sessions
          </button>
        </section>
      </main>
    );
  }

  /* =========================
     PAGE
  ========================= */

  return (
    <main style={pageStyle}>
      <section style={formCardStyle}>
        <div style={headingStyle}>
          <h1
            style={{
              margin: 0,
            }}
          >
            Edit Session
          </h1>

          <p style={subtitleStyle}>Update your coaching session details.</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Class Name */}

          <label>
            Name of Class
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
              style={inputStyle}
            />
          </label>

          {/* Session Type */}

          <label>
            Session Type
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as SessionType)}
              required
              style={inputStyle}
            >
              <option value="">Select</option>

              <option value="recurring">Recurring</option>

              <option value="once">Once</option>
            </select>
          </label>

          {/* Role */}

          <label>
            My Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              required
              style={inputStyle}
            >
              <option value="">Select</option>

              <option value="head">Head Coach</option>

              <option value="assistant">Assistant Coach</option>
            </select>
          </label>

          {/* Recurring */}

          {sessionType === "recurring" && (
            <div style={sectionStyle}>
              <h2
                style={{
                  margin: 0,
                }}
              >
                Schedule
              </h2>

              <p style={subtitleStyle}>
                Edit the days and times this class normally happens.
              </p>

              {schedules.map((schedule, index) => (
                <div key={index} style={scheduleRowStyle}>
                  <label>
                    Day
                    <select
                      value={schedule.day}
                      onChange={(e) =>
                        updateSchedule(index, "day", e.target.value)
                      }
                      required
                      style={inputStyle}
                    >
                      <option value="">Select Day</option>

                      {days.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Start Time
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) =>
                        updateSchedule(index, "startTime", e.target.value)
                      }
                      required
                      style={inputStyle}
                    />
                  </label>

                  <label>
                    End Time
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) =>
                        updateSchedule(index, "endTime", e.target.value)
                      }
                      required
                      style={inputStyle}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => removeScheduleRow(index)}
                    disabled={schedules.length === 1}
                    style={{
                      ...removeButtonStyle,

                      opacity: schedules.length === 1 ? 0.5 : 1,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addScheduleRow}
                style={secondaryButtonStyle}
              >
                + Add Another Day
              </button>
            </div>
          )}

          {/* One-Off */}

          {sessionType === "once" && (
            <div style={sectionStyle}>
              <h2
                style={{
                  margin: 0,
                }}
              >
                One-Off Session
              </h2>

              <p style={subtitleStyle}>
                One-off session editing will be connected when one-off session
                storage is added.
              </p>
            </div>
          )}

          {/* Actions */}

          <div style={buttonRowStyle}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,

                opacity: saving ? 0.6 : 1,

                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Updating..." : "Update Session"}
            </button>

            <button
              type="button"
              disabled={saving}
              style={closeButtonStyle}
              onClick={() => router.push("/sessions")}
            >
              Close
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* =========================
   HELPERS
========================= */

function getDayName(dayOfWeek: number) {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return dayNames[dayOfWeek] ?? "";
}

function getDayNumber(day: string) {
  const dayNumbers: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return dayNumbers[day];
}

function formatTimeForInput(time: string) {
  return time.split(":").slice(0, 2).join(":");
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 40px)",
  fontFamily: "Arial, sans-serif",
};

const formCardStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 30px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const headingStyle = {
  marginBottom: "30px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "20px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
};

const sectionStyle = {
  paddingTop: "20px",
  borderTop: "1px solid var(--border)",
};

const scheduleRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  alignItems: "end",
  padding: "15px",
  marginTop: "15px",
  backgroundColor: "var(--soft-background)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap" as const,
  marginTop: "10px",
};

const buttonStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "9px 16px",
  cursor: "pointer",
  marginTop: "15px",
};

const removeButtonStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 14px",
  cursor: "pointer",
};

const closeButtonStyle = {
  ...secondaryButtonStyle,
  marginTop: 0,
};
