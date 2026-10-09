"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "@/lib/navigation";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key to close drawer
  useEffect(() => {
    if (!drawerOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer when pathname changes (e.g., browser back/forward)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setDrawerOpen(false);
    }
  }, [pathname]);

  return (
    <>
      {/* Skip to main content link */}
      <a href="#main-content" className="app-skip-link">
        Skip to main content
      </a>

      {/* Mobile header */}
      <MobileHeader />

      {/* Mobile drawer toggle button */}
      <button
        ref={menuButtonRef}
        className="app-mobile-menu-btn"
        aria-label="Open navigation menu"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="app-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <nav
        className={`app-drawer${drawerOpen ? " app-drawer-open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="app-drawer-header">
          <span className="app-drawer-title">ROGUEWAVE</span>
          <button
            className="app-drawer-close-btn"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="app-drawer-subtitle">Coaching Management</p>
        <nav className="app-drawer-nav" aria-label="Mobile">
          {navigationItems.map((item) => {
            const isActive = pathname.startsWith(item.matchPrefix);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`app-nav-link${isActive ? " app-nav-link-active" : ""}`}
                onClick={() => setDrawerOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </nav>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <main id="main-content" className="app-main">
        {children}
      </main>
    </>
  );
}
