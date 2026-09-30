import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import {
  VALID_SESSION_STATUSES,
  VALID_COACH_STATUSES,
  isValidDateString,
  isPositiveNumber,
  getDayOfWeek,
  getColomboToday,
  normalizeAttendanceRecord,
  getAssignedSwimmers,
  type Session,
  type AttendanceRecordRow,
} from "@/lib/attendance-helpers";

/* =========================
   GET /api/attendance
   ========================= */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionIdParam = searchParams.get("session_id");
  const dateParam = searchParams.get("date");

  if (!sessionIdParam || !dateParam) {
    return NextResponse.json(
      { error: "session_id and date query parameters are required." },
      { status: 400 },
    );
  }

  const sessionId = Number(sessionIdParam);

  if (!isPositiveNumber(sessionId)) {
    return NextResponse.json(
      { error: "session_id must be a positive number." },
      { status: 400 },
    );
  }

  if (!isValidDateString(dateParam)) {
    return NextResponse.json(
      { error: "date must be a valid YYYY-MM-DD string." },
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
    .eq("session_id", sessionId)
    .eq("attendance_date", dateParam)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ record: null });
  }

  return NextResponse.json({
    record: normalizeAttendanceRecord(data as AttendanceRecordRow),
  });
}

/* =========================
   POST /api/attendance
   ========================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      session_id,
      attendance_date,
      location,
      session_status,
      coach_status,
      present_swimmer_ids,
    } = body;

    /* -------------------------
       Basic validation
       ------------------------- */

    if (!isPositiveNumber(session_id)) {
      return NextResponse.json(
        { error: "session_id must be a positive number." },
        { status: 400 },
      );
    }

    if (!isValidDateString(attendance_date)) {
      return NextResponse.json(
        { error: "attendance_date must be a valid YYYY-MM-DD string." },
        { status: 400 },
      );
    }

    if (
      !session_status ||
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

    if (location !== null && typeof location !== "string") {
      return NextResponse.json(
        { error: "location must be a string or null." },
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

      const allValid = present_swimmer_ids.every((id) => isPositiveNumber(id));
      if (!allValid) {
        return NextResponse.json(
          { error: "present_swimmer_ids must contain only positive numbers." },
          { status: 400 },
        );
      }
    }

    /* -------------------------
       Reject future dates (Asia/Colombo)
       ------------------------- */

    const todayStr = getColomboToday();

    if (attendance_date > todayStr) {
      return NextResponse.json(
        { error: "Attendance date cannot be in the future." },
        { status: 400 },
      );
    }

    /* -------------------------
       Load the real session
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
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const typedSession = session as Session;

    /* -------------------------
       Date validation against schedule
       ------------------------- */

    if (typedSession.session_type === "recurring") {
      const dayOfWeek = getDayOfWeek(attendance_date);
      const isScheduled = typedSession.session_schedules.some(
        (s) => s.day_of_week === dayOfWeek,
      );

      if (!isScheduled) {
        return NextResponse.json(
          {
            error:
              "Attendance date does not match any scheduled day for this recurring session.",
          },
          { status: 400 },
        );
      }
    } else if (typedSession.session_type === "once") {
      if (attendance_date !== typedSession.session_date) {
        return NextResponse.json(
          { error: "Attendance date must match the one-off session date." },
          { status: 400 },
        );
      }
    }

    /* -------------------------
       Check for duplicate
       ------------------------- */

    const { data: existingRecord, error: duplicateCheckError } =
      await supabaseServer
        .from("attendance_records")
        .select("id")
        .eq("session_id", session_id)
        .eq("attendance_date", attendance_date)
        .maybeSingle();

    if (duplicateCheckError) {
      return NextResponse.json(
        { error: duplicateCheckError.message },
        { status: 500 },
      );
    }

    if (existingRecord) {
      return NextResponse.json(
        {
          error:
            "Attendance has already been marked for this session and date.",
        },
        { status: 409 },
      );
    }

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

    let finalCoachStatus: string | null = null;
    let finalSessionStatus: string = session_status;

    if (isHeadCoach) {
      finalCoachStatus = null;
    } else {
      finalCoachStatus = coach_status;
      finalSessionStatus = "normal";
    }

    /* -------------------------
       Validate present_swimmer_ids for Head Coach
       ------------------------- */

    let uniquePresentIds: number[] = [];

    if (isHeadCoach && session_status === "normal") {
      // Require explicit present_swimmer_ids for Head Coach normal attendance
      if (present_swimmer_ids === undefined) {
        return NextResponse.json(
          { error: "present_swimmer_ids is required for Head Coach normal attendance." },
          { status: 400 },
        );
      }

      const assignedSwimmers = getAssignedSwimmers(typedSession);
      const assignedSwimmerIds = assignedSwimmers.map((s) => s.id);

      uniquePresentIds = [...new Set(present_swimmer_ids as number[])];

      const invalidIds = uniquePresentIds.filter(
        (id) => !assignedSwimmerIds.includes(id),
      );

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `present_swimmer_ids contains IDs not assigned to this session: ${invalidIds.join(", ")}.`,
          },
          { status: 400 },
        );
      }
    }

    /* -------------------------
       Create attendance record
       ------------------------- */

    const { data: newRecord, error: insertError } = await supabaseServer
      .from("attendance_records")
      .insert({
        session_id,
        attendance_date,
        location: location ?? null,
        session_status: finalSessionStatus,
        coach_status: finalCoachStatus,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    /* -------------------------
       Create swimmer attendance rows (Head Coach + normal only)
       ------------------------- */

    if (isHeadCoach && session_status === "normal") {
      const assignedSwimmers = getAssignedSwimmers(typedSession);

      const swimmerRows = assignedSwimmers.map((swimmer) => ({
        attendance_id: newRecord.id,
        swimmer_id: swimmer.id,
        swimmer_name: swimmer.name,
        attendance_status: uniquePresentIds.includes(swimmer.id)
          ? "present"
          : "absent",
      }));

      if (swimmerRows.length > 0) {
        const { error: swimmerInsertError } = await supabaseServer
          .from("attendance_swimmers")
          .insert(swimmerRows);

        if (swimmerInsertError) {
          await supabaseServer
            .from("attendance_records")
            .delete()
            .eq("id", newRecord.id);

          return NextResponse.json(
            { error: swimmerInsertError.message },
            { status: 500 },
          );
        }
      }
    }

    /* -------------------------
       Fetch and return the full record
       ------------------------- */

    const { data: fullRecord, error: fetchError } = await supabaseServer
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
      .eq("id", newRecord.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message: "Attendance created successfully.",
        record: normalizeAttendanceRecord(fullRecord as AttendanceRecordRow),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
