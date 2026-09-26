import React from 'react';
import type { ChatSession } from '../../types/chat.types';

type LeftDrawerProps = {
    isOpen: boolean;
    sessions: ChatSession[];
    selectedSessionId: string | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
    onClose: () => void;
};

const formatLastRequest = (date: Date): string => {
    if (Number.isNaN(date.getTime())) {
        return 'Unknown date';
    }

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const SessionSkeletonList: React.FC = () => {
    return (
        <div className="psp-drawer__items" aria-hidden>
            {Array.from({ length: 4 }).map((_, index) => (
                <div className="psp-drawer__item skeleton" key={`skeleton-${index}`}>
                    <span className="psp-drawer__skeleton-line primary" />
                    <span className="psp-drawer__skeleton-line secondary" />
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
    onNewChat,
    onClose,
}) => {
    const sortedSessions = [...sessions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    return (
        <aside
            className={`psp-drawer ${isOpen ? 'open' : ''}`}
            aria-label="Chat history"
            aria-hidden={!isOpen}
        >
            <div className="psp-drawer__header">
                <div className="psp-drawer__header-title">
                    <i className="fas fa-clock"></i>
                    <span>History</span>
                </div>
                <div className="psp-drawer__header-actions">
                    <button
                        type="button"
                        className="psp-drawer__new-chat-btn"
                        onClick={onNewChat}
                        title="New Chat"
                    >
                        <i className="fas fa-plus"></i>
                    </button>
                    <button
                        type="button"
                        className="psp-drawer__close-btn"
                        onClick={onClose}
                        title="Close"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div className="psp-drawer__body">
                {loading && <SessionSkeletonList />}

                {!loading && error && (
                    <div className="psp-drawer__status">
                        <p className="psp-drawer__status-text">Failed to load previous chats.</p>
                        <button
                            type="button"
                            className="psp-drawer__retry-btn"
                            onClick={onRetry}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && sortedSessions.length === 0 && (
                    <div className="psp-drawer__empty">No previous chats</div>
                )}

                {!loading && !error && sortedSessions.length > 0 && (
                    <div className="psp-drawer__items">
                        {sortedSessions.map((entry) => {
                            const isActive = entry.id === selectedSessionId;

                            return (
                                <button
                                    type="button"
                                    className={`psp-drawer__item ${isActive ? 'active' : ''}`}
                                    key={entry.id}
                                    onClick={() => onSelectSession(entry.id)}
                                    aria-pressed={isActive}
                                    title={entry.title}
                                >
                                    <span className="psp-drawer__item-text">{entry.title}</span>
                                    <span className="psp-drawer__item-subtext">
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
