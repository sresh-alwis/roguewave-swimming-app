import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseServer
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
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, role, session_type, default_location, schedules } = body;

    if (!name || !role || !session_type) {
      return NextResponse.json(
        { error: "Missing required session details." },
        { status: 400 },
      );
    }

    if (
      session_type === "recurring" &&
      (!Array.isArray(schedules) || schedules.length === 0)
    ) {
      return NextResponse.json(
        { error: "Recurring sessions need at least one schedule." },
        { status: 400 },
      );
    }

    // Create session
    const { data: session, error: sessionError } = await supabaseServer
      .from("sessions")
      .insert({
        name,
        role,
        session_type,
        default_location: default_location || null,
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 },
      );
    }

    // Create recurring schedule rows
    if (
      session_type === "recurring" &&
      Array.isArray(schedules) &&
      schedules.length > 0
    ) {
      const scheduleRows = schedules.map((schedule) => ({
        session_id: session.id,
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      }));

      const { error: scheduleError } = await supabaseServer
        .from("session_schedules")
        .insert(scheduleRows);

      if (scheduleError) {
        // Cleanup session if schedules fail
        await supabaseServer.from("sessions").delete().eq("id", session.id);

        return NextResponse.json(
          { error: scheduleError.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        message: "Session created successfully.",
        session,
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
