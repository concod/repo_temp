import React, { useState } from "react";
import { GlobalHeader } from "./GlobalHeader";
import { SidebarNav } from "./SidebarNav";
import { Overlay } from "./Overlay";
import { SidebarNavMobile } from "./SidebarNav/SidebarNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => {
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      <div className="app-layout">
        <SidebarNav />
        <div className="app-layout__main">
          <GlobalHeader openSidebar={openSidebar} />
          <main className="app-layout__content">{children}</main>
        </div>
        <Overlay />
      </div>

      <SidebarNavMobile isSidebarOpen={isSidebarOpen} closeSidebar={closeSidebar}/>
    </>
  );
};
