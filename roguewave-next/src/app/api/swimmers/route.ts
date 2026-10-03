import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { calculateAttendanceSummary } from "@/lib/attendance-helpers";

const validLevels = ["Beginner", "Intermediate", "Advanced"];

/* =========================
   GET ALL SWIMMERS
========================= */

export async function GET() {
  const { data, error } = await supabaseServer
    .from("swimmers")
    .select("*")
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

  // Calculate sessionsCompleted for each swimmer
  const swimmersWithStats = await Promise.all(
    (data ?? []).map(async (swimmer) => {
      const { data: attendanceRows } = await supabaseServer
        .from("attendance_swimmers")
        .select(
          `
          attendance_status,
          attendance_records (
            session_status
          )
          `,
        )
        .eq("swimmer_id", swimmer.id);

      const summary = calculateAttendanceSummary(
        (attendanceRows ?? []).map((row) => ({
          attendance_status: row.attendance_status,
          session_status: (row.attendance_records as { session_status?: string })?.session_status,
        })),
      );

      return {
        ...swimmer,
        sessionsCompleted: summary.sessions_completed,
      };
    }),
  );

  return NextResponse.json(swimmersWithStats);
}

/* =========================
   CREATE SWIMMER
========================= */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      level,
      date_of_birth,
      date_joined,
      height_cm,
      weight_kg,
      notes,
    } = body;

    /* -------------------------
       Basic validation
    ------------------------- */

    if (!name?.trim()) {
      return NextResponse.json(
        {
          error: "Swimmer name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!level || !validLevels.includes(level)) {
      return NextResponse.json(
        {
          error: "Invalid swimming level.",
        },
        {
          status: 400,
        },
      );
    }

    if (!date_of_birth) {
      return NextResponse.json(
        {
          error: "Date of birth is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!date_joined) {
      return NextResponse.json(
        {
          error: "Date joined is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (date_joined < date_of_birth) {
      return NextResponse.json(
        {
          error: "Date joined cannot be before the date of birth.",
        },
        {
          status: 400,
        },
      );
    }

    const height = Number(height_cm);

    const weight = Number(weight_kg);

    if (!Number.isFinite(height) || height <= 0) {
      return NextResponse.json(
        {
          error: "Please enter a valid height.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(weight) || weight <= 0 || weight > 300) {
      return NextResponse.json(
        {
          error: "Please enter a valid weight.",
        },
        {
          status: 400,
        },
      );
    }

    /* -------------------------
       Insert swimmer
    ------------------------- */

    const { data: swimmer, error } = await supabaseServer
      .from("swimmers")
      .insert({
        name: name.trim(),

        level,

        date_of_birth,

        date_joined,

        height_cm: height,

        weight_kg: weight,

        notes: notes?.trim() || null,
      })
      .select()
      .single();

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

    return NextResponse.json(
      {
        message: "Swimmer created successfully.",

        swimmer,
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
