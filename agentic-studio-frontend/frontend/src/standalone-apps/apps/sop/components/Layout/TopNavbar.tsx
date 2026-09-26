import { useChatStore } from "../../store";
import { pspSopService } from "../../services/PspSopService";
import { useChatHistoryListStore } from "../../store/chatHistoryListStore";
import { useParams } from "react-router-dom";

interface TopNavbarInterface {
  toggleSidebar: () => void;
}

const TopNavbar = ({ toggleSidebar }: TopNavbarInterface) => {
  const { messages, clearMessages } = useChatStore();
  const refetchHistory = useChatHistoryListStore((state) => state.refetch);
  const { sessionId } = useParams();

  const handleResetChat = () => {
    clearMessages();
    pspSopService.clearSessionId(); // Clear sessionId from localStorage
    refetchHistory();
  };

  return (
    <header className="topbar">
      <button className="topbar__hamburger" onClick={toggleSidebar}>
        <i className="fa-solid fa-bars"></i>
      </button>
      <h1 className="topbar__title">SOP Navigator</h1>

      <div className="topbar__actions">
        {!sessionId && messages.length > 0 && (
          <button
            className="topbar__reset-chat"
            title="Reset Chat"
            onClick={handleResetChat}
          >
            <i className="fa-solid fa-trash-can"></i> Clear chat
          </button>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
