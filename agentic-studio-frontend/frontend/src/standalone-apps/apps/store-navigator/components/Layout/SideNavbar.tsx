import { NavLink } from "react-router-dom";
import iaLogo from "../../assets/ia-logo.svg";
import { useChatHistoryListStore } from "../../store/chatHistoryListStore";
import { useEffect } from "react";
import { InfiniteScroll } from "../../../../../components/InfiniteScroll/InfiniteScroll";

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

  useEffect(() => {
    fetchHistoryList();
  }, [fetchHistoryList]);

  return (
    <nav className="sidebar__content">
      <div className="sidebar__title">
        <img src={iaLogo} />
        <span>SOP Navigator</span>
      </div>
      <NavLink to={"/apps/sop/chat"} end onClick={closeSidebar}>
        <i className="fa-solid fa-pen-to-square"></i>
        <span className="menu-text">New Chat</span>
      </NavLink>
      {!isLoading && !error && historyList && historyList.length > 0 && (
        <>
          <h3 className="history">History</h3>
          <div className="sidebar__menu-container">
            <ul className="sidebar__menu">
              <InfiniteScroll
                isLoading={isFetchingNext}
                onPageEnd={fetchHistoryList}
                list={historyList.map((history) => (
                  <li key={history.session_id}>
                    <NavLink
                      to={`/apps/sop/chat/${history.session_id}`}
                      onClick={closeSidebar}
                    >
                      <span className="menu-text">{history.session_title}</span>
                    </NavLink>
                  </li>
                ))}
              />
            </ul>
          </div>
        </>
      )}
    </nav>
  );
};

export default SideNavbar;
