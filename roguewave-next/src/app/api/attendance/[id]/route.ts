import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  VALID_SESSION_STATUSES,
  VALID_COACH_STATUSES,
  isPositiveNumber,
  normalizeAttendanceRecord,
  getAssignedSwimmers,
  buildRestoreRows,
  type Session,
  type AttendanceRecordRow,
} from "@/lib/attendance-helpers";

/* =========================
   GET /api/attendance/[id]
   ========================= */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attendanceId = Number(id);

  if (!isPositiveNumber(attendanceId)) {
    return NextResponse.json(
      { error: "Invalid attendance ID." },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseServer
    .from("attendance_records")
    .select(
      `
      *,
      attendance_swimmers (
        id,
        swimmer_id,
        swimmer_name,
        attendance_status
      )
      `,
    )
    .eq("id", attendanceId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Attendance record not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    record: normalizeAttendanceRecord(data as AttendanceRecordRow),
  });
}

/* =========================
   PATCH /api/attendance/[id]
   ========================= */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attendanceId = Number(id);

  if (!isPositiveNumber(attendanceId)) {
    return NextResponse.json(
      { error: "Invalid attendance ID." },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();

    const { location, session_status, coach_status, present_swimmer_ids } = body;

    /* -------------------------
       Validate fields if provided
       ------------------------- */

    if (location !== undefined && location !== null && typeof location !== "string") {
      return NextResponse.json(
        { error: "location must be a string or null." },
        { status: 400 },
      );
    }

    if (
      session_status !== undefined &&
      !VALID_SESSION_STATUSES.includes(
        session_status as (typeof VALID_SESSION_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid session_status." },
        { status: 400 },
      );
    }

    if (
      coach_status !== undefined &&
      coach_status !== null &&
      !VALID_COACH_STATUSES.includes(
        coach_status as (typeof VALID_COACH_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Invalid coach_status." },
        { status: 400 },
      );
    }

    if (present_swimmer_ids !== undefined) {
      if (!Array.isArray(present_swimmer_ids)) {
        return NextResponse.json(
          { error: "present_swimmer_ids must be an array." },
          { status: 400 },
        );
      }

      const allValid = present_swimmer_ids.every((pid) => isPositiveNumber(pid));
      if (!allValid) {
        return NextResponse.json(
          { error: "present_swimmer_ids must contain only positive numbers." },
          { status: 400 },
        );
      }
    }

    /* -------------------------
       Fetch existing attendance record
       ------------------------- */

    const { data: existingRecord, error: fetchError } = await supabaseServer
      .from("attendance_records")
      .select(
        `
        *,
        attendance_swimmers (
          id,
          swimmer_id,
          swimmer_name,
          attendance_status
        )
        `,
      )
      .eq("id", attendanceId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Attendance record not found." },
        { status: 404 },
      );
    }

    const typedExisting = existingRecord as AttendanceRecordRow;

    /* -------------------------
       Load the linked session
       ------------------------- */

    const { data: session, error: sessionError } = await supabaseServer
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
      .eq("id", typedExisting.session_id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const typedSession = session as Session;

    /* -------------------------
       Role-based logic
       ------------------------- */

    const isHeadCoach = typedSession.role === "Head Coach";
    const isAssistantCoach = typedSession.role === "Assistant Coach";

    if (!isHeadCoach && !isAssistantCoach) {
      return NextResponse.json(
        { error: "Session has an unrecognised role." },
        { status: 400 },
      );
    }

    // Determine final values
    let finalLocation = typedExisting.location;
    let finalSessionStatus = typedExisting.session_status;
    let finalCoachStatus = typedExisting.coach_status;

    if (location !== undefined) {
      finalLocation = location;
    }

    if (isHeadCoach) {
      finalCoachStatus = null;
      if (session_status !== undefined) {
        finalSessionStatus = session_status;
      }
    } else {
      finalSessionStatus = "normal";
      if (coach_status !== undefined) {
        finalCoachStatus = coach_status;
      }
    }

    /* -------------------------
       Determine swimmer row operations
       ------------------------- */

    const wasNormal = typedExisting.session_status === "normal";
    const willBeNormal = finalSessionStatus === "normal";
    const hasExplicitPresentIds = present_swimmer_ids !== undefined;

    // Case 1: Head Coach, staying normal, no explicit present_swimmer_ids
    // -> preserve existing swimmer rows exactly
    const shouldPreserveSwimmers =
      isHeadCoach && wasNormal && willBeNormal && !hasExplicitPresentIds;

    // Case 2: Head Coach, transitioning non-normal -> normal
    // -> require explicit present_swimmer_ids, use current session assignments
    const isTransitioningToNormal = isHeadCoach && !wasNormal && willBeNormal;

    if (isTransitioningToNormal && !hasExplicitPresentIds) {
      return NextResponse.json(
        {
          error:
            "present_swimmer_ids must be provided when transitioning from cancelled/no_session/holiday back to normal.",
        },
        { status: 400 },
      );
    }

    // Case 3: Head Coach, normal -> non-normal -> remove swimmer rows
    const shouldRemoveSwimmers = isHeadCoach && wasNormal && !willBeNormal;

    // Case 4: Head Coach, staying normal, explicit present_swimmer_ids
    // -> rebuild from HISTORICAL roster (existing attendance_swimmers)
    const shouldRebuildSwimmers =
      isHeadCoach && wasNormal && willBeNormal && hasExplicitPresentIds;

    // Case 5: Assistant Coach -> always remove stale swimmer rows
    const shouldCleanupAssistant = isAssistantCoach;

    /* -------------------------
       Validate present_swimmer_ids and determine roster
       ------------------------- */

    let uniquePresentIds: number[] = [];
    let rosterSwimmers: { id: number | null; name: string; level: string; existingStatus: string }[] = [];

    if (shouldRebuildSwimmers) {
      // Use HISTORICAL roster from existing attendance_swimmers
      const historicalRoster = (typedExisting.attendance_swimmers ?? []).filter(
        (s) => s.swimmer_id !== null,
      );

      const historicalIds = historicalRoster.map((s) => s.swimmer_id as number);

      uniquePresentIds = [...new Set(present_swimmer_ids as number[])];

      // Validate against historical roster (non-null swimmer_ids only)
      const invalidIds = uniquePresentIds.filter(
        (pid) => !historicalIds.includes(pid),
      );

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `present_swimmer_ids contains IDs not in the historical attendance roster: ${invalidIds.join(", ")}.`,
          },
          { status: 400 },
        );
      }

      // Build roster from historical rows, preserving null swimmer_id
      rosterSwimmers = (typedExisting.attendance_swimmers ?? []).map((s) => ({
        id: s.swimmer_id,
        name: s.swimmer_name,
        level: "",
        existingStatus: s.attendance_status,
      }));
    } else if (isTransitioningToNormal) {
      // Use CURRENT session assignments
      const assignedSwimmers = getAssignedSwimmers(typedSession);
      const assignedSwimmerIds = assignedSwimmers.map((s) => s.id);

      uniquePresentIds = [...new Set(present_swimmer_ids as number[])];

      const invalidIds = uniquePresentIds.filter(
        (pid) => !assignedSwimmerIds.includes(pid),
      );

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `present_swimmer_ids contains IDs not assigned to this session: ${invalidIds.join(", ")}.`,
          },
          { status: 400 },
        );
      }

      rosterSwimmers = assignedSwimmers.map((s) => ({
        ...s,
        existingStatus: "",
      }));
    }

    /* -------------------------
       Preserve old data for rollback
       ------------------------- */

    const oldRecordValues = {
      location: typedExisting.location,
      session_status: typedExisting.session_status,
      coach_status: typedExisting.coach_status,
    };

    const oldSwimmerRows = buildRestoreRows(
      typedExisting.attendance_swimmers ?? [],
      attendanceId,
    );

    /* -------------------------
       Update attendance record
       ------------------------- */

    const { error: updateError } = await supabaseServer
      .from("attendance_records")
      .update({
        location: finalLocation,
        session_status: finalSessionStatus,
        coach_status: finalCoachStatus,
      })
      .eq("id", attendanceId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    /* -------------------------
       Handle swimmer row changes
       ------------------------- */

    if (shouldPreserveSwimmers) {
      // Do nothing - preserve existing swimmer rows exactly
    } else if (shouldRemoveSwimmers) {
      const { error: deleteSwimmersError } = await supabaseServer
        .from("attendance_swimmers")
        .delete()
        .eq("attendance_id", attendanceId);

      if (deleteSwimmersError) {
        await supabaseServer
          .from("attendance_records")
          .update(oldRecordValues)
          .eq("id", attendanceId);

        return NextResponse.json(
          { error: deleteSwimmersError.message },
          { status: 500 },
        );
      }
    } else if (shouldRebuildSwimmers) {
      // Delete existing swimmer rows
      const { error: deleteSwimmersError } = await supabaseServer
        .from("attendance_swimmers")
        .delete()
        .eq("attendance_id", attendanceId);

      if (deleteSwimmersError) {
        await supabaseServer
          .from("attendance_records")
          .update(oldRecordValues)
          .eq("id", attendanceId);

        return NextResponse.json(
          { error: deleteSwimmersError.message },
          { status: 500 },
        );
      }

      // Insert new swimmer rows from historical roster
      if (rosterSwimmers.length > 0) {
        const newSwimmerRows = rosterSwimmers.map((swimmer) => ({
          attendance_id: attendanceId,
          swimmer_id: swimmer.id,
          swimmer_name: swimmer.name,
          attendance_status:
            swimmer.id !== null
              ? uniquePresentIds.includes(swimmer.id) ? "present" : "absent"
              : swimmer.existingStatus,
        }));

        const { error: insertSwimmersError } = await supabaseServer
          .from("attendance_swimmers")
          .insert(newSwimmerRows);

        if (insertSwimmersError) {
          await supabaseServer
            .from("attendance_records")
            .update(oldRecordValues)
            .eq("id", attendanceId);

          if (oldSwimmerRows.length > 0) {
            await supabaseServer
              .from("attendance_swimmers")
              .insert(oldSwimmerRows);
          }

          return NextResponse.json(
            { error: insertSwimmersError.message },
            { status: 500 },
          );
        }
      }
    } else if (isTransitioningToNormal) {
      // Insert swimmer rows from current session assignments
      if (rosterSwimmers.length > 0) {
        const newSwimmerRows = rosterSwimmers.map((swimmer) => ({
          attendance_id: attendanceId,
          swimmer_id: swimmer.id,
          swimmer_name: swimmer.name,
          attendance_status:
            swimmer.id !== null && uniquePresentIds.includes(swimmer.id)
              ? "present"
              : "absent",
        }));

        const { error: insertSwimmersError } = await supabaseServer
          .from("attendance_swimmers")
          .insert(newSwimmerRows);

        if (insertSwimmersError) {
          await supabaseServer
            .from("attendance_records")
            .update(oldRecordValues)
            .eq("id", attendanceId);

          return NextResponse.json(
            { error: insertSwimmersError.message },
            { status: 500 },
          );
        }
      }
    } else if (shouldCleanupAssistant) {
      // Assistant Coach: remove any stale swimmer rows
      const { error: deleteSwimmersError } = await supabaseServer
        .from("attendance_swimmers")
        .delete()
        .eq("attendance_id", attendanceId);

      if (deleteSwimmersError) {
        await supabaseServer
          .from("attendance_records")
          .update(oldRecordValues)
          .eq("id", attendanceId);

        return NextResponse.json(
          { error: deleteSwimmersError.message },
          { status: 500 },
        );
      }
    }

    /* -------------------------
       Fetch and return updated record
       ------------------------- */

    const { data: updatedRecord, error: fetchUpdatedError } = await supabaseServer
      .from("attendance_records")
      .select(
        `
        *,
        attendance_swimmers (
          id,
          swimmer_id,
          swimmer_name,
          attendance_status
        )
        `,
      )
      .eq("id", attendanceId)
      .maybeSingle();

    if (fetchUpdatedError) {
      return NextResponse.json(
        { error: fetchUpdatedError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Attendance updated successfully.",
      record: normalizeAttendanceRecord(updatedRecord as AttendanceRecordRow),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
