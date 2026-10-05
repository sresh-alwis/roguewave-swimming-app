"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

type CalendarOccurrence = {
  session_id: number;
  name: string;
  role: string;
  session_type: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  has_attendance: boolean;
  attendance_record_id: number | null;
  session_status: string | null;
};

type Summary = {
  total_swimmers: number;
  total_sessions: number;
  sessions_completed: number;
  upcoming_sessions: number;
};

type HomeData = {
  summary: Summary;
  calendar: CalendarOccurrence[];
};

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadHome() {
      try {
        const response = await fetch(`/api/home?month_offset=${monthOffset}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load home data.");
        }

        setHomeData(data);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load home data.");
      }
    }

    loadHome();
  }, [monthOffset]);

  const calendarMonth = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [now, monthOffset]);

  const selectedDateStr = selectedDate ? formatDateKey(selectedDate) : null;

  const selectedDaySessions = useMemo(() => {
    if (!homeData || !selectedDateStr) return [];
    return homeData.calendar.filter((occ) => occ.date === selectedDateStr);
  }, [homeData, selectedDateStr]);

  const nextSession = useMemo(() => {
    if (!homeData) return null;

    const todayStr = formatDateKey(now);
    const upcoming = homeData.calendar
      .filter((occ) => occ.date >= todayStr)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });

    return upcoming[0] || null;
  }, [homeData, now]);

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
    setMonthOffset(0);
    setSelectedDate(new Date());
  }

  const summary = homeData?.summary;

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

          <Link href="/sessions" style={linkStyle}>
            Sessions
          </Link>

          <Link href="/attendance" style={linkStyle}>
            Attendance
          </Link>

          <Link href="/my-info" style={linkStyle}>
            My Info
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

        {/* Error */}
        {error && (
          <div style={errorStyle}>
            <p>{error}</p>
          </div>
        )}

        {/* Summary */}
        <div style={summaryGridStyle}>
          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total Swimmers</span>
            <strong style={summaryNumberStyle}>{summary?.total_swimmers ?? 0}</strong>
            <span style={summaryHelperStyle}>Current swimmers</span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Total Sessions</span>
            <strong style={summaryNumberStyle}>{summary?.total_sessions ?? 0}</strong>
            <span style={summaryHelperStyle}>Session definitions</span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Sessions Completed</span>
            <strong style={summaryNumberStyle}>{summary?.sessions_completed ?? 0}</strong>
            <span style={summaryHelperStyle}>All-time, excluding cancelled</span>
          </div>

          <div style={summaryCardStyle}>
            <span style={summaryLabelStyle}>Upcoming Sessions</span>
            <strong style={summaryNumberStyle}>{summary?.upcoming_sessions ?? 0}</strong>
            <span style={summaryHelperStyle}>This calendar month</span>
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

                const dateKey = formatDateKey(date);
                const daySessions = homeData?.calendar.filter(
                  (occ) => occ.date === dateKey,
                ) ?? [];

                const isToday = sameDate(date, now);
                const isSelected = selectedDate && sameDate(date, selectedDate);

                return (
                  <button
                    key={dateKey}
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
                    key={`${session.session_id}-${session.date}-${session.start_time}`}
                    style={informationRowStyle}
                  >
                    <div>
                      <Link
                        href={`/sessions/edit/${session.session_id}`}
                        style={sessionNameLinkStyle}
                      >
                        <strong>{session.name}</strong>
                      </Link>

                      <p style={smallTextStyle}>{session.role}</p>

                      {session.location && (
                        <p style={smallTextStyle}>{session.location}</p>
                      )}
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <strong>
                        {formatTime(session.start_time)} -{" "}
                        {formatTime(session.end_time)}
                      </strong>

                      {session.session_status === "cancelled" && (
                        <p style={cancelledTextStyle}>Cancelled</p>
                      )}

                      {session.has_attendance && session.session_status !== "cancelled" && (
                        <p style={attendanceTextStyle}>Attendance marked</p>
                      )}

                      {session.session_status !== "cancelled" && (
                        <Link
                          href={`/attendance/${session.session_id}?date=${session.date}`}
                          style={attendanceLinkStyle}
                        >
                          <button style={smallButtonStyle}>
                            {session.has_attendance ? "View Attendance" : "Mark Attendance"}
                          </button>
                        </Link>
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
                  {new Date(nextSession.date + "T00:00:00").getDate().toString().padStart(2, "0")}
                </strong>

                <span>
                  {new Date(nextSession.date + "T00:00:00").toLocaleDateString("en-GB", {
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

                {nextSession.location && (
                  <p style={smallTextStyle}>{nextSession.location}</p>
                )}

                <p
                  style={{
                    margin: "8px 0",
                    fontWeight: "bold",
                  }}
                >
                  {formatTime(nextSession.start_time)} -{" "}
                  {formatTime(nextSession.end_time)}
                </p>

                {nextSession.session_status === "cancelled" && (
                  <p style={cancelledTextStyle}>Cancelled</p>
                )}
              </div>

              <Link
                href={`/attendance/${nextSession.session_id}?date=${nextSession.date}`}
                style={attendanceLinkStyle}
              >
                <button style={smallButtonStyle}>
                  {nextSession.has_attendance ? "View Attendance" : "Mark Attendance"}
                </button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
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

function formatTime(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}

const loadingStyle = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "var(--background)",
  color: "var(--text)",
};

const errorStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "20px",
};

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

const summaryHelperStyle = {
  color: "var(--secondary-text)",
  fontSize: "12px",
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
};

const calendarGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: "6px",
};

const weekHeadingStyle = {
  textAlign: "center" as const,
  fontWeight: "bold",
  padding: "10px",
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const emptyDayStyle = {
  minHeight: "90px",
};

const calendarDayStyle = {
  minHeight: "90px",
  padding: "10px",
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left" as const,
  color: "var(--text)",
  display: "flex",
  flexDirection: "column" as const,
};

const sessionIndicatorStyle = {
  marginTop: "auto",
  fontSize: "11px",
  color: "var(--accent-text)",
  fontWeight: "bold",
};

const selectedDateBoxStyle = {
  marginTop: "25px",
  padding: "20px",
  backgroundColor: "var(--soft-background)",
  borderRadius: "8px",
  border: "1px solid var(--border)",
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

const cancelledTextStyle = {
  margin: "4px 0",
  color: "var(--danger-text)",
  fontWeight: "bold",
};

const attendanceTextStyle = {
  margin: "4px 0",
  color: "var(--success-text)",
  fontWeight: "bold",
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

const sessionNameLinkStyle = {
  color: "var(--text)",
  textDecoration: "none",
};

const attendanceLinkStyle = {
  display: "inline-block",
  marginTop: "8px",
};
