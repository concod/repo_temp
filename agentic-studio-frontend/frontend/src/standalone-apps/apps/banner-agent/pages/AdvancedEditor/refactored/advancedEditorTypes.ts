export type AdvancedToolKey = "template" | "resize" | "assets" | "background" | "text" | "filters" | "layouts";

export type TemplateBackground = {
    type: "transparent" | "solid" | "gradient" | "image";
    imageUrl: string | null;
    color: string;
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
};

export type BackgroundScaleMode = "cover" | "fill" | "contain";
export type BackgroundTool = "brush" | "eraser";
export type TransparentFillType = "solid" | "gradient" | "blur" | "pattern";
export type PatternType = "dots" | "grid" | "diagonal" | "waves" | "noise";
export type ImageTopTool = "crop" | "adjust" | "shadow" | "reflection" | "eraser";

export type ShadowSettings = {
    enabled: boolean;
    angle: number;
    distance: number;
    blur: number;
    opacity: number;
    color: string;
};

export type ReflectionSettings = {
    enabled: boolean;
    opacity: number;
    distance: number;
    yOffset: number;
    height: number;
    blur: number;
};

export type AdjustSettings = {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
    temperature: number;
    highlights: number;
};

export type TransparentFillSettings = {
    enabled: boolean;
    type: TransparentFillType;
    color: string;
    gradientStart: string;
    gradientEnd: string;
    gradientAngle: number;
    blurAmount: number;
    pattern: PatternType;
};

export type CollageBackgroundSettings = {
    backgroundType: "transparent" | "solid" | "gradient" | "image";
    backgroundColor: string;
    backgroundGradientStart: string;
    backgroundGradientEnd: string;
    backgroundGradientAngle: number;
    backgroundImageUrl: string | null;
    backgroundScaleMode: BackgroundScaleMode;
    transparentFill: TransparentFillSettings;
};

export type CollageTemplate = {
    /** Integer primary key from the banner_templates API. Undefined for unsaved (new) templates. */
    dbId?: number;
    id: string;
    name: string;
    description: string;
    thumbnail: string;
    templateType?: "banner" | "collage";
    canvasWidth?: number;
    canvasHeight?: number;
    canvas?: {
        width?: number;
        height?: number;
    };
    skipAIBackgroundRemoval?: boolean;
    enableBehindTemplateLayering?: boolean;
    defaultBrandingEnabled?: boolean;
    settings: {
        canvasWidth?: number;
        canvasHeight?: number;
        canvas?: {
            width?: number;
            height?: number;
        };
        background: TemplateBackground;
        positioning: {
            verticalAlignment: number;
            horizontalAlignment?: number;
        };
        layout?: {
            productScalePercent?: number;
            productSpacing?: number;
            placementWidthPct?: number;
            placementHeightPct?: number;
        };
    };
};

export type TemplateConfig = {
    templates: CollageTemplate[];
};

export type UploadBannerResponse = {
    url: string;
    filename?: string;
};

export type ProcessProductResult = {
    path_url?: string;
    no_bg_url?: string;
};

export type ProcessProductResponse = {
    results?: ProcessProductResult[];
};

export type PinnedProductLayer = {
    id: string;
    imageUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    objectFit: "contain" | "cover";
    filter?: string;
};

export type AssetUploadItem = {
    id: string;
    file: File;
    previewUrl: string;
};

export type CatalogueProductResult = {
    animal?: string;
    product_category?: string;
    segment?: string;
    SubClass?: string;
    Brand?: string;
    product_name: string;
    description?: string;
    price?: string;
    product_url?: string;
    upc: number | string;
    product_code?: number;
    image_url: string;
    is_valid?: boolean;
};

export type CatalogueSearchResponse = {
    data?: CatalogueProductResult[];
    row_count?: number;
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

export type ImageTransform = {
    x: number;
    y: number;
    scale: number;
};

export type TextAlignment = "left" | "center" | "right";

export type TextOverlay = {
    id: string;
    text: string;
    fontFamily: string;
    fontSize: number;
    width: number;
    color: string;
    opacity: number;
    x: number;
    y: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    alignment: TextAlignment;
};

export type TextInteraction =
    | {
        mode: "drag";
        textId: string;
        offsetX: number;
        offsetY: number;
    }
    | {
        mode: "resize";
        textId: string;
        startPointerX: number;
        startWidth: number;
        startFontSize: number;
    };

export type EditorSnapshot = {
    activeTemplateId: string | null;
    transform: ImageTransform;
    appliedCropPresetId: string;
    canvasSize: CanvasSize;
    filters: FilterState;
    adjustSettings: AdjustSettings;
    shadowSettings: ShadowSettings;
    reflectionSettings: ReflectionSettings;
    erasedImageUrl: string | null;
    textOverlays: TextOverlay[];
    backgroundSettings: CollageBackgroundSettings;
    backgroundTool: BackgroundTool;
    brushSize: number;
};

export type FilterPresetId =
    | null
    | "grayscale"
    | "sepia"
    | "vintage"
    | "vivid"
    | "cool"
    | "warm"
    | "dramatic"
    | "fade";

export type FilterState = {
    preset: FilterPresetId;
    intensity: number;
};

export type CanvasPreset = {
    name: string;
    ratio: string;
};

export type CropPresetOption = {
    id: string;
    label: string;
    ratioLabel: string;
    ratio: number | null;
};

export type CropPresetGroup = {
    platform: string | null;
    presets: CropPresetOption[];
};
