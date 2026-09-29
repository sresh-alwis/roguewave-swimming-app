"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type SessionType = "recurring" | "once" | "";

type Role = "head" | "assistant" | "";

type ScheduleRow = {
  day: string;
  startTime: string;
  endTime: string;
};

type ApiSwimmer = {
  id: number;
  name: string;
  level: string;
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

export default function AddSessionPage() {
  return (
    <Suspense>
      <AddSessionForm />
    </Suspense>
  );
}

function AddSessionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [className, setClassName] = useState("");

  const [sessionType, setSessionType] = useState<SessionType>("");

  const [role, setRole] = useState<Role>("");

  const [schedules, setSchedules] = useState<ScheduleRow[]>([
    {
      day: "",
      startTime: "",
      endTime: "",
    },
  ]);

  const [sessionDate, setSessionDate] = useState("");

  const [onceStartTime, setOnceStartTime] = useState("");

  const [onceEndTime, setOnceEndTime] = useState("");

  const [selectedSwimmers, setSelectedSwimmers] = useState<number[]>([]);

  const [saving, setSaving] = useState(false);

  const [swimmers, setSwimmers] = useState<ApiSwimmer[]>([]);

  useEffect(() => {
    async function loadSwimmers() {
      try {
        const response = await fetch("/api/swimmers", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load swimmers.");
        }

        setSwimmers(data as ApiSwimmer[]);
      } catch {
        // Silently fail — swimmer list will be empty
      }
    }

    loadSwimmers();
  }, []);

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

  function toggleSwimmer(swimmerId: number) {
    setSelectedSwimmers((current) =>
      current.includes(swimmerId)
        ? current.filter((id) => id !== swimmerId)
        : [...current, swimmerId],
    );
  }

  function handleClose() {
    const openedFrom = searchParams.get("from");

    if (openedFrom === "home") {
      router.push("/home");
    } else {
      router.push("/sessions");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!className.trim()) {
      alert("Please enter a class name.");
      return;
    }

    if (!sessionType) {
      alert("Please select Recurring or Once.");
      return;
    }

    if (!role) {
      alert("Please select your role.");
      return;
    }

    /* =========================
       RECURRING VALIDATION
    ========================= */

    if (sessionType === "recurring") {
      const invalidSchedule = schedules.some(
        (schedule) => !schedule.day || !schedule.startTime || !schedule.endTime,
      );

      if (invalidSchedule) {
        alert("Please complete all recurring schedule rows.");
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
    }

    /* =========================
       ONE-OFF VALIDATION
    ========================= */

    if (sessionType === "once") {
      if (!sessionDate || !onceStartTime || !onceEndTime) {
        alert("Please complete the date and time.");
        return;
      }

      if (onceStartTime >= onceEndTime) {
        alert("End time must be after the start time.");
        return;
      }
    }

    try {
      setSaving(true);

      const baseBody = {
        name: className.trim(),

        role: role === "head" ? "Head Coach" : "Assistant Coach",

        default_location: null,
      };

      const requestBody =
        sessionType === "recurring"
          ? {
              ...baseBody,

              session_type: "recurring",

              schedules: schedules.map((schedule) => ({
                day_of_week: getDayNumber(schedule.day),

                start_time: schedule.startTime,

                end_time: schedule.endTime,
              })),

              swimmer_ids: selectedSwimmers,
            }
          : {
              ...baseBody,

              session_type: "once",

              session_date: sessionDate,

              start_time: onceStartTime,

              end_time: onceEndTime,

              swimmer_ids: selectedSwimmers,
            };

      const response = await fetch("/api/sessions", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create session.");
      }

      alert("Session saved successfully.");

      router.push("/sessions");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create session.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={formCardStyle}>
        <div style={headingStyle}>
          <h1
            style={{
              margin: 0,
            }}
          >
            Add Session
          </h1>

          <p style={subtitleStyle}>
            Create a recurring or one-off coaching session.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Class Name */}

          <label>
            Name of Class
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Example: RogueWave Learn to Swim"
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
                Add the days and times this class normally happens.
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

              <div style={onceGridStyle}>
                <label>
                  Date
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  Start Time
                  <input
                    type="time"
                    value={onceStartTime}
                    onChange={(e) => setOnceStartTime(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  End Time
                  <input
                    type="time"
                    value={onceEndTime}
                    onChange={(e) => setOnceEndTime(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Swimmers */}

          <div style={sectionStyle}>
            <h2
              style={{
                margin: 0,
              }}
            >
              Assigned Swimmers
            </h2>

            <p style={subtitleStyle}>
              Select swimmers only if they belong to this session.
            </p>

            {swimmers.length === 0 ? (
              <p style={subtitleStyle}>No swimmers available.</p>
            ) : (
              <div style={swimmerListStyle}>
                {swimmers.map((swimmer) => (
                  <label key={swimmer.id} style={swimmerCheckboxStyle}>
                    <input
                      type="checkbox"
                      checked={selectedSwimmers.includes(swimmer.id)}
                      onChange={() => toggleSwimmer(swimmer.id)}
                    />

                    {swimmer.name} — {swimmer.level}
                  </label>
                ))}
              </div>
            )}

            <p style={selectedCountStyle}>
              {selectedSwimmers.length} swimmer
              {selectedSwimmers.length === 1 ? "" : "s"} selected
            </p>
          </div>

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
              {saving ? "Saving..." : "Save Session"}
            </button>

            <button
              type="button"
              style={closeButtonStyle}
              onClick={handleClose}
              disabled={saving}
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

const onceGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "15px",
  marginTop: "15px",
};

const swimmerListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "10px",
  marginTop: "15px",
};

const swimmerCheckboxStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "var(--soft-background)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
};

const selectedCountStyle = {
  color: "var(--secondary-text)",
  marginTop: "12px",
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
