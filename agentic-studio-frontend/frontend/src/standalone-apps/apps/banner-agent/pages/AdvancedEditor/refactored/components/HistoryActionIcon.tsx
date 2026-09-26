export function HistoryActionIcon({ type }: { type: "undo" | "redo" }) {
    if (type === "undo") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 8H5v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 8a7 7 0 111.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 8h4v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19 8a7 7 0 10-1.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}
