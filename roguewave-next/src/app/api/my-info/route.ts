import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Session } from "@/lib/attendance-helpers";

export async function GET() {
  // Get current swimmer count
  const { count: currentSwimmers, error: swimmersError } = await supabaseServer
    .from("swimmers")
    .select("*", { count: "exact", head: true });

  if (swimmersError) {
    return NextResponse.json({ error: swimmersError.message }, { status: 500 });
  }

  // Get all-time non-cancelled attendance count
  const { count: totalCoachingSessions, error: sessionsError } = await supabaseServer
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .neq("session_status", "cancelled");

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
      sessions (
        id,
        name,
        role,
        is_archived
      )
      `,
    )
    .order("attendance_date", { ascending: false });

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 });
  }

  // Build coaching history
  const history = (attendanceRecords ?? [])
    .filter((record) => record.sessions)
    .map((record) => {
      const session = record.sessions as unknown as { id: number; name: string; role: string; is_archived: boolean };
      return {
        attendance_id: record.id,
        date: record.attendance_date,
        session_name: session.name,
        role: session.role,
        location: record.location,
        session_status: record.session_status,
        is_archived: session.is_archived,
      };
    });

  return NextResponse.json({
    current_swimmers: currentSwimmers ?? 0,
    total_coaching_sessions: totalCoachingSessions ?? 0,
    sessions: (sessions ?? []) as unknown as Session[],
    history,
  });
}
