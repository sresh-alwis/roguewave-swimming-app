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

  const renderPage = () => {
    switch (currentPage) {
      case "swimmers":
        return <Swimmers />;

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
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="home-content">{renderPage()}</main>
    </div>
  );
}

export default App;
