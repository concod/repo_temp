import { ASPECT_RATIOS } from "../ai-variations/aspectRatios";
import type { AspectRatioOption } from "../ai-variations/types";
import type {
    AdjustSettings,
    CanvasPreset,
    CanvasSize,
    CollageBackgroundSettings,
    CropPresetGroup,
    CropPresetOption,
    FilterPresetId,
    FilterState,
    ImageTopTool,
    ReflectionSettings,
    ShadowSettings,
    TransparentFillSettings,
    AdvancedToolKey,
} from "./advancedEditorTypes";

export const SMART_EDITOR_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";
export const SESSION_IMAGE_KEY = "banner-agent:advanced-editor-source";
export const SESSION_PRODUCT_IMAGES_KEY = "banner-agent:advanced-editor-product-images";
export const DEFAULT_CANVAS: CanvasSize = { width: 1180, height: 700 };
export const MIN_ZOOM = 35;
export const MAX_ZOOM = 140;
export const MIN_IMAGE_SCALE = 0.03;
export const MAX_IMAGE_SCALE = 3;
export const DEFAULT_FILTER_STATE: FilterState = { preset: null, intensity: 80 };
export const TEXT_FONT_FAMILIES = ["Arial", "Helvetica", "Georgia", "Verdana", "Trebuchet MS"];
export const DEFAULT_TRANSPARENT_FILL: TransparentFillSettings = {
    enabled: false,
    type: "solid",
    color: "#ffffff",
    gradientStart: "#667eea",
    gradientEnd: "#764ba2",
    gradientAngle: 135,
    blurAmount: 20,
    pattern: "dots",
};

export const SQUARE_VARIATION: AspectRatioOption =
    ASPECT_RATIOS.find((ratio) => ratio.id === "square-1080") ?? ASPECT_RATIOS[0];

export const DEFAULT_BACKGROUND_SETTINGS: CollageBackgroundSettings = {
    backgroundType: "transparent",
    backgroundColor: "#ffffff",
    backgroundGradientStart: "#ffffff",
    backgroundGradientEnd: "#000000",
    backgroundGradientAngle: 180,
    backgroundImageUrl: null,
    backgroundScaleMode: "cover",
    transparentFill: { ...DEFAULT_TRANSPARENT_FILL },
};

export const FILTER_PRESETS: Array<{ id: FilterPresetId; name: string }> = [
    { id: null, name: "None" },
    { id: "sepia", name: "Sepia" },
    { id: "grayscale", name: "Grayscale" },
    { id: "vivid", name: "Vivid" },
    { id: "warm", name: "Warm" },
    { id: "dramatic", name: "Dramatic" },
    { id: "vintage", name: "Vintage" },
    { id: "cool", name: "Cool" },
    { id: "fade", name: "Fade" },
];

export const RESIZE_CANVAS_PRESETS: CanvasPreset[] = [
    { name: "Square", ratio: "1:1" },
    { name: "Portrait", ratio: "4:5" },
    { name: "Stories", ratio: "9:16" },
    { name: "Social Link", ratio: "1.91:1" },
    { name: "Ads", ratio: "1.2:1" },
    { name: "Std Banner", ratio: "3:1" },
    { name: "Half Page", ratio: "1:2" },
    { name: "Wide Sky", ratio: "4:15" },
    { name: "Lg Banner", ratio: "8:1" },
    { name: "Ultra Leader", ratio: "10.8:1" },
    { name: "Hero (D)", ratio: "4.8:1" },
    { name: "PLP (D)", ratio: "8.35:1" },
    { name: "Skinny (D)", ratio: "19.2:1" },
    { name: "Banner (M)", ratio: "2.64:1" },
    { name: "Skinny (M)", ratio: "3.84:1" },
    { name: "Tall Tiles", ratio: "0.72:1" },
    { name: "Widest", ratio: "3.14:1" },
    { name: "Wide", ratio: "2.05:1" },
];

export const TOOLS: Array<{ id: AdvancedToolKey; label: string }> = [
    { id: "template", label: "Template" },
    { id: "resize", label: "Resize" },
    // { id: "assets", label: "Assets" },
    { id: "background", label: "Background" },
    { id: "text", label: "Text" },
    { id: "filters", label: "Filters" },
    // { id: "layouts", label: "Layouts" },
];

export const IMAGE_TOP_TOOLS: Array<{ id: ImageTopTool; label: string }> = [
    { id: "crop", label: "Crop" },
    { id: "adjust", label: "Adjust" },
    { id: "shadow", label: "Shadow" },
    { id: "reflection", label: "Reflection" },
    { id: "eraser", label: "Eraser" },
];

export const DEFAULT_CROP_PRESET_ID = "free-form";

export const CROP_PRESET_GROUPS: CropPresetGroup[] = [
    {
        platform: null,
        presets: [
            { id: "free-form", label: "Free Form", ratioLabel: "No lock", ratio: null },
            { id: "square", label: "Square", ratioLabel: "1:1", ratio: 1 },
        ],
    },
    {
        platform: "Instagram",
        presets: [
            { id: "ig-portrait", label: "Portrait", ratioLabel: "4:5", ratio: 4 / 5 },
            { id: "ig-landscape", label: "Landscape", ratioLabel: "1.91:1", ratio: 1.91 },
            { id: "ig-story", label: "Story", ratioLabel: "9:16", ratio: 9 / 16 },
            { id: "ig-carousel", label: "Carousel", ratioLabel: "1:1", ratio: 1 },
        ],
    },
    {
        platform: "Facebook",
        presets: [
            { id: "fb-post", label: "Post", ratioLabel: "1.91:1", ratio: 1.91 },
            { id: "fb-cover", label: "Cover", ratioLabel: "2.7:1", ratio: 2.7 },
            { id: "fb-story", label: "Story", ratioLabel: "9:16", ratio: 9 / 16 },
        ],
    },
];

export const CROP_PRESET_LOOKUP: Record<string, CropPresetOption> = CROP_PRESET_GROUPS.reduce(
    (acc, group) => {
        group.presets.forEach((preset) => {
            acc[preset.id] = preset;
        });
        return acc;
    },
    {} as Record<string, CropPresetOption>
);

export const DEFAULT_SHADOW_SETTINGS: ShadowSettings = {
    enabled: true,
    angle: 45,
    distance: 10,
    blur: 10,
    opacity: 80,
    color: "#4a5568",
};

export const DEFAULT_REFLECTION_SETTINGS: ReflectionSettings = {
    enabled: false,
    opacity: 50,
    distance: 0,
    yOffset: 0,
    height: 30,
    blur: 5,
};

export const DEFAULT_ADJUST_SETTINGS: AdjustSettings = {
    brightness: 20,
    contrast: 20,
    saturation: 20,
    hue: 20,
    temperature: 20,
    highlights: 20,
};

export const ADJUST_CONTROLS: Array<{ key: keyof AdjustSettings; label: string; min: number; max: number; disabled?: boolean }> = [
    { key: "brightness", label: "Brightness", min: 0, max: 100 },
    { key: "contrast", label: "Contrast", min: 0, max: 100 },
    { key: "saturation", label: "Saturation", min: 0, max: 100 },
    { key: "hue", label: "Hue", min: 0, max: 100 },
    { key: "temperature", label: "Temperature", min: 0, max: 100 },
    { key: "highlights", label: "Highlights", min: 0, max: 100 },
];

export const BG_REMOVAL_MAX_ATTEMPTS = 2;
export const BG_REMOVAL_RETRY_DELAY_MS = 1500;
export const CATALOGUE_DEBOUNCE_MS = 500;
