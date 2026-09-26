import type { SavedEditorState } from "./assetEditorTypes";

// Module-level cache: survives SPA route navigations but clears on full page reload.
// This avoids sessionStorage size limits when history entries contain large data: URIs.
let cachedEditorState: SavedEditorState | null = null;

export const saveEditorState = (state: SavedEditorState) => {
    cachedEditorState = state;
};

export const loadEditorState = (imageUrl: string): SavedEditorState | null => {
    const saved = cachedEditorState;
    if (!saved || saved.imageUrl !== imageUrl) {
        return null;
    }
    // Defer clearing so React 18 StrictMode's second effect run can still
    // access the cache (StrictMode double-fires effects synchronously).
    const ref = saved;
    setTimeout(() => {
        if (cachedEditorState === ref) cachedEditorState = null;
    }, 0);
    return saved;
};
