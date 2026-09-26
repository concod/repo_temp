export type ChatRole = "user" | "bot";

export interface ChatResponse {
    text: string;
    isHtml?: boolean;
    sources: string[];
    editableImageUrls?: string[];
    productImageUrls?: string[];
}

export interface ChatMessage {
    id: string;
    role: ChatRole;
    text: string;
    isHtml?: boolean;
    createdAt: string;
    sources: string[];
    imageUrls: string[];
    productImageUrls: string[];
    isError?: boolean;
}

export interface PreviewState {
    isOpen: boolean;
    imageUrl: string;
}

export interface ChatState {
    darkMode: boolean;
    isWaitingForResponse: boolean;
    isRetrying: boolean;
    messages: ChatMessage[];
    preview: PreviewState;
    chatWidthPercent: number;
}
