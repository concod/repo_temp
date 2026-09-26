import { useState } from "react";
import SideNavbar from "./SideNavbar";
import TopNavbar from "./TopNavbar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <SideNavbar closeSidebar={closeSidebar}/>
      </aside>

      {/* Overlay for mobile/tablet */}
      {isSidebarOpen && <div className="overlay" onClick={closeSidebar} />}

      <div className="main">
        <TopNavbar toggleSidebar={toggleSidebar} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
