import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const validLevels = ["Beginner", "Intermediate", "Advanced"];

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

  return NextResponse.json(data);
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
