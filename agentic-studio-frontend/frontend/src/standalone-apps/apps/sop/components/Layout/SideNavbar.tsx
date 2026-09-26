import { NavLink } from "react-router-dom";
import iaLogo from "../../../../../assets/images/ia-logo.svg";
import { useChatHistoryListStore } from "../../store/chatHistoryListStore";
import { useEffect, useRef, useState } from "react";
import { InfiniteScroll } from "../../../../../components/InfiniteScroll/InfiniteScroll";
import useClickOutside from "../../../../../hooks/useClickOutside";
import { useChatStore, useThemeStore } from "../../store";
import { pspSopService } from "../../services/PspSopService";
import type {
  ChatHistoryGroup,
  ChatHistorySession,
} from "../../types/chat.types";
import React from "react";
import { useAuthStore } from "../../../agent-launcher/store/authStore";

/**
 * Determines the group label based on the date difference from today
 */
const getDateRangeLabel = (date: Date): string => {
  const now = new Date();

  // Normalize to midnight for accurate calendar day comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const diffInMs = today.getTime() - targetDate.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays <= 7) return "Last 7 days";
  return "Older";
};

const groupChatSessions = (
  sessions: ChatHistorySession[]
): ChatHistoryGroup[] => {
  const groups: Record<string, ChatHistorySession[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  sessions.forEach((session) => {
    // Assuming last_request is an ISO string or valid date string
    const date = new Date(session.last_request);
    const label = getDateRangeLabel(date);
    groups[label].push(session);
  });

  // Explicit order for the UI
  const order = ["Today", "Yesterday", "Last 7 days", "Older"];

  return order
    .filter((label) => groups[label].length > 0)
    .map((label) => ({
      dateRange: label,
      // Sort sessions within each group by most recent first
      history: groups[label].sort(
        (a, b) =>
          new Date(b.last_request).getTime() -
          new Date(a.last_request).getTime()
      ),
    }));
};
interface SideNavbarInterface {
  closeSidebar: () => void;
}

const SideNavbar = ({ closeSidebar }: SideNavbarInterface) => {
  const {
    data: historyList,
    fetchNext: fetchHistoryList,
    isLoading,
    isFetchingNext,
    error,
  } = useChatHistoryListStore();
  const { userEmail, userName } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { clearMessages } = useChatStore();
  // const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const refetchHistory = useChatHistoryListStore((state) => state.refetch);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const historyListGrouped = groupChatSessions(historyList);

  const handleResetChat = () => {
    clearMessages();
    pspSopService.clearSessionId(); // Clear sessionId from localStorage
    refetchHistory();
  };

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  // const handleLogout = () => {
  //   clearMessages(); // Clear chat history on logout
  //   pspSopService.clearSessionId(); // Clear sessionId from localStorage
  //   logout();
  //   navigate("/apps/sop/");
  // };

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  const handleNewChatClick = () => {
    closeSidebar();
    handleResetChat();
  };

  return (
    <nav className="sidebar__content">
      <div className="sidebar__title">
        <img src={iaLogo} />
        <div>SOP Navigator</div>
      </div>
      <NavLink to={"/apps/sop/chat"} end onClick={handleNewChatClick}>
        <i className="fa-solid fa-pen-to-square"></i>
        <span className="menu-text">New Chat</span>
      </NavLink>
      {!isLoading && !error && historyList && historyList.length > 0 && (
        <>
          <h3 className="history">
            History{" "}
            <button onClick={() => setIsHistoryExpanded((prev) => !prev)}>
              {isHistoryExpanded ? (
                <i className="fa-solid fa-chevron-up"></i>
              ) : (
                <i className="fa-solid fa-chevron-down"></i>
              )}
            </button>
          </h3>
          <div
            className="sidebar__menu-container"
            style={{ visibility: isHistoryExpanded ? "visible" : "hidden" }}
          >
            <ul className="sidebar__menu">
              <InfiniteScroll
                isLoading={isFetchingNext}
                onPageEnd={fetchHistoryList}
                list={historyListGrouped.map((group) => (
                  <React.Fragment key={group.dateRange}>
                    <div className="sidebar__menu-group">{group.dateRange}</div>
                    {group.history.map((history) => (
                      <li key={history.session_id}>
                        <NavLink
                          to={`/apps/sop/chat/${history.session_id}`}
                          onClick={closeSidebar}
                        >
                          <span className="menu-text">
                            {history.session_title}
                          </span>
                        </NavLink>
                      </li>
                    ))}
                  </React.Fragment>
                ))}
              />
            </ul>
          </div>
        </>
      )}
      <div className="sidebar__dropdown">
        <button
          className="sidebar__action-btn profile-trigger"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          onMouseDown={(e) => e.stopPropagation()}
          aria-expanded={isDropdownOpen}
        >
          <div className="profile-avatar">
            <span>
              {userName ? (
                userName[0].toUpperCase()
              ) : (
                <i className="fa-solid fa-user"></i>
              )}
            </span>
          </div>
          <div className="profile-info">
            <span className="profile-info--email">{userName}</span>
            <span className="profile-info--label">{userEmail}</span>
          </div>
          <i
            className={`fa-solid fa-chevron-up profile-arrow ${
              isDropdownOpen ? "rotate" : ""
            }`}
          ></i>
        </button>

        <div
          ref={dropdownRef}
          className={`dropdown ${isDropdownOpen ? "open" : ""}`}
        >
          {/* Theme toggle */}
          <button className="dropdown__item" onClick={toggleTheme}>
            <i className={theme === "dark" ? "fas fa-sun" : "fas fa-moon"}></i>
            <span className="dropdown__text">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          </button>

          {/* Logout */}
          {/* <button className="dropdown__item logout" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i>
            <span className="dropdown__text">Logout</span>
          </button> */}
        </div>
      </div>
    </nav>
  );
};

export default SideNavbar;
