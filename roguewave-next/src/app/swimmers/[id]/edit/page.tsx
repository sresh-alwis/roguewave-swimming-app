"use client";

import Link from "next/link";

import { useEffect, useState } from "react";

import { useParams, useRouter } from "next/navigation";

type Level = "Beginner" | "Intermediate" | "Advanced";

type ApiSwimmer = {
  id: number;
  name: string;
  level: string;
  date_of_birth: string | null;
  date_joined: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  notes: string | null;
};

export default function EditSwimmerPage() {
  const params = useParams<{
    id: string;
  }>();

  const router = useRouter();

  const swimmerId = params.id;

  const [name, setName] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [dateJoined, setDateJoined] = useState("");

  const [level, setLevel] = useState<Level>("Beginner");

  const [heightFeet, setHeightFeet] = useState("");

  const [heightInches, setHeightInches] = useState("");

  const [weight, setWeight] = useState("");

  const [extraDetails, setExtraDetails] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  /* =========================
     LOAD SWIMMER
  ========================= */

  useEffect(() => {
    async function loadSwimmer() {
      try {
        const response = await fetch(`/api/swimmers/${swimmerId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load swimmer.");
        }

        const swimmer = data as ApiSwimmer;

        setName(swimmer.name);

        setDateOfBirth(swimmer.date_of_birth || "");

        setDateJoined(swimmer.date_joined || "");

        if (swimmer.level === "Intermediate" || swimmer.level === "Advanced") {
          setLevel(swimmer.level);
        } else {
          setLevel("Beginner");
        }

        if (swimmer.height_cm !== null) {
          const { feet, inches } = convertCmToFeetInches(swimmer.height_cm);

          setHeightFeet(feet.toString());

          setHeightInches(inches.toString());
        }

        if (swimmer.weight_kg !== null) {
          setWeight(swimmer.weight_kg.toString());
        }

        setExtraDetails(swimmer.notes || "");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load swimmer.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (swimmerId) {
      loadSwimmer();
    }
  }, [swimmerId]);

  /* =========================
     UPDATE SWIMMER
  ========================= */

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please enter the swimmer's name.");
      return;
    }

    if (!dateOfBirth) {
      alert("Please enter the date of birth.");
      return;
    }

    if (!dateJoined) {
      alert("Please enter the date joined.");
      return;
    }

    if (dateJoined < dateOfBirth) {
      alert("Date Joined cannot be before the swimmer's date of birth.");
      return;
    }

    const feet = Number(heightFeet);

    const inches = Number(heightInches);

    const swimmerWeight = Number(weight);

    if (!heightFeet || feet < 1 || feet > 8) {
      alert("Please enter a valid height in feet.");
      return;
    }

    if (heightInches === "" || inches < 0 || inches > 11) {
      alert("Height inches must be between 0 and 11.");
      return;
    }

    if (!weight || swimmerWeight <= 0 || swimmerWeight > 300) {
      alert("Please enter a valid weight.");
      return;
    }

    const heightCm = Math.round((feet * 30.48 + inches * 2.54) * 10) / 10;

    try {
      setSaving(true);

      const response = await fetch(`/api/swimmers/${swimmerId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: name.trim(),

          level,

          date_of_birth: dateOfBirth,

          date_joined: dateJoined,

          height_cm: heightCm,

          weight_kg: swimmerWeight,

          notes: extraDetails.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update swimmer.");
      }

      alert("Swimmer updated successfully.");

      router.push(`/swimmers/${swimmerId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update swimmer.");
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <main style={pageStyle}>
        <section style={formCardStyle}>
          <p>Loading swimmer...</p>
        </section>
      </main>
    );
  }

  /* =========================
     ERROR
  ========================= */

  if (error) {
    return (
      <main style={pageStyle}>
        <section style={formCardStyle}>
          <h1>Swimmer not found</h1>

          <p style={subtitleStyle}>{error}</p>

          <Link href="/swimmers" style={buttonLinkStyle}>
            Back to Swimmers
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={formCardStyle}>
        {/* Heading */}

        <div style={headingStyle}>
          <h1
            style={{
              margin: 0,
            }}
          >
            Edit Swimmer
          </h1>

          <p style={subtitleStyle}>
            Update {name}
            &apos;s profile information.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Personal Details */}

          <div>
            <h2 style={sectionTitleStyle}>Personal Details</h2>

            <div style={sectionGridStyle}>
              <label style={fullWidthStyle}>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={dateJoined || undefined}
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                Date Joined
                <input
                  type="date"
                  value={dateJoined}
                  onChange={(e) => setDateJoined(e.target.value)}
                  min={dateOfBirth || undefined}
                  required
                  style={inputStyle}
                />
              </label>

              <label style={fullWidthStyle}>
                Swimming Level
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  required
                  style={inputStyle}
                >
                  <option value="Beginner">Beginner</option>

                  <option value="Intermediate">Intermediate</option>

                  <option value="Advanced">Advanced</option>
                </select>
              </label>
            </div>
          </div>

          {/* Measurements */}

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Measurements</h2>

            <div style={measurementGridStyle}>
              <label>
                Height - Feet
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                Height - Inches
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                Weight (kg)
                <input
                  type="number"
                  min="1"
                  max="300"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* Training Details */}

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Training Details</h2>

            <p style={helperTextStyle}>
              Session assignment will be connected in the next step.
            </p>

            <label>
              Extra Details <span style={optionalStyle}>(Optional)</span>
              <textarea
                rows={4}
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="Optional training notes or other information..."
                style={textareaStyle}
              />
            </label>
          </div>

          {/* Actions */}

          <div style={buttonRowStyle}>
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,

                opacity: saving ? 0.6 : 1,

                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Updating..." : "Update Swimmer"}
            </button>

            <button
              type="button"
              disabled={saving}
              style={closeButtonStyle}
              onClick={() => router.push(`/swimmers/${swimmerId}`)}
            >
              Close
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/* =========================
   HELPERS
========================= */

function convertCmToFeetInches(heightCm: number) {
  const totalInches = heightCm / 2.54;

  let feet = Math.floor(totalInches / 12);

  let inches = Math.round(totalInches - feet * 12);

  if (inches === 12) {
    feet += 1;
    inches = 0;
  }

  return {
    feet,
    inches,
  };
}

/* =========================
   STYLES
========================= */

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 40px)",
  fontFamily: "Arial, sans-serif",
};

const formCardStyle = {
  maxWidth: "800px",
  margin: "0 auto",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 30px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const headingStyle = {
  marginBottom: "30px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "20px",
};

const sectionStyle = {
  paddingTop: "22px",
  borderTop: "1px solid var(--border)",
};

const sectionTitleStyle = {
  margin: "0 0 18px 0",
  fontSize: "20px",
};

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
};

const fullWidthStyle = {
  gridColumn: "1 / -1",
};

const measurementGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "18px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px",
  marginTop: "6px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "5px",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};

const optionalStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const helperTextStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
  margin: "0 0 18px 0",
};

const buttonRowStyle = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap" as const,
  paddingTop: "22px",
  borderTop: "1px solid var(--border)",
};

const buttonStyle = {
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  border: "none",
  borderRadius: "6px",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
};

const closeButtonStyle = {
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  padding: "10px 20px",
  cursor: "pointer",
  fontWeight: "bold",
};

const buttonLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--button)",
  color: "var(--button-text)",
  padding: "10px 18px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};
