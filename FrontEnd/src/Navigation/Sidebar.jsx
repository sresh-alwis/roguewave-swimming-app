function Sidebar({ currentPage, setCurrentPage }) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-logo" onClick={() => setCurrentPage("home")}>
        ROGUEWAVE
      </h2>

      <button onClick={() => setCurrentPage("home")}>Home</button>

      <button onClick={() => setCurrentPage("swimmers")}>Swimmers</button>

      <button onClick={() => setCurrentPage("attendance")}>Attendance</button>

      <button onClick={() => setCurrentPage("sessions")}>Sessions</button>

      <button onClick={() => setCurrentPage("payments")}>Payments</button>

      <button onClick={() => setCurrentPage("settings")}>Settings</button>
    </aside>
  );
}

export default Sidebar;
