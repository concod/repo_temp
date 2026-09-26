/// <reference types="vite/client" />

interface AIStudioWindowApi {
    openSelectKey?: () => void | Promise<void>;
}

declare global {
    interface Window {
        aistudio?: AIStudioWindowApi;
    }
}

export { };
