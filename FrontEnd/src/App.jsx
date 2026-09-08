import { useEffect, useState } from "react";
import "./App.css";

import Sidebar from "./Navigation/Sidebar";

import Home from "./Pages/Home";
import Swimmers from "./Pages/Swimmers/Swimmers";
import Attendance from "./Pages/Attendance";
import Sessions from "./Pages/Sessions";
import Payments from "./Pages/Payments";
import Settings from "./Pages/Settings";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState("home");

  // Used to reset the Swimmers page when its navigation button
  // is clicked while already inside Swimmers.
  const [swimmersResetKey, setSwimmersResetKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="splash-screen" onClick={() => setShowSplash(false)}>
        <h1>ROGUEWAVE</h1>
        <p>FIGHT THE CURRENT • FIND YOUR WAY</p>
      </div>
    );
  }

  const goToPage = (page) => {
    // If Swimmers is clicked while already on Swimmers,
    // reset it back to the swimmer list.
    if (page === "swimmers" && currentPage === "swimmers") {
      setSwimmersResetKey((previousKey) => previousKey + 1);
      return;
    }

    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "swimmers":
        return <Swimmers key={swimmersResetKey} />;

      case "attendance":
        return <Attendance />;

      case "sessions":
        return <Sessions />;

      case "payments":
        return <Payments />;

      case "settings":
        return <Settings />;

      default:
        return <Home />;
    }
  };

  return (
    <div className="home-screen">
      <Sidebar currentPage={currentPage} setCurrentPage={goToPage} />

      <main className="home-content">{renderPage()}</main>
    </div>
  );
}

export default App;
