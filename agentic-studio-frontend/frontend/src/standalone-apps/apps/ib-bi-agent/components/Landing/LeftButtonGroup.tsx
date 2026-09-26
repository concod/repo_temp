import React from "react";
import { AddIcon } from "./icons";
import IBDrawerIcon from "../../assets/ib-drawer.svg";

type LeftButtonGroupProps = {
  onNewChat: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
};

export const LeftButtonGroup: React.FC<LeftButtonGroupProps> = ({
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
}) => {
  return (
    <div className={`ib-landing__left-rail ${isHistoryOpen ? "active" : ""}`} aria-label="Left rail actions">
      <button
        type="button"
        className="ib-landing__primary-square"
        onClick={onNewChat}
        aria-label="Start new chat"
      >
        <AddIcon />
        <span
          className={`ib-landing__primary-square-text ${isHistoryOpen ? "visible" : ""}`}
          aria-hidden={!isHistoryOpen}
        >
          New Chat
        </span>
      </button>

      <button
        type="button"
        className={`ib-landing__icon-btn ${isHistoryOpen ? "active" : ""}`}
        onClick={onToggleHistory}
        aria-label={isHistoryOpen ? "Hide history" : "Show history"}
      >
        <img src={IBDrawerIcon} alt="Drawer" />
      </button>
    </div>
  );
};

