import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { generateCalendarOccurrences, formatDateKey } from "@/lib/calendar-helpers";
import { getColomboToday } from "@/lib/attendance-helpers";
import type { Session, AttendanceRecordRow } from "@/lib/attendance-helpers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const monthOffsetParam = searchParams.get("month_offset");

  let monthOffset = 0;
  if (monthOffsetParam !== null) {
    monthOffset = Number(monthOffsetParam);
    if (Number.isNaN(monthOffset)) {
      return NextResponse.json(
        { error: "Invalid month_offset." },
        { status: 400 },
      );
    }
  }

  // Calculate the target month
  const today = new Date();
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  // Get active sessions only (archived sessions do not generate calendar occurrences)
  const { data: sessions, error: sessionsError } = await supabaseServer
    .from("sessions")
    .select(
      `
      *,
      session_schedules (
        id,
        day_of_week,
        start_time,
        end_time
      ),
      session_swimmers (
        swimmers (
          id,
          name,
          level
        )
      )
      `,
    )
    .eq("is_archived", false)
    .order("id", { ascending: true });

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  // Get total swimmer count (active only)
  const { count: totalSwimmers, error: swimmersError } = await supabaseServer
    .from("swimmers")
    .select("*", { count: "exact", head: true })
    .eq("is_archived", false);

  if (swimmersError) {
    return NextResponse.json({ error: swimmersError.message }, { status: 500 });
  }

  // Get attendance records for the target month (for calendar linkage)
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const startDateStr = formatDateKey(startDate);
  const endDateStr = formatDateKey(endDate);

  const { data: monthAttendanceRecords, error: attendanceError } = await supabaseServer
    .from("attendance_records")
    .select("id, session_id, attendance_date, session_status")
    .gte("attendance_date", startDateStr)
    .lte("attendance_date", endDateStr);

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 });
  }

  // Get all-time normal-only attendance count for sessions_completed
  // Sessions Completed = session_status === "normal" (operational occurrence statistic)
  // Does NOT depend on coach_status
  const { count: sessionsCompleted, error: completedError } = await supabaseServer
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("session_status", "normal");

  if (completedError) {
    return NextResponse.json({ error: completedError.message }, { status: 500 });
  }

  // Generate calendar occurrences
  const calendar = generateCalendarOccurrences(
    (sessions ?? []) as unknown as Session[],
    year,
    month,
    (monthAttendanceRecords ?? []) as unknown as AttendanceRecordRow[],
  );

  // Calculate summary
  const totalSessions = sessions?.length ?? 0;

  const todayStr = getColomboToday();
  const upcomingSessions = calendar.filter(
    (occ) => occ.date >= todayStr,
  ).length;

  return NextResponse.json({
    summary: {
      total_swimmers: totalSwimmers ?? 0,
      total_sessions: totalSessions,
      sessions_completed: sessionsCompleted,
      upcoming_sessions: upcomingSessions,
    },
    calendar,
  });
}
