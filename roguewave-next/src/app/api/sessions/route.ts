import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ScheduleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/* =========================
   GET ALL SESSIONS
========================= */

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
    .order("id", {
      ascending: true,
    });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }

  return NextResponse.json(data);
}

/* =========================
   CREATE SESSION
========================= */

export async function POST(request: Request) {
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

    /* -------------------------
       Basic validation
    ------------------------- */

    if (!name?.trim() || !role || !session_type) {
      return NextResponse.json(
        {
          error: "Missing required session details.",
        },
        {
          status: 400,
        },
      );
    }

    if (session_type !== "recurring" && session_type !== "once") {
      return NextResponse.json(
        {
          error: "Invalid session type.",
        },
        {
          status: 400,
        },
      );
    }

    if (role !== "Head Coach" && role !== "Assistant Coach") {
      return NextResponse.json(
        {
          error: "Invalid coaching role.",
        },
        {
          status: 400,
        },
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
          {
            status: 400,
          },
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
            {
              status: 400,
            },
          );
        }

        if (schedule.start_time >= schedule.end_time) {
          return NextResponse.json(
            {
              error: "Schedule end time must be after start time.",
            },
            {
              status: 400,
            },
          );
        }
      }

      const selectedDays = typedSchedules.map(
        (schedule) => schedule.day_of_week,
      );

      if (new Set(selectedDays).size !== selectedDays.length) {
        return NextResponse.json(
          {
            error: "The same schedule day cannot be added twice.",
          },
          {
            status: 400,
          },
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
          {
            status: 400,
          },
        );
      }

      if (start_time >= end_time) {
        return NextResponse.json(
          {
            error: "End time must be after start time.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =========================
       CREATE SESSION
    ========================= */

    const { data: session, error: sessionError } = await supabaseServer
      .from("sessions")
      .insert({
        name: name.trim(),

        role,

        session_type,

        default_location: default_location || null,

        session_date: session_type === "once" ? session_date : null,

        start_time: session_type === "once" ? start_time : null,

        end_time: session_type === "once" ? end_time : null,
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        {
          error: sessionError.message,
        },
        {
          status: 500,
        },
      );
    }

    /* =========================
       CREATE RECURRING SCHEDULES
    ========================= */

    if (
      session_type === "recurring" &&
      Array.isArray(schedules) &&
      schedules.length > 0
    ) {
      const scheduleRows = (schedules as ScheduleInput[]).map((schedule) => ({
        session_id: session.id,

        day_of_week: schedule.day_of_week,

        start_time: schedule.start_time,

        end_time: schedule.end_time,
      }));

      const { error: scheduleError } = await supabaseServer
        .from("session_schedules")
        .insert(scheduleRows);

      if (scheduleError) {
        // Remove the session again
        // if its schedule creation failed.
        await supabaseServer.from("sessions").delete().eq("id", session.id);

        return NextResponse.json(
          {
            error: scheduleError.message,
          },
          {
            status: 500,
          },
        );
      }
    }

    /* =========================
       CREATE SWIMMER RELATIONSHIPS
    ========================= */

    /*
       If swimmer_ids is supplied, create session-swimmer assignments.
       This is done after the session and schedules are created to handle
       cleanup properly if the relationship creation fails.

       Many-to-many: swimmers can belong to multiple sessions.
       We only create assignments for THIS session and do NOT touch
       assignments in other sessions.
    */

    if (Array.isArray(swimmer_ids) && swimmer_ids.length > 0) {
        // Validate that all swimmer IDs are valid numbers
        const allValidNumbers = swimmer_ids.every(
          (id) => typeof id === "number" && Number.isFinite(id) && id > 0,
        );

        if (!allValidNumbers) {
          // Clean up the session and schedules
          await supabaseServer.from("session_schedules").delete().eq("session_id", session.id);
          await supabaseServer.from("sessions").delete().eq("id", session.id);

          return NextResponse.json(
            {
              error: "swimmer_ids must be an array of valid numeric IDs.",
            },
            {
              status: 400,
            },
          );
        }

        // Deduplicate swimmer IDs
        const uniqueSwimmerIds = [...new Set(swimmer_ids)];

        // Fetch existing assignments for THIS session to avoid duplicates
        const { data: existingAssignments, error: fetchExistingError } = await supabaseServer
          .from("session_swimmers")
          .select("swimmer_id")
          .eq("session_id", session.id);

        if (fetchExistingError) {
          // Clean up the session and schedules
          await supabaseServer.from("session_schedules").delete().eq("session_id", session.id);
          await supabaseServer.from("sessions").delete().eq("id", session.id);

          return NextResponse.json(
            {
              error: fetchExistingError.message,
            },
            {
              status: 500,
            },
          );
        }

        // Filter out swimmers already assigned to this session
        const existingSwimmerIds = new Set(
          (existingAssignments || []).map((a) => a.swimmer_id),
        );
        const newSwimmerIds = uniqueSwimmerIds.filter(
          (id) => !existingSwimmerIds.has(id),
        );

        if (newSwimmerIds.length > 0) {
          const relationshipRows = newSwimmerIds.map((swimmerId) => ({
            session_id: session.id,
            swimmer_id: swimmerId,
          }));

          const { error: insertError } = await supabaseServer
            .from("session_swimmers")
            .insert(relationshipRows);

          if (insertError) {
            // Clean up the session and schedules if relationship creation fails
            await supabaseServer.from("session_schedules").delete().eq("session_id", session.id);
            await supabaseServer.from("sessions").delete().eq("id", session.id);

            return NextResponse.json(
              {
                error: insertError.message,
              },
              {
                status: 500,
              },
            );
          }
        }
      }

    return NextResponse.json(
      {
        message: "Session created successfully.",

        session,
      },
      {
        status: 201,
      },
    );
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request.",
      },
      {
        status: 400,
      },
    );
  }
}
