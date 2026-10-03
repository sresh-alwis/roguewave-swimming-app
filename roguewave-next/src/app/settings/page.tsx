"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

function useTheme(): Theme {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    () => {
      const saved = localStorage.getItem("roguewave-theme") as Theme | null;
      return saved || "system";
    },
    () => "system",
  );
}

function useLocalStorage(key: string, initialValue: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    const saved = localStorage.getItem(key);
    return saved ?? initialValue;
  });

  function updateValue(newValue: string) {
    setValue(newValue);
    localStorage.setItem(key, newValue);
    window.dispatchEvent(new Event("storage"));
  }

  return [value, updateValue];
}

export default function SettingsPage() {
  const [coachName, setCoachName] = useLocalStorage("roguewave-coach-name", "Sreshta Alwis");
  const [squadName, setSquadName] = useLocalStorage("roguewave-squad-name", "RogueWave Swimming");

  const theme = useTheme();

  function applyTheme(selectedTheme: Theme) {
    let actualTheme: "light" | "dark";

    if (selectedTheme === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;

      actualTheme = prefersDark ? "dark" : "light";
    } else {
      actualTheme = selectedTheme;
    }

    document.documentElement.setAttribute("data-theme", actualTheme);
  }

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange() {
      if (theme === "system") {
        applyTheme("system");
      }
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);

  function handleThemeChange(selectedTheme: Theme) {
    localStorage.setItem("roguewave-theme", selectedTheme);
    window.dispatchEvent(new Event("storage"));
    applyTheme(selectedTheme);
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coachName.trim()) {
      alert("Please enter your name.");
      return;
    }

    if (!squadName.trim()) {
      alert("Please enter your squad name.");
      return;
    }

    alert("Settings saved.");
  }

  return (
    <main style={pageStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <h2 style={{ margin: 0 }}>ROGUEWAVE</h2>

        <p style={sidebarSubtitleStyle}>Coaching Management</p>

        <nav style={navStyle}>
          <Link href="/home" style={linkStyle}>
            Home
          </Link>

          <Link href="/swimmers" style={linkStyle}>
            Swimmers
          </Link>

          <Link href="/sessions" style={linkStyle}>
            Sessions
          </Link>

          <Link href="/attendance" style={linkStyle}>
            Attendance
          </Link>

          <Link href="/my-info" style={linkStyle}>
            My Info
          </Link>

          <Link
            href="/settings"
            style={{
              ...linkStyle,
              ...activeLinkStyle,
            }}
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>Settings</h1>

            <p style={subtitleStyle}>
              Manage your profile and appearance.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} style={formStyle}>
          {/* Profile */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Profile & Squad</h2>

            <p style={cardSubtitleStyle}>
              Basic information used throughout RogueWave.
            </p>

            <label style={labelStyle}>
              Coach Name
              <input
                type="text"
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                required
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Squad Name
              <input
                type="text"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                required
                style={inputStyle}
              />
            </label>
          </div>

          {/* Appearance */}
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Appearance</h2>

            <p style={cardSubtitleStyle}>
              Choose how RogueWave looks on your device.
            </p>

            <label style={labelStyle}>
              Theme
              <select
                value={theme}
                onChange={(e) => handleThemeChange(e.target.value as Theme)}
                style={inputStyle}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </label>

            <p style={helperTextStyle}>
              System Default follows your phone or computer appearance setting.
            </p>
          </div>

          {/* Actions */}
          <div style={buttonRowStyle}>
            <button type="submit" style={buttonStyle}>
              Save Changes
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
  display: "flex",
  fontFamily: "Arial, sans-serif",
};

const sidebarStyle = {
  width: "220px",
  backgroundColor: "var(--sidebar)",
  color: "var(--sidebar-text)",
  padding: "30px 20px",
};

const sidebarSubtitleStyle = {
  color: "#b8d3df",
  fontSize: "13px",
  marginTop: "5px",
};

const navStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
  marginTop: "35px",
};

const linkStyle = {
  color: "var(--sidebar-text)",
  textDecoration: "none",
  fontSize: "16px",
  padding: "10px 12px",
  borderRadius: "6px",
};

const activeLinkStyle = {
  backgroundColor: "rgba(255,255,255,0.12)",
};

const mainContentStyle = {
  flex: 1,
  padding: "40px",
};

const headerStyle = {
  marginBottom: "30px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const formStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "25px",
  maxWidth: "800px",
};

const cardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "25px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const cardTitleStyle = {
  margin: 0,
};

const cardSubtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 20px 0",
};

const labelStyle = {
  display: "block",
  marginTop: "18px",
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
  color: "var(--secondary-text)",
  fontSize: "14px",
  marginTop: "10px",
};

const buttonRowStyle = {
  display: "flex",
  gap: "15px",
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
