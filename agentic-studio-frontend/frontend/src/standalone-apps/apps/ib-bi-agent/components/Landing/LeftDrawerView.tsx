import React from "react";
import { ClockIcon } from "./icons";
import type { ChatSession } from "../../types/chat.types";

type LeftDrawerProps = {
    isOpen: boolean;
    sessions: ChatSession[];
    selectedSessionId: string | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSelectSession: (sessionId: string) => void;
};

const formatLastRequest = (date: Date): string => {
    if (Number.isNaN(date.getTime())) {
        return "Unknown date";
    }

    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const SessionSkeletonList: React.FC = () => {
    return (
        <div className="ib-landing__drawer-items" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
                <div className="ib-landing__drawer-item skeleton" key={`skeleton-${index}`}>
                    <span className="ib-landing__drawer-skeleton-line primary" />
                    <span className="ib-landing__drawer-skeleton-line secondary" />
                </div>
            ))}
        </div>
    );
};

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
    isOpen,
    sessions,
    selectedSessionId,
    loading,
    error,
    onRetry,
    onSelectSession,
}) => {
    const sortedSessions = [...sessions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    return (
        <aside
            className={`ib-landing__drawer ${isOpen ? "open" : ""}`}
            aria-label="Chat history"
            aria-hidden={!isOpen}
        >
            <div className="ib-landing__drawer-header">
                <div className="ib-landing__drawer-tabs">
                    <button type="button" className="ib-landing__drawer-tab active" aria-pressed="true">
                        <span className="ib-landing__drawer-tab-icon">
                            <ClockIcon />
                        </span>
                        <span>History</span>
                    </button>
                </div>
            </div>

            <div className="ib-landing__drawer-body">
                {loading && <SessionSkeletonList />}

                {!loading && error && (
                    <div className="ib-landing__drawer-status">
                        <p className="ib-landing__drawer-status-text">Failed to load previous chats.</p>
                        <button
                            type="button"
                            className="ib-landing__drawer-retry-btn"
                            onClick={onRetry}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && sortedSessions.length === 0 && (
                    <div className="ib-landing__drawer-empty">No previous chats</div>
                )}

                {!loading && !error && sortedSessions.length > 0 && (
                    <div className="ib-landing__drawer-items">
                        {sortedSessions.map((entry) => {
                            const isActive = entry.id === selectedSessionId;

                            return (
                                <button
                                    type="button"
                                    className={`ib-landing__drawer-item ${isActive ? "active" : ""}`}
                                    key={entry.id}
                                    onClick={() => onSelectSession(entry.id)}
                                    aria-pressed={isActive}
                                    title={entry.title}
                                >
                                    <span className="ib-landing__drawer-item-text">{entry.title}</span>
                                    <span className="ib-landing__drawer-item-subtext">
                                        {formatLastRequest(entry.updatedAt)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};