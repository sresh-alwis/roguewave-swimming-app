"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";


type Schedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type Session = {
  id: number;
  name: string;
  role: string;
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
        dayOfWeek: 4,
        startTime: "19:00",
        endTime: "20:00",
      },
      {
        dayOfWeek: 6,
        startTime: "19:00",
        endTime: "20:00",
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
        dayOfWeek: 6,
        startTime: "18:00",
        endTime: "19:00",
      },
      {
        dayOfWeek: 0,
        startTime: "18:00",
        endTime: "19:00",
      },
      {
        dayOfWeek: 3,
        startTime: "19:00",
        endTime: "20:00",
      },
    ],
  },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useMounted(): boolean {
  return useSyncExternalStore(
    () => {
      return () => {};
    },
    () => true,
    () => false,
  );
}

export default function HomePage() {
  const mounted = useMounted();

  const [monthOffset, setMonthOffset] = useState(0);

  if (!mounted) {
    return <main style={loadingStyle}>Loading RogueWave...</main>;
  }

  return <HomeContent monthOffset={monthOffset} setMonthOffset={setMonthOffset} />;
}

function HomeContent({
  monthOffset,
  setMonthOffset,
}: {
  monthOffset: number;
  setMonthOffset: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const calendarMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [now, monthOffset]);

  const nextSession = useMemo(() => {
    const possibleSessions = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + i,
      );

      const sessionsThatDay = getSessionsForDate(date);

      for (const session of sessionsThatDay) {
        const sessionDateTime = createSessionDateTime(date, session.startTime);

        if (sessionDateTime >= now) {
          possibleSessions.push({
            ...session,
            date,
            sessionDateTime,
          });
        }
      }

      if (possibleSessions.length > 0) {
        break;
      }
    }

    possibleSessions.sort(
      (a, b) => a.sessionDateTime.getTime() - b.sessionDateTime.getTime(),
    );

    return possibleSessions[0] || null;
  }, [now]);

  function getSessionsForDate(date: Date) {
    const day = date.getDay();

    return sessions
      .flatMap((session) =>
        session.schedules
          .filter((schedule) => schedule.dayOfWeek === day)
          .map((schedule) => ({
            ...session,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            date,
          })),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const selectedDaySessions = selectedDate
    ? getSessionsForDate(selectedDate)
    : [];

  const year = calendarMonth.getFullYear();

  const month = calendarMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const leadingEmptyDays = (firstDayOfMonth + 6) % 7;

  const calendarCells: (Date | null)[] = [];

  for (let i = 0; i < leadingEmptyDays; i++) {
    calendarCells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push(new Date(year, month, day));
  }

  function previousMonth() {
    setMonthOffset((prev) => prev - 1);
  }

  function nextMonth() {
    setMonthOffset((prev) => prev + 1);
  }

  function goToToday() {
    if (!now) return;

    setMonthOffset(0);

    setSelectedDate(now);
  }

  return (
    <main style={pageStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <h2 style={{ margin: 0 }}>ROGUEWAVE</h2>

        <p style={sidebarSubtitleStyle}>Coaching Management</p>

        <nav style={navStyle}>
          <Link
            href="/home"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
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
            <h1 style={{ margin: 0 }}>Home</h1>

            <p style={dateStyle}>
              {now.toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <Link href="/my-info">
            <button style={buttonStyle}>My Info</button>
          </Link>
        </div>

        {/* Summary */}
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>My Swimmers</span>

            <strong style={summaryNumberStyle}>4</strong>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Sessions This Month</span>

            <strong style={summaryNumberStyle}>12</strong>
          </div>
        </div>

        {/* Calendar */}
        <div style={largeCardStyle}>
          <div style={calendarHeaderStyle}>
            <div>
              <h2 style={{ margin: 0 }}>Coaching Calendar</h2>

              <p style={sectionSubtitleStyle}>
                View your planned coaching sessions.
              </p>
            </div>

            {/* IMPORTANT:
                from=home tells Add Session
                where Close should return */}
            <Link href="/sessions/add?from=home">
              <button style={buttonStyle}>+ Add Session</button>
            </Link>
          </div>

          {/* Month Controls */}
          <div style={monthNavigationStyle}>
            <button
              style={smallButtonStyle}
              onClick={previousMonth}
              aria-label="Previous month"
            >
              ←
            </button>

            <h3 style={{ margin: 0 }}>
              {calendarMonth.toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </h3>

            <button
              style={smallButtonStyle}
              onClick={nextMonth}
              aria-label="Next month"
            >
              →
            </button>

            <button style={secondaryButtonStyle} onClick={goToToday}>
              Today
            </button>
          </div>

          {/* Calendar */}
          <div style={calendarWrapperStyle}>
            <div style={calendarGridStyle}>
              {weekDays.map((day) => (
                <div key={day} style={weekHeadingStyle}>
                  {day}
                </div>
              ))}

              {calendarCells.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} style={emptyDayStyle} />;
                }

                const daySessions = getSessionsForDate(date);

                const isToday = sameDate(date, now);

                const isSelected = selectedDate && sameDate(date, selectedDate);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    style={{
                      ...calendarDayStyle,

                      border: isToday
                        ? "2px solid var(--button)"
                        : "1px solid var(--border)",

                      backgroundColor: isSelected
                        ? "var(--accent-background)"
                        : "var(--card)",
                    }}
                  >
                    <strong>{date.getDate()}</strong>

                    {daySessions.length > 0 && (
                      <div style={sessionIndicatorStyle}>
                        {daySessions.length === 1
                          ? "1 session"
                          : `${daySessions.length} sessions`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date */}
          {selectedDate && (
            <div style={selectedDateBoxStyle}>
              <h3 style={{ marginTop: 0 }}>
                {selectedDate.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>

              {selectedDaySessions.length === 0 ? (
                <p style={mutedTextStyle}>No coaching sessions scheduled.</p>
              ) : (
                selectedDaySessions.map((session) => (
                  <div
                    key={`${session.id}-${session.startTime}`}
                    style={informationRowStyle}
                  >
                    <div>
                      <strong>{session.name}</strong>

                      <p style={smallTextStyle}>{session.role}</p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <strong>
                        {formatTime(session.startTime)} -{" "}
                        {formatTime(session.endTime)}
                      </strong>

                      {session.swimmers > 0 && (
                        <p style={smallTextStyle}>
                          {session.swimmers} swimmers
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Upcoming Session */}
        <div
          style={{
            ...largeCardStyle,
            marginTop: "25px",
          }}
        >
          <div>
            <h2
              style={{
                marginBottom: "5px",
              }}
            >
              Upcoming Session
            </h2>

            <p style={sectionSubtitleStyle}>
              Your next scheduled coaching session.
            </p>
          </div>

          {!nextSession ? (
            <p style={mutedTextStyle}>No upcoming sessions.</p>
          ) : (
            <div style={upcomingCardStyle}>
              <div style={dateBadgeStyle}>
                <strong>
                  {nextSession.date.getDate().toString().padStart(2, "0")}
                </strong>

                <span>
                  {nextSession.date.toLocaleDateString("en-GB", {
                    month: "short",
                  })}
                </span>
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: "0 0 6px 0",
                  }}
                >
                  {nextSession.name}
                </h3>

                <p style={smallTextStyle}>{nextSession.role}</p>

                <p
                  style={{
                    margin: "8px 0",
                    fontWeight: "bold",
                  }}
                >
                  {formatTime(nextSession.startTime)} -{" "}
                  {formatTime(nextSession.endTime)}
                </p>

                {nextSession.swimmers > 0 && (
                  <p style={smallTextStyle}>{nextSession.swimmers} swimmers</p>
                )}
              </div>

              {sameDate(nextSession.date, now) ? (
                <Link
                  href={`/attendance/${nextSession.id}?date=${formatDateKey(
                    nextSession.date,
                  )}`}
                >
                  <button style={buttonStyle}>Mark Attendance</button>
                </Link>
              ) : (
                <button style={disabledButtonStyle} disabled>
                  Available on{" "}
                  {nextSession.date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function createSessionDateTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
  );
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "var(--background)",
  color: "var(--text)",
};

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");

  const hour = Number(hourText);

  const period = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
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
  padding: "35px",
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

const dateStyle = {
  margin: "8px 0 0 0",
  color: "var(--secondary-text)",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 260px))",
  gap: "20px",
  marginBottom: "30px",
};

const summaryCardStyle = {
  backgroundColor: "var(--card)",
  padding: "22px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const summaryLabelStyle = {
  display: "block",
  color: "var(--secondary-text)",
  marginBottom: "8px",
};

const summaryNumberStyle = {
  fontSize: "30px",
};

const largeCardStyle = {
  backgroundColor: "var(--card)",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
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

const disabledButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--secondary-text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 18px",
  cursor: "not-allowed",
};

const smallButtonStyle = {
  ...buttonStyle,
  padding: "8px 12px",
};

const secondaryButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "8px 14px",
  cursor: "pointer",
};

const calendarHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
};

const sectionSubtitleStyle = {
  margin: "5px 0 0 0",
  color: "var(--secondary-text)",
};

const monthNavigationStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginTop: "25px",
  marginBottom: "15px",
  flexWrap: "wrap" as const,
};

const calendarWrapperStyle = {
  width: "100%",
  overflowX: "auto" as const,
  paddingBottom: "4px",
};

const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(70px, 1fr))",
  gap: "8px",
  minWidth: "560px",
};

const weekHeadingStyle = {
  textAlign: "center" as const,
  fontWeight: "bold",
  padding: "8px",
  color: "var(--secondary-text)",
};

const emptyDayStyle = {
  minHeight: "75px",
};

const calendarDayStyle = {
  minHeight: "75px",
  padding: "8px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left" as const,
  color: "var(--text)",
};

const sessionIndicatorStyle = {
  marginTop: "8px",
  fontSize: "11px",
  color: "var(--accent-text)",
  fontWeight: "bold",
};

const selectedDateBoxStyle = {
  marginTop: "25px",
  paddingTop: "20px",
  borderTop: "1px solid var(--border)",
};

const informationRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  padding: "14px 0",
  borderBottom: "1px solid var(--border)",
};

const smallTextStyle = {
  margin: "4px 0",
  color: "var(--secondary-text)",
};

const mutedTextStyle = {
  color: "var(--secondary-text)",
};

const upcomingCardStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap" as const,
  gap: "20px",
  marginTop: "20px",
  padding: "20px",
  backgroundColor: "var(--soft-background)",
  borderRadius: "8px",
  border: "1px solid var(--border)",
};

const dateBadgeStyle = {
  minWidth: "65px",
  height: "65px",
  borderRadius: "8px",
  backgroundColor: "var(--accent-background)",
  color: "var(--accent-text)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  alignItems: "center",
  fontSize: "16px",
};
