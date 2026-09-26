export type EditorToolKey = "modify" | "text" | "asset" | "erase" | "crop" | "expand";

export type UploadedObject = {
    id: string;
    file: File;
    previewUrl: string;
};

export type TextElement = {
    id: string;
    content: string;
    prompt: string;
};

export type HistoryEntry = {
    id: string;
    imageUrl: string;
    label: string;
};

export type CropPreset = {
    id: string;
    label: string;
    aspectRatio: number;
    ratio?: string;
};

export type CanvasSize = {
    width: number;
    height: number;
};

export type BrandingRenderMetrics = {
    strokeWidth: number;
    distance: number;
    logoPadding: number;
    logoSize: number;
};

export type SavedEditorState = {
    imageUrl: string;
    activeImageUrl: string;
    originalImageUrl: string;
    imageHistory: HistoryEntry[];
    activeHistoryIndex: number;
};
