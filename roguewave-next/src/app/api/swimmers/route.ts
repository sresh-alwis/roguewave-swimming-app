import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

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

  return NextResponse.json(data);
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
      session_id,
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

    /* =========================
       CREATE SESSION RELATIONSHIP
    ========================= */

    /*
       If session_id is provided, create a session-swimmer relationship.
       Note: session_id can be null, in which case we don't create a relationship.
    */

    if (session_id !== undefined && session_id !== null) {
      const sessionId = Number(session_id);

      if (!Number.isNaN(sessionId)) {
        const { error: relationshipError } = await supabaseServer
          .from("session_swimmers")
          .insert({
            session_id: sessionId,
            swimmer_id: swimmer.id,
          });

        if (relationshipError) {
          // Clean up the newly-created swimmer since relationship creation failed
          await supabaseServer.from("swimmers").delete().eq("id", swimmer.id);

          return NextResponse.json(
            {
              error: relationshipError.message,
            },
            {
              status: 500,
            },
          );
        }
      } else {
        // Clean up the newly-created swimmer since session_id is invalid
        await supabaseServer.from("swimmers").delete().eq("id", swimmer.id);

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
