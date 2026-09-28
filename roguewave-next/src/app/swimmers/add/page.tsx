"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SwimmingLevel = "" | "Beginner" | "Intermediate" | "Advanced";

export default function AddSwimmerPage() {
  const router = useRouter();

  const [name, setName] = useState("");

  const [dateOfBirth, setDateOfBirth] = useState("");

  const [dateJoined, setDateJoined] = useState("");

  const [level, setLevel] = useState<SwimmingLevel>("");

  const [heightFeet, setHeightFeet] = useState("");

  const [heightInches, setHeightInches] = useState("");

  const [weight, setWeight] = useState("");

  const [assignedSession, setAssignedSession] = useState("");

  const [extraDetails, setExtraDetails] = useState("");

  const [saving, setSaving] = useState(false);

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
      alert("Date joined cannot be before the date of birth.");
      return;
    }

    if (!level) {
      alert("Please select a swimming level.");
      return;
    }

    const feet = Number(heightFeet);

    const inches = Number(heightInches);

    const swimmerWeight = Number(weight);

    if (!heightFeet || feet < 1 || feet > 8) {
      alert("Height feet must be between 1 and 8.");
      return;
    }

    if (heightInches === "" || inches < 0 || inches > 11) {
      alert("Height inches must be between 0 and 11.");
      return;
    }

    if (!weight || swimmerWeight <= 0 || swimmerWeight > 300) {
      alert("Please enter a valid weight between 0 and 300 kg.");
      return;
    }

    /*
      Convert feet/inches to cm
      before storing in database.
    */

    const heightCm = Math.round((feet * 30.48 + inches * 2.54) * 10) / 10;

    try {
      setSaving(true);

      const response = await fetch("/api/swimmers", {
        method: "POST",

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
        throw new Error(data.error || "Failed to create swimmer.");
      }

      if (assignedSession) {
        alert(
          "Swimmer saved successfully. Session assignment will be connected next.",
        );
      } else {
        alert("Swimmer saved successfully.");
      }

      router.push("/swimmers");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create swimmer.",
      );
    } finally {
      setSaving(false);
    }
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
            Add Swimmer
          </h1>

          <p style={subtitleStyle}>Add a swimmer and their coaching details.</p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Personal Details */}

          <div>
            <h2 style={sectionTitleStyle}>Personal Details</h2>

            <div style={fieldGridStyle}>
              <label>
                Full Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Swimmer name"
                  required
                  style={inputStyle}
                />
              </label>

              <label>
                Swimming Level
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as SwimmingLevel)}
                  required
                  style={inputStyle}
                >
                  <option value="">Select Level</option>

                  <option value="Beginner">Beginner</option>

                  <option value="Intermediate">Intermediate</option>

                  <option value="Advanced">Advanced</option>
                </select>
              </label>

              <label>
                Date of Birth
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
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
                  required
                  style={inputStyle}
                />
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
                  placeholder="Example: 5"
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
                  placeholder="Example: 6"
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
                  placeholder="Example: 45"
                  required
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          {/* Coaching Details */}

          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Coaching Details</h2>

            <label>
              Assigned Session
              <select
                value={assignedSession}
                onChange={(e) => setAssignedSession(e.target.value)}
                style={inputStyle}
              >
                <option value="">No Session Assigned</option>

                <option value="RogueWave Learn to Swim">
                  RogueWave Learn to Swim
                </option>
              </select>
            </label>

            <p style={helperTextStyle}>
              Session assignment will be connected to the database next.
            </p>

            <label style={detailsLabelStyle}>
              Extra Details
              <textarea
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder="Optional coaching notes or other information..."
                rows={4}
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
              {saving ? "Saving..." : "Save Swimmer"}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => router.push("/swimmers")}
              style={closeButtonStyle}
            >
              Close
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  padding: "clamp(20px, 4vw, 40px)",
  fontFamily: "Arial, sans-serif",
};

const formCardStyle = {
  maxWidth: "900px",
  margin: "0 auto",
  padding: "clamp(20px, 4vw, 30px)",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
};

const headingStyle = {
  marginBottom: "30px",
};

const subtitleStyle = {
  margin: "6px 0 0 0",
  color: "var(--secondary-text)",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "25px",
};

const sectionStyle = {
  paddingTop: "22px",
  borderTop: "1px solid var(--border)",
};

const sectionTitleStyle = {
  margin: "0 0 18px 0",
};

const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "18px",
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

const helperTextStyle = {
  margin: "8px 0 0 0",
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const detailsLabelStyle = {
  display: "block",
  marginTop: "18px",
};

const textareaStyle = {
  ...inputStyle,
  resize: "vertical" as const,
};

const buttonRowStyle = {
  display: "flex",
  gap: "15px",
  flexWrap: "wrap" as const,
  paddingTop: "5px",
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
