function Sidebar({ currentPage, setCurrentPage }) {
  const navItems = [
    { key: "home", label: "Home" },
    { key: "swimmers", label: "Swimmers" },
    { key: "attendance", label: "Attendance" },
    { key: "sessions", label: "Sessions" },
    { key: "payments", label: "Payments" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <aside className="sidebar">
      <h2 className="sidebar-logo" onClick={() => setCurrentPage("home")}>
        ROGUEWAVE
      </h2>

      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setCurrentPage(item.key)}
          aria-current={currentPage === item.key ? "page" : undefined}
        >
          {item.label}
        </button>
      ))}
    </aside>
  );
}

export default Sidebar;
