import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type SessionSwimmerWithSwimmer = {
  swimmer_id: number;
  session_id: number;
  swimmers: { id: number; name: string; level: string } | null;
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

  // Get assigned swimmers for this session
  const { data: sessionSwimmers, error: sessionSwimmersError } = await supabaseServer
    .from("session_swimmers")
    .select(
      `swimmers (
        id,
        name,
        level
      )`
    )
    .eq("session_id", sessionId);

  if (sessionSwimmersError) {
    return NextResponse.json({ error: sessionSwimmersError.message }, { status: 500 });
  }

  // Transform the data to include swimmers array, filtering out null joins
  const enrichedData = {
    ...data,
    swimmers: ((sessionSwimmers ?? []) as unknown as SessionSwimmerWithSwimmer[])
      .map((item) => item.swimmers)
      .filter((swimmer): swimmer is { id: number; name: string; level: string } => swimmer !== null),
  };

  return NextResponse.json(enrichedData);
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
      swimmer_ids,
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
       HANDLE SWIMMER RELATIONSHIPS
    ========================= */

    /*
       If swimmer_ids is supplied, handle session-swimmer assignments.
       First remove all existing relationships for this session.
       Then create the new ones.
    */

    if (swimmer_ids !== undefined) {
      // Validate swimmer_ids is an array of valid numeric IDs
      if (!Array.isArray(swimmer_ids)) {
        return NextResponse.json(
          {
            error: "swimmer_ids must be an array of valid numeric IDs.",
          },
          { status: 400 },
        );
      }

      const allValidNumbers = swimmer_ids.every(
        (id) => typeof id === "number" && Number.isFinite(id) && id > 0,
      );

      if (!allValidNumbers) {
        return NextResponse.json(
          {
            error: "swimmer_ids must be an array of valid numeric IDs.",
          },
          { status: 400 },
        );
      }

      // Deduplicate swimmer IDs
      const uniqueSwimmerIds = [...new Set(swimmer_ids)];

      // Preserve existing relationships for this session before replacing
      const { data: existingRelationships, error: fetchError } = await supabaseServer
        .from("session_swimmers")
        .select("swimmer_id")
        .eq("session_id", sessionId);

      if (fetchError) {
        return NextResponse.json(
          {
            error: fetchError.message,
          },
          { status: 500 },
        );
      }

      // Preserve assignments in OTHER sessions before removing them (for rollback on failure)
      const { data: otherSessionAssignments, error: fetchOtherError } = await supabaseServer
        .from("session_swimmers")
        .select("session_id, swimmer_id")
        .in("swimmer_id", uniqueSwimmerIds)
        .neq("session_id", sessionId);

      if (fetchOtherError) {
        return NextResponse.json(
          {
            error: fetchOtherError.message,
          },
          { status: 500 },
        );
      }

      // V1: Enforce one-session-per-swimmer.
      // Remove any existing assignments for these swimmers in OTHER sessions.
      if (uniqueSwimmerIds.length > 0) {
        const { error: deleteOtherError } = await supabaseServer
          .from("session_swimmers")
          .delete()
          .in("swimmer_id", uniqueSwimmerIds)
          .neq("session_id", sessionId);

        if (deleteOtherError) {
          return NextResponse.json(
            {
              error: deleteOtherError.message,
            },
            { status: 500 },
          );
        }
      }

      // Remove all existing relationships for this session
      const { error: deleteError } = await supabaseServer
        .from("session_swimmers")
        .delete()
        .eq("session_id", sessionId);

      if (deleteError) {
        // Restore other-session assignments on failure
        if (otherSessionAssignments && otherSessionAssignments.length > 0) {
          await supabaseServer.from("session_swimmers").insert(otherSessionAssignments);
        }

        return NextResponse.json(
          {
            error: deleteError.message,
          },
          { status: 500 },
        );
      }

      // Create new relationships if any swimmer_ids are provided
      if (uniqueSwimmerIds.length > 0) {
        const relationshipRows = uniqueSwimmerIds.map((swimmerId) => ({
          session_id: sessionId,
          swimmer_id: swimmerId,
        }));

        const { error: insertError } = await supabaseServer
          .from("session_swimmers")
          .insert(relationshipRows);

        if (insertError) {
          // Restore previous relationships for this session on failure
          if (existingRelationships && existingRelationships.length > 0) {
            const restoreRows = existingRelationships.map((r) => ({
              session_id: sessionId,
              swimmer_id: r.swimmer_id,
            }));
            await supabaseServer.from("session_swimmers").insert(restoreRows);
          }

          // Restore other-session assignments on failure
          if (otherSessionAssignments && otherSessionAssignments.length > 0) {
            await supabaseServer.from("session_swimmers").insert(otherSessionAssignments);
          }

          return NextResponse.json(
            {
              error: insertError.message,
            },
            { status: 500 },
          );
        }
      }
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
      // Preserve existing schedules before replacing
      const { data: existingSchedules, error: fetchScheduleError } = await supabaseServer
        .from("session_schedules")
        .select("id, day_of_week, start_time, end_time")
        .eq("session_id", sessionId);

      if (fetchScheduleError) {
        return NextResponse.json(
          {
            error: fetchScheduleError.message,
          },
          { status: 500 },
        );
      }

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

      // If it is recurring, recreate its current schedules
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
          // Restore previous schedules on failure
          if (existingSchedules && existingSchedules.length > 0) {
            const restoreRows = existingSchedules.map((s) => ({
              session_id: sessionId,
              day_of_week: s.day_of_week,
              start_time: s.start_time,
              end_time: s.end_time,
            }));
            await supabaseServer.from("session_schedules").insert(restoreRows);
          }

          return NextResponse.json(
            {
              error: insertScheduleError.message,
            },
            { status: 500 },
          );
        }
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
