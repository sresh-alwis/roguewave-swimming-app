import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { calculateDurationMinutes, formatDuration } from "@/lib/attendance-helpers";
import type { Session } from "@/lib/attendance-helpers";

export async function GET() {
  // Get current swimmer count
  const { count: currentSwimmers, error: swimmersError } = await supabaseServer
    .from("swimmers")
    .select("*", { count: "exact", head: true });

  if (swimmersError) {
    return NextResponse.json({ error: swimmersError.message }, { status: 500 });
  }

  // Get My Coaching Sessions count:
  // Head Coach: session_status === "normal" (presence implied by normal status)
  // Assistant Coach: session_status === "normal" AND coach_status === "present"
  // This is the coach's personal coaching record
  const { count: myCoachingSessions, error: sessionsError } = await supabaseServer
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("session_status", "normal")
    .or("coach_status.eq.present,sessions.role.eq.Head Coach");

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  // Get active sessions only for the session list
  const { data: sessions, error: allSessionsError } = await supabaseServer
    .from("sessions")
    .select(
      `
      *,
      session_schedules (
        id,
        day_of_week,
        start_time,
        end_time
      )
      `,
    )
    .eq("is_archived", false)
    .order("id", { ascending: true });

  if (allSessionsError) {
    return NextResponse.json({ error: allSessionsError.message }, { status: 500 });
  }

  // Get all attendance records with session info for coaching history
  const { data: attendanceRecords, error: attendanceError } = await supabaseServer
    .from("attendance_records")
    .select(
      `
      id,
      session_id,
      attendance_date,
      location,
      session_status,
      coach_status,
      sessions (
        id,
        name,
        role,
        is_archived,
        session_type,
        start_time,
        end_time,
        session_date,
        session_schedules (
          id,
          day_of_week,
          start_time,
          end_time
        )
      )
      `,
    )
    .order("attendance_date", { ascending: false });

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 });
  }

  // Build coaching history and calculate Total Time Coached
  let totalMinutesCoached = 0;

  const history = (attendanceRecords ?? [])
    .filter((record) => record.sessions)
    .map((record) => {
      const session = record.sessions as unknown as {
        id: number;
        name: string;
        role: string;
        is_archived: boolean;
        session_type: string;
        start_time: string | null;
        end_time: string | null;
        session_date: string | null;
        session_schedules: { id: number; day_of_week: number; start_time: string; end_time: string }[];
      };

      // Calculate duration for personally coached records:
      // Head Coach: normal (presence implied by normal status)
      // Assistant Coach: normal + coach_status present
      const isPersonallyCoached =
        record.session_status === "normal" &&
        (session.role === "Head Coach" || record.coach_status === "present");

      if (isPersonallyCoached) {
        let durationMinutes: number | null = null;

        if (session.session_type === "once") {
          durationMinutes = calculateDurationMinutes(session.start_time, session.end_time);
        } else if (session.session_type === "recurring") {
          // For recurring sessions, find the schedule matching the attendance date
          const attendanceDayOfWeek = new Date(record.attendance_date + "T00:00:00Z").getUTCDay();
          const matchingSchedule = session.session_schedules?.find(
            (s) => s.day_of_week === attendanceDayOfWeek,
          );
          if (matchingSchedule) {
            durationMinutes = calculateDurationMinutes(
              matchingSchedule.start_time,
              matchingSchedule.end_time,
            );
          }
        }

        if (durationMinutes !== null && durationMinutes > 0) {
          totalMinutesCoached += durationMinutes;
        }
      }

      return {
        attendance_id: record.id,
        date: record.attendance_date,
        session_name: session.name,
        role: session.role,
        location: record.location,
        session_status: record.session_status,
        coach_status: record.coach_status,
        is_archived: session.is_archived,
      };
    });

  return NextResponse.json({
    current_swimmers: currentSwimmers ?? 0,
    my_coaching_sessions: myCoachingSessions ?? 0,
    total_time_coached: formatDuration(totalMinutesCoached),
    total_minutes_coached: totalMinutesCoached,
    sessions: (sessions ?? []) as unknown as Session[],
    history,
  });
}
