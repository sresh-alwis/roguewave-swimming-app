"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type Level = "Beginner" | "Intermediate" | "Advanced";

const swimmers = [
  {
    id: 1,
    name: "Isali Rozairo",
    dateOfBirth: "2012-05-10",
    dateJoined: "2026-05-07",
    level: "Beginner" as Level,
    heightFeet: 4,
    heightInches: 8,
    weight: 38,
    session: "roguewave",
    extraDetails: "Working on breathing, body balance and freestyle kick.",
  },
  {
    id: 2,
    name: "Pawani Rozairo",
    dateOfBirth: "2010-08-15",
    dateJoined: "2026-05-07",
    level: "Intermediate" as Level,
    heightFeet: 5,
    heightInches: 1,
    weight: 45,
    session: "roguewave",
    extraDetails: "Working on freestyle technique and breathing.",
  },
  {
    id: 3,
    name: "Swimmer 3",
    dateOfBirth: "2008-03-20",
    dateJoined: "2026-04-15",
    level: "Advanced" as Level,
    heightFeet: 5,
    heightInches: 6,
    weight: 58,
    session: "roguewave",
    extraDetails: "Advanced swimmer training.",
  },
];

export default function EditSwimmerPage() {
  const params = useParams();
  const router = useRouter();

  const swimmerId = Number(params.id);

  const swimmer = swimmers.find((swimmer) => swimmer.id === swimmerId);

  const [name, setName] = useState(swimmer?.name ?? "");

  const [dateOfBirth, setDateOfBirth] = useState(swimmer?.dateOfBirth ?? "");

  const [dateJoined, setDateJoined] = useState(swimmer?.dateJoined ?? "");

  const [level, setLevel] = useState<Level>(swimmer?.level ?? "Beginner");

  const [heightFeet, setHeightFeet] = useState(
    swimmer?.heightFeet.toString() ?? "",
  );

  const [heightInches, setHeightInches] = useState(
    swimmer?.heightInches.toString() ?? "",
  );

  const [weight, setWeight] = useState(swimmer?.weight.toString() ?? "");

  const [assignedSession, setAssignedSession] = useState(
    swimmer?.session ?? "",
  );

  const [extraDetails, setExtraDetails] = useState(swimmer?.extraDetails ?? "");

  if (!swimmer) {
    return (
      <main style={pageStyle}>
        <section style={formCardStyle}>
          <h1>Swimmer not found</h1>

          <Link href="/swimmers" style={buttonLinkStyle}>
            Back to Swimmers
          </Link>
        </section>
      </main>
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please enter the swimmer's name.");
      return;
    }

    if (new Date(dateJoined) < new Date(dateOfBirth)) {
      alert("Date Joined cannot be before the swimmer's date of birth.");
      return;
    }

    const feet = Number(heightFeet);

    const inches = Number(heightInches);

    const swimmerWeight = Number(weight);

    if (feet < 1 || feet > 8) {
      alert("Please enter a valid height in feet.");
      return;
    }

    if (inches < 0 || inches > 11) {
      alert("Height inches must be between 0 and 11.");
      return;
    }

    if (swimmerWeight <= 0 || swimmerWeight > 300) {
      alert("Please enter a valid weight.");
      return;
    }

    alert("Swimmer updated - database will be connected later.");

    router.push(`/swimmers/${swimmerId}`);
  }

  return (
    <main style={pageStyle}>
      <section style={formCardStyle}>
        {/* Heading */}
        <div style={headingStyle}>
          <h1 style={{ margin: 0 }}>Edit Swimmer</h1>

          <p style={subtitleStyle}>
            Update {swimmer.name}&apos;s profile information.
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

          {/* Coaching Details */}
          <div style={sectionStyle}>
            <h2 style={sectionTitleStyle}>Coaching Details</h2>

            <div style={formStyle}>
              <label>
                Assigned Session
                <select
                  value={assignedSession}
                  onChange={(e) => setAssignedSession(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">No Session Assigned</option>

                  <option value="roguewave">RogueWave Learn to Swim</option>
                </select>
              </label>

              <label>
                Extra Details <span style={optionalStyle}>(Optional)</span>
                <textarea
                  rows={4}
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  style={textareaStyle}
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div style={buttonRowStyle}>
            <button type="submit" style={buttonStyle}>
              Update Swimmer
            </button>

            <button
              type="button"
              style={closeButtonStyle}
              onClick={() => router.push(`/swimmers/${swimmer.id}`)}
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
