import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/* =========================
   GET ONE SESSION
========================= */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }

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
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json(data);
}

/* =========================
   UPDATE SESSION
========================= */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
  }

  try {
    const body = await request.json();

    const {
      name,
      role,
      session_type,
      default_location,
      schedules,
      session_date,
      start_time,
      end_time,
    } = body;

    /* =========================
       BASIC VALIDATION
    ========================= */

    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        {
          error: "Session name cannot be empty.",
        },
        { status: 400 },
      );
    }

    if (
      role !== undefined &&
      role !== "Head Coach" &&
      role !== "Assistant Coach"
    ) {
      return NextResponse.json(
        {
          error: "Invalid coaching role.",
        },
        { status: 400 },
      );
    }

    if (
      session_type !== undefined &&
      session_type !== "recurring" &&
      session_type !== "once"
    ) {
      return NextResponse.json(
        {
          error: "Invalid session type.",
        },
        { status: 400 },
      );
    }

    /* =========================
       RECURRING VALIDATION
    ========================= */

    if (session_type === "recurring") {
      if (!Array.isArray(schedules) || schedules.length === 0) {
        return NextResponse.json(
          {
            error: "Recurring sessions need at least one schedule.",
          },
          { status: 400 },
        );
      }

      const typedSchedules = schedules as ScheduleInput[];

      for (const schedule of typedSchedules) {
        if (
          typeof schedule.day_of_week !== "number" ||
          schedule.day_of_week < 0 ||
          schedule.day_of_week > 6 ||
          !schedule.start_time ||
          !schedule.end_time
        ) {
          return NextResponse.json(
            {
              error: "Invalid schedule information.",
            },
            { status: 400 },
          );
        }

        if (schedule.start_time >= schedule.end_time) {
          return NextResponse.json(
            {
              error: "Schedule end time must be after start time.",
            },
            { status: 400 },
          );
        }
      }

      const days = typedSchedules.map((schedule) => schedule.day_of_week);

      if (new Set(days).size !== days.length) {
        return NextResponse.json(
          {
            error: "The same schedule day cannot be added twice.",
          },
          { status: 400 },
        );
      }
    }

    /* =========================
       ONE-OFF VALIDATION
    ========================= */

    if (session_type === "once") {
      if (!session_date || !start_time || !end_time) {
        return NextResponse.json(
          {
            error: "One-off sessions need a date, start time and end time.",
          },
          { status: 400 },
        );
      }

      if (start_time >= end_time) {
        return NextResponse.json(
          {
            error: "End time must be after start time.",
          },
          { status: 400 },
        );
      }
    }

    /* =========================
       BUILD MAIN UPDATE
    ========================= */

    const updates: Record<string, string | null> = {};

    if (name !== undefined) {
      updates.name = name.trim();
    }

    if (role !== undefined) {
      updates.role = role;
    }

    if (session_type !== undefined) {
      updates.session_type = session_type;
    }

    if (default_location !== undefined) {
      updates.default_location = default_location || null;
    }

    /*
      Recurring sessions do not use
      the one-off date/time columns.
    */

    if (session_type === "recurring") {
      updates.session_date = null;
      updates.start_time = null;
      updates.end_time = null;
    }

    /*
      One-off sessions store their
      date/time directly on sessions.
    */

    if (session_type === "once") {
      updates.session_date = session_date;

      updates.start_time = start_time;

      updates.end_time = end_time;
    }

    /* =========================
       UPDATE SESSION
    ========================= */

    const { error: sessionError } = await supabaseServer
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);

    if (sessionError) {
      return NextResponse.json(
        {
          error: sessionError.message,
        },
        { status: 500 },
      );
    }

    /* =========================
       HANDLE SCHEDULES
    ========================= */

    /*
      First remove old recurring
      schedule rows.

      This also handles changing:
      Recurring → Once
    */

    if (session_type === "recurring" || session_type === "once") {
      const { error: deleteScheduleError } = await supabaseServer
        .from("session_schedules")
        .delete()
        .eq("session_id", sessionId);

      if (deleteScheduleError) {
        return NextResponse.json(
          {
            error: deleteScheduleError.message,
          },
          { status: 500 },
        );
      }
    }

    /*
      If it is recurring, recreate
      its current schedules.
    */

    if (
      session_type === "recurring" &&
      Array.isArray(schedules) &&
      schedules.length > 0
    ) {
      const scheduleRows = (schedules as ScheduleInput[]).map((schedule) => ({
        session_id: sessionId,

        day_of_week: schedule.day_of_week,

        start_time: schedule.start_time,

        end_time: schedule.end_time,
      }));

      const { error: insertScheduleError } = await supabaseServer
        .from("session_schedules")
        .insert(scheduleRows);

      if (insertScheduleError) {
        return NextResponse.json(
          {
            error: insertScheduleError.message,
          },
          { status: 500 },
        );
      }
    }

    /* =========================
       RETURN UPDATED SESSION
    ========================= */

    const { data: updatedSession, error: fetchError } = await supabaseServer
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
      .eq("id", sessionId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        {
          error: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!updatedSession) {
      return NextResponse.json(
        {
          error: "Session not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Session updated successfully.",

      session: updatedSession,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request.",
      },
      { status: 400 },
    );
  }
}

/* =========================
   DELETE SESSION
========================= */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sessionId = Number(id);

  if (Number.isNaN(sessionId)) {
    return NextResponse.json(
      {
        error: "Invalid session ID.",
      },
      { status: 400 },
    );
  }

  const { error } = await supabaseServer
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Session deleted successfully.",
  });
}
