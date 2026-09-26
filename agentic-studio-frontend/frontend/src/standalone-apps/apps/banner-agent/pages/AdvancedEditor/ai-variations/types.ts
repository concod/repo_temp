export interface SubDimension {
    width: number;
    height: number;
    label: string;
}

export interface AspectRatioOption {
    id: string;
    label: string;
    ratio: string;
    apiRatio: string;
    width: number;
    height: number;
    downloadWidth: number;
    downloadHeight: number;
    category: string;
    description: string;
    subDimensions?: SubDimension[];
    disabled?: boolean;
    comingSoon?: boolean;
}

export interface VariationResult {
    ratioId: string;
    status: "pending" | "processing" | "completed" | "failed";
    imageUrl?: string;
    editableState?: SmartLayoutSnapshot;
    debug?: {
        blankCanvas: string;
        rawOutput: string;
        containerRatio: string;
    };
    error?: string;
}

export interface SmartLayoutCanvasSize {
    width: number;
    height: number;
}

export interface SmartLayoutImageSnapshot {
    x: number;
    y: number;
    scale: number;
    naturalWidth: number;
    naturalHeight: number;
    renderWidth: number;
    renderHeight: number;
}

export type SmartLayoutTextAlignment = "left" | "center" | "right";

export interface SmartLayoutTextSnapshot {
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    fontSize: number;
    alignment: SmartLayoutTextAlignment;
}

export interface SmartLayoutSnapshot {
    canvasSize: SmartLayoutCanvasSize;
    image: SmartLayoutImageSnapshot | null;
    textOverlays: SmartLayoutTextSnapshot[];
}

export interface SmartLayoutFrame {
    id: string;
    type: "image" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
}
