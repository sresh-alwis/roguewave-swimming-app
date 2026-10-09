"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

type HistoryRecord = {
  attendance_id: number;
  attendance_date: string;
  attendance_status: string;
  session_id: number;
  session_name: string;
  location: string | null;
  session_status: string;
};

type Summary = {
  total_records: number;
  present_count: number;
  absent_count: number;
  attendance_percentage: number;
  sessions_completed: number;
};

type Swimmer = {
  id: number;
  name: string;
};

type AttendanceHistoryResponse = {
  swimmer: Swimmer;
  summary: Summary;
  records: HistoryRecord[];
};

export default function AttendanceHistoryPage() {
  const params = useParams<{ id: string }>();
  const swimmerId = params.id;

  const [data, setData] = useState<AttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch(`/api/swimmers/${swimmerId}/attendance-history`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to load attendance history.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load attendance history.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (swimmerId) {
      loadHistory();
    }
  }, [swimmerId]);

  if (loading) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={notFoundStyle}>
            <p>Loading attendance history...</p>
          </section>
        </main>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <main style={pageStyle}>
          <section style={notFoundStyle}>
            <h1>Error</h1>
            <p style={mutedTextStyle}>{error}</p>
            <Link href="/swimmers" style={buttonLinkStyle}>
              Back to Swimmers
            </Link>
          </section>
        </main>
      </AppShell>
    );
  }

  const { swimmer, summary, records } = data;

  return (
    <AppShell>
      {/* Main Content */}
      <section style={mainContentStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={{ margin: 0 }}>Attendance History</h1>

            <p style={subtitleStyle}>{swimmer.name}</p>
          </div>

          <Link href={`/swimmers/${swimmer.id}`} style={secondaryLinkStyle}>
            Back to Profile
          </Link>
        </div>

        {/* Summary Cards */}
        <div style={summaryGridStyle}>
          <SummaryCard label="Total Attendance Records" value={summary.total_records} />
          <SummaryCard label="Present" value={summary.present_count} />
          <SummaryCard label="Absent" value={summary.absent_count} />
          <SummaryCard label="Attendance %" value={`${summary.attendance_percentage}%`} />
          <SummaryCard label="Sessions Completed" value={summary.sessions_completed} />
        </div>

        {/* History Table */}
        <div style={cardStyle}>
          <div style={tableHeaderStyle}>
            <strong>Date</strong>
            <strong>Session</strong>
            <strong>Location</strong>
            <strong>Status</strong>
          </div>

          {records.length > 0 ? (
            records.map((record) => (
              <div key={record.attendance_id} style={attendanceRowStyle}>
                <span>{formatDate(record.attendance_date)}</span>
                <span>{record.session_name}</span>
                <span>{record.location || "-"}</span>
                <span
                  style={
                    record.attendance_status === "present"
                      ? presentBadgeStyle
                      : absentBadgeStyle
                  }
                >
                  {record.attendance_status === "present" ? "Present" : "Absent"}
                </span>
              </div>
            ))
          ) : (
            <div style={emptyStyle}>No attendance records yet.</div>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={summaryCardStyle}>
      <span style={summaryLabelStyle}>{label}</span>
      <strong style={summaryValueStyle}>{value}</strong>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const pageStyle = {
  minHeight: "100vh",
  backgroundColor: "var(--background)",
  color: "var(--text)",
  display: "flex",
  fontFamily: "Arial, sans-serif",
};

const mainContentStyle = {
  padding: "40px",
  minWidth: 0,
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  flexWrap: "wrap" as const,
  marginBottom: "30px",
};

const subtitleStyle = {
  color: "var(--secondary-text)",
  margin: "6px 0 0 0",
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "15px",
  marginBottom: "30px",
};

const summaryCardStyle = {
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "20px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const summaryLabelStyle = {
  color: "var(--secondary-text)",
  fontSize: "13px",
};

const summaryValueStyle = {
  fontSize: "28px",
};

const cardStyle = {
  maxWidth: "900px",
  backgroundColor: "var(--card)",
  color: "var(--text)",
  padding: "clamp(18px, 4vw, 25px)",
  borderRadius: "10px",
  border: "1px solid var(--border)",
};

const tableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 1fr auto",
  gap: "20px",
  padding: "0 12px 12px",
  color: "var(--secondary-text)",
  borderBottom: "1px solid var(--border)",
};

const attendanceRowStyle = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 1fr auto",
  alignItems: "center",
  gap: "20px",
  padding: "15px 12px",
  borderBottom: "1px solid var(--border)",
};

const presentBadgeStyle = {
  backgroundColor: "var(--success-background)",
  color: "var(--success-text)",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
  minWidth: "75px",
  textAlign: "center" as const,
};

const absentBadgeStyle = {
  backgroundColor: "var(--danger-background)",
  color: "var(--danger-text)",
  padding: "6px 12px",
  borderRadius: "20px",
  fontSize: "13px",
  fontWeight: "bold",
  minWidth: "75px",
  textAlign: "center" as const,
};

const emptyStyle = {
  padding: "35px",
  textAlign: "center" as const,
  color: "var(--secondary-text)",
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

const secondaryLinkStyle = {
  display: "inline-block",
  backgroundColor: "var(--secondary-button)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  padding: "10px 18px",
  borderRadius: "6px",
  textDecoration: "none",
  fontWeight: "bold",
};

const notFoundStyle = {
  maxWidth: "600px",
  margin: "40px auto",
  backgroundColor: "var(--card)",
  padding: "30px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  textAlign: "center" as const,
};

const mutedTextStyle = {
  color: "var(--secondary-text)",
};
