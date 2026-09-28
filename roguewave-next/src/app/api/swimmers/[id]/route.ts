import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const validLevels = ["Beginner", "Intermediate", "Advanced"];

type SessionSwimmerWithSession = {
  swimmer_id: number;
  session_id: number;
  sessions: {
    id: number;
    name: string;
    role: string;
    session_type: string;
    default_location: string | null;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
    session_schedules: { id: number; day_of_week: number; start_time: string; end_time: string }[];
  } | null;
};

/* =========================
   GET ONE SWIMMER
========================= */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const swimmerId = Number(id);

  if (Number.isNaN(swimmerId)) {
    return NextResponse.json(
      {
        error: "Invalid swimmer ID.",
      },
      {
        status: 400,
      },
    );
  }

  const { data, error } = await supabaseServer
    .from("swimmers")
    .select("*")
    .eq("id", swimmerId)
    .maybeSingle();

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

  if (!data) {
    return NextResponse.json(
      {
        error: "Swimmer not found.",
      },
      {
        status: 404,
      },
    );
  }

  // Get assigned session information for this swimmer
  const { data: sessionRelationships, error: sessionRelationshipsError } = await supabaseServer
    .from("session_swimmers")
    .select(
      `sessions (
        id,
        name,
        role,
        session_type,
        default_location,
        session_date,
        start_time,
        end_time,
        session_schedules (
          id,
          day_of_week,
          start_time,
          end_time
        )
      )`
    )
    .eq("swimmer_id", swimmerId);

  if (sessionRelationshipsError) {
    return NextResponse.json({ error: sessionRelationshipsError.message }, { status: 500 });
  }

  // Transform the data to include session information (V1: one session), filtering out null joins
  const enrichedData = {
    ...data,
    session: ((sessionRelationships ?? []) as unknown as SessionSwimmerWithSession[])
      .map((item) => item.sessions)
      .find((session): session is NonNullable<typeof session> => session !== null) || null,
  };

  return NextResponse.json(enrichedData);
}

/* =========================
   UPDATE SWIMMER
========================= */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const swimmerId = Number(id);

  if (Number.isNaN(swimmerId)) {
    return NextResponse.json(
      {
        error: "Invalid swimmer ID.",
      },
      {
        status: 400,
      },
    );
  }

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
      session_id,
    } = body;

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
          error: "Date joined cannot be before date of birth.",
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
          error: "Invalid height.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(weight) || weight <= 0 || weight > 300) {
      return NextResponse.json(
        {
          error: "Invalid weight.",
        },
        {
          status: 400,
        },
      );
    }

    const { data: swimmer, error } = await supabaseServer
      .from("swimmers")
      .update({
        name: name.trim(),
        level,
        date_of_birth,
        date_joined,
        height_cm: height,
        weight_kg: weight,
        notes: notes?.trim() || null,
      })
      .eq("id", swimmerId)
      .select()
      .maybeSingle();

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

    if (!swimmer) {
      return NextResponse.json(
        {
          error: "Swimmer not found.",
        },
        {
          status: 404,
        },
      );
    }

    /* =========================
       HANDLE SESSION RELATIONSHIP
    ========================= */

    /*
       If session_id is supplied, handle session-swimmer assignment.
       For the current V1 UI, we treat this as one selected session:
       - When session_id is provided, remove existing assignments and create new one
       - When session_id is null, leave them with no assigned session
    */

    if (session_id !== undefined) {
        // Validate session_id: must be null or a valid numeric ID
        if (session_id !== null) {
          const sessionId = Number(session_id);
          if (Number.isNaN(sessionId) || !Number.isFinite(sessionId) || sessionId <= 0) {
            return NextResponse.json(
              {
                error: "Invalid session ID provided.",
              },
              {
                status: 400,
              },
            );
          }
        }

        // First, remove all existing relationships for this swimmer
        const { error: deleteError } = await supabaseServer
          .from("session_swimmers")
          .delete()
          .eq("swimmer_id", swimmerId);

        if (deleteError) {
          return NextResponse.json(
            {
              error: deleteError.message,
            },
            {
              status: 500,
            },
          );
        }

        // If session_id is not null, create new relationship (V1: one session)
        if (session_id !== null) {
          const sessionId = Number(session_id);
          const { error: insertError } = await supabaseServer
            .from("session_swimmers")
            .insert({
              session_id: sessionId,
              swimmer_id: swimmerId,
            });

          if (insertError) {
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

    return NextResponse.json({
      message: "Swimmer updated successfully.",

      swimmer,
    });
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

/* =========================
   DELETE SWIMMER
========================= */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const swimmerId = Number(id);

  if (Number.isNaN(swimmerId)) {
    return NextResponse.json(
      {
        error: "Invalid swimmer ID.",
      },
      {
        status: 400,
      },
    );
  }

  const { error } = await supabaseServer
    .from("swimmers")
    .delete()
    .eq("id", swimmerId);

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

  return NextResponse.json({
    message: "Swimmer deleted successfully.",
  });
}
