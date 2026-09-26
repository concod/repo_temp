import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { ChatSession } from "../../../store/chatStore";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatHistoryDrawerProps {
    isOpen: boolean;
    sessions: ChatSession[];
    selectedSessionId: string | null;
    loading: boolean;
    conversationLoading: boolean;
    onClose: () => void;
    onSelectSession: (sessionId: string) => void;
    onNewChat: () => void;
}

interface DateGroup {
    label: string;
    sessions: ChatSession[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const groupSessionsByDate = (sessions: ChatSession[]): DateGroup[] => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const groups: Record<string, ChatSession[]> = {
        Today: [],
        Yesterday: [],
        "This Week": [],
        Older: [],
    };

    const sorted = [...sessions].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    for (const session of sorted) {
        const t = session.updatedAt.getTime();
        if (t >= todayStart.getTime()) {
            groups.Today.push(session);
        } else if (t >= yesterdayStart.getTime()) {
            groups.Yesterday.push(session);
        } else if (t >= weekStart.getTime()) {
            groups["This Week"].push(session);
        } else {
            groups.Older.push(session);
        }
    }

    return Object.entries(groups)
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => ({ label, sessions: items }));
};

const formatTime = (date: Date): string => {
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatFullDate = (date: Date): string => {
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

const SkeletonLoader: React.FC = () => (
    <div className="ba-drawer__skeleton" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
            <div className="ba-drawer__skeleton-item" key={`skel-${i}`}>
                <span className="ba-drawer__skeleton-line primary" />
                <span className="ba-drawer__skeleton-line secondary" />
            </div>
        ))}
    </div>
);

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ChatHistoryDrawer: React.FC<ChatHistoryDrawerProps> = ({
    isOpen,
    sessions,
    selectedSessionId,
    loading,
    conversationLoading,
    onClose,
    onSelectSession,
    onNewChat,
}) => {
    const [search, setSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    // Focus search on open
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => searchRef.current?.focus(), 320);
            return () => clearTimeout(timer);
        }
        setSearch("");
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    const filtered = useMemo(() => {
        if (!search.trim()) return sessions;
        const q = search.toLowerCase();
        return sessions.filter((s) => s.title.toLowerCase().includes(q));
    }, [sessions, search]);

    const groups = useMemo(() => groupSessionsByDate(filtered), [filtered]);

    const handleSelect = useCallback(
        (sessionId: string) => {
            onSelectSession(sessionId);
        },
        [onSelectSession]
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className={`ba-drawer__backdrop ${isOpen ? "is-visible" : ""}`}
                onClick={onClose}
                aria-hidden
            />

            {/* Panel */}
            <aside
                className={`ba-drawer ${isOpen ? "is-open" : ""}`}
                aria-label="Chat history"
                aria-hidden={!isOpen}
                role="complementary"
            >
                {/* Header */}
                <div className="ba-drawer__header">
                    <div className="ba-drawer__header-top">
                        <div className="ba-drawer__title-group">
                            <svg
                                className="ba-drawer__title-icon"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <h3 className="ba-drawer__title">Chat History</h3>
                        </div>
                        <button
                            type="button"
                            className="ba-drawer__close-btn"
                            onClick={onClose}
                            aria-label="Close history"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="ba-drawer__search">
                        <svg
                            className="ba-drawer__search-icon"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={searchRef}
                            type="text"
                            className="ba-drawer__search-input"
                            placeholder="Search chats…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                className="ba-drawer__search-clear"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* New Chat */}
                    <button type="button" className="ba-drawer__new-chat" onClick={onNewChat}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* Body */}
                <div className="ba-drawer__body">
                    {/* Loading */}
                    {loading && <SkeletonLoader />}

                    {/* Empty - no sessions at all */}
                    {!loading && sessions.length === 0 && (
                        <div className="ba-drawer__empty">
                            <svg
                                className="ba-drawer__empty-icon"
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <p className="ba-drawer__empty-title">No conversations yet</p>
                            <p className="ba-drawer__empty-desc">
                                Start a chat and it will appear here
                            </p>
                        </div>
                    )}

                    {/* Empty - no search results */}
                    {!loading && sessions.length > 0 && filtered.length === 0 && (
                        <div className="ba-drawer__empty">
                            <p className="ba-drawer__empty-title">No matching chats</p>
                            <p className="ba-drawer__empty-desc">
                                Try a different search term
                            </p>
                        </div>
                    )}

                    {/* Session list grouped by date */}
                    {!loading &&
                        groups.map((group) => (
                            <div className="ba-drawer__group" key={group.label}>
                                <span className="ba-drawer__group-label">{group.label}</span>
                                <div className="ba-drawer__group-items">
                                    {group.sessions.map((session) => {
                                        const isActive = session.id === selectedSessionId;
                                        const showFullDate =
                                            group.label === "This Week" || group.label === "Older";

                                        return (
                                            <button
                                                type="button"
                                                key={session.id}
                                                className={`ba-drawer__item ${isActive ? "is-active" : ""}`}
                                                onClick={() => handleSelect(session.id)}
                                                disabled={conversationLoading}
                                                title={session.title}
                                            >
                                                <span className="ba-drawer__item-title">
                                                    {session.title}
                                                </span>
                                                <span className="ba-drawer__item-meta">
                                                    {showFullDate
                                                        ? formatFullDate(session.updatedAt)
                                                        : formatTime(session.updatedAt)}
                                                    {session.requestCount > 0 && (
                                                        <span className="ba-drawer__item-count">
                                                            · {session.requestCount} messages
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            </aside>
        </>
    );
};

export default ChatHistoryDrawer;
