"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/home");
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main style={pageStyle}>
      <div style={contentStyle}>
        <h1 style={titleStyle}>ROGUEWAVE</h1>

        <p style={taglineStyle}>Fight the Current • Find Your Way</p>

        <p style={loadingStyle}>Coaching Management</p>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#062b44",
  color: "white",
  fontFamily: "Arial, sans-serif",
};

const contentStyle = {
  textAlign: "center" as const,
};

const titleStyle = {
  margin: 0,
  fontSize: "42px",
  letterSpacing: "3px",
};

const taglineStyle = {
  margin: "10px 0 0 0",
  fontSize: "16px",
  color: "#d7e7ee",
};

const loadingStyle = {
  margin: "22px 0 0 0",
  fontSize: "13px",
  color: "#9fc0cf",
};
