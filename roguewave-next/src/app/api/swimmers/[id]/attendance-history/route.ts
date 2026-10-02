import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { calculateAttendanceSummary } from "@/lib/attendance-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const swimmerId = Number(id);

  if (Number.isNaN(swimmerId)) {
    return NextResponse.json(
      { error: "Invalid swimmer ID." },
      { status: 400 },
    );
  }

  // Get swimmer info
  const { data: swimmer, error: swimmerError } = await supabaseServer
    .from("swimmers")
    .select("id, name")
    .eq("id", swimmerId)
    .maybeSingle();

  if (swimmerError) {
    return NextResponse.json({ error: swimmerError.message }, { status: 500 });
  }

  if (!swimmer) {
    return NextResponse.json({ error: "Swimmer not found." }, { status: 404 });
  }

  // Get all attendance_swimmers rows for this swimmer
  const { data: attendanceSwimmers, error: attendanceError } = await supabaseServer
    .from("attendance_swimmers")
    .select(
      `
      id,
      attendance_id,
      swimmer_id,
      swimmer_name,
      attendance_status,
      attendance_records (
        id,
        session_id,
        attendance_date,
        location,
        session_status,
        sessions (
          id,
          name,
          default_location
        )
      )
      `,
    )
    .eq("swimmer_id", swimmerId);

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 });
  }

  // Build records array, filtering out any with missing attendance_records
  const records = (attendanceSwimmers ?? [])
    .filter((row) => row.attendance_records)
    .map((row) => {
      const record = row.attendance_records as unknown as { id: number; session_id: number; attendance_date: string; location: string | null; session_status: string; sessions: { id: number; name: string; default_location: string | null } | null };
      const session = record.sessions;
      return {
        attendance_id: record.id,
        attendance_date: record.attendance_date,
        attendance_status: row.attendance_status,
        session_id: record.session_id,
        session_name: session?.name ?? "Unknown Session",
        location: record.location ?? session?.default_location ?? null,
        session_status: record.session_status,
      };
    })
    .sort((a, b) => {
      // Sort newest first
      if (a.attendance_date !== b.attendance_date) {
        return b.attendance_date.localeCompare(a.attendance_date);
      }
      // Secondary sort by attendance_id for stable ordering
      return b.attendance_id - a.attendance_id;
    });

  // Calculate summary from the records
  const summary = calculateAttendanceSummary(records);

  return NextResponse.json({
    swimmer: {
      id: swimmer.id,
      name: swimmer.name,
    },
    summary,
    records,
  });
}
