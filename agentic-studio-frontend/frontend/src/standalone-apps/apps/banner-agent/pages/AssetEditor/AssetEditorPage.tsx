import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Crop, PixelCrop } from "react-image-crop";
import Topbar from "../../components/Topbar/Topbar.jsx";
import ToolSidebar from "../../components/ToolSidebar/ToolSidebar.jsx";
import EditPanel from "../../components/EditPanel/EditPanel.jsx";
import CanvasArea from "../../components/CanvasArea/CanvasArea.jsx";
import GenerationModal from "../../components/GenerationModal/GenerationModal.jsx";
import VideoGenerationModal from "../../components/VideoGenerationModal/VideoGenerationModal";
import VideoPlayerModal from "../../components/VideoPlayerModal/VideoPlayerModal";
import SaveProjectModal from "../../components/SaveProjectModal/SaveProjectModal";
import { isAllowedPreviewUrl, toProxyGeneratedImageUrl } from "../../features/chatbot/utils/imageUtils";
import { generateEditedImage, generateExpandedImage } from "../../services/imageEditorService";
import { fetchImageAsBlob } from "../../services/topazUpscaleService";
import { useBrandingStore, type BrandingBorderSettings } from "../../store/brandingStore";
import { bannerAgentService, type ProjectApiItem } from "../../services/bannerAgentService";
import { useStandaloneCreativeConfig } from "../../../../shared/packages/marketingCreativeCore/provider";
import "./AssetEditorPage.scss";

type EditorToolKey = "modify" | "text" | "asset" | "erase" | "crop" | "expand";

const EDITOR_TOOL_KEYS: EditorToolKey[] = ["modify", "text", "asset", "erase", "crop", "expand"];

const isEditorToolKey = (value: string | null): value is EditorToolKey => {
    if (!value) return false;
    return EDITOR_TOOL_KEYS.includes(value as EditorToolKey);
};

type UploadedObject = {
    id: string;
    file: File;
    previewUrl: string;
};

type TextElement = {
    id: string;
    content: string;
    prompt: string;
};

type HistoryEntry = {
    id: string;
    imageUrl: string;
    label: string;
};

type CropPreset = {
    id: string;
    label: string;
    aspectRatio: number;
    ratio?: string;
};

type CanvasSize = {
    width: number;
    height: number;
};

type BrandingRenderMetrics = {
    strokeWidth: number;
    distance: number;
    logoPadding: number;
    logoSize: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized[0] + normalized[0], 16),
            g: Number.parseInt(normalized[1] + normalized[1], 16),
            b: Number.parseInt(normalized[2] + normalized[2], 16),
        };
    }

    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized.slice(0, 2), 16),
            g: Number.parseInt(normalized.slice(2, 4), 16),
            b: Number.parseInt(normalized.slice(4, 6), 16),
        };
    }

    return null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
    const normalize = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    return `#${normalize(r)}${normalize(g)}${normalize(b)}`;
};

const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color);
    if (!rgb) {
        return 255;
    }
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

const getBestContrastColor = (backgroundColor: string): string =>
    getLuminance(backgroundColor) > 140 ? "#111827" : "#ffffff";

const sampleEdgeColorFromImage = (imageUrl: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const sampleWidth = 64;
            const sampleHeight = 64;
            canvas.width = sampleWidth;
            canvas.height = sampleHeight;

            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("Canvas context unavailable"));
                return;
            }

            context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
            let imageData: ImageData;
            try {
                imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
            } catch {
                reject(new Error("Image data unavailable"));
                return;
            }

            const data = imageData.data;
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            let count = 0;

            const pushPixel = (x: number, y: number) => {
                const index = (y * sampleWidth + x) * 4;
                const alpha = data[index + 3];
                if (alpha === 0) {
                    return;
                }
                sumR += data[index];
                sumG += data[index + 1];
                sumB += data[index + 2];
                count += 1;
            };

            for (let x = 0; x < sampleWidth; x += 1) {
                pushPixel(x, 0);
                pushPixel(x, sampleHeight - 1);
            }
            for (let y = 1; y < sampleHeight - 1; y += 1) {
                pushPixel(0, y);
                pushPixel(sampleWidth - 1, y);
            }

            if (!count) {
                reject(new Error("No sample pixels"));
                return;
            }

            const averageHex = rgbToHex(sumR / count, sumG / count, sumB / count);
            resolve(getBestContrastColor(averageHex));
        };
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = imageUrl;
    });

const recolorLightPixelsInLogo = (logoUrl: string, colorHex: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("Canvas context unavailable"));
                return;
            }
            context.drawImage(image, 0, 0);
            let imageData: ImageData;
            try {
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
                reject(new Error("Image data unavailable"));
                return;
            }
            const rgb = hexToRgb(colorHex);
            if (!rgb) {
                reject(new Error("Invalid color"));
                return;
            }
            const data = imageData.data;
            for (let index = 0; index < data.length; index += 4) {
                const alpha = data[index + 3];
                if (alpha === 0) continue;
                const avg = (data[index] + data[index + 1] + data[index + 2]) / 3;
                if (avg > 190) {
                    data[index] = rgb.r;
                    data[index + 1] = rgb.g;
                    data[index + 2] = rgb.b;
                }
            }
            context.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("Failed to load logo"));
        image.src = logoUrl;
    });

const getBrandingMetrics = (canvasSize: CanvasSize, settings: BrandingBorderSettings): BrandingRenderMetrics => {
    const minDim = Math.max(1, Math.min(canvasSize.width, canvasSize.height));
    const strokeWidth = clamp(settings.weight, 1, minDim * 0.025);
    const distance = Math.max(strokeWidth / 2, Math.min(settings.distance, minDim * 0.1));
    const logoPadding = Math.min(12, Math.max(4, minDim * 0.03));
    const rawLogoSize = Math.max(16, settings.logoSize);

    const availableSpace = Math.max(0, minDim - (distance + logoPadding) * 2);
    const aspectRatio = canvasSize.width / Math.max(1, canvasSize.height);
    const heightConstraintRatio =
        aspectRatio > 7 ? 0.15 : aspectRatio > 3 ? 0.2 : aspectRatio > 1.5 ? 0.25 : 0.3;
    const heightConstraint = canvasSize.height * heightConstraintRatio;
    const widthConstraint = canvasSize.width * 0.08;
    const minLogoSize = Math.max(20, minDim * 0.03);

    const logoSize = Math.max(
        minLogoSize,
        Math.min(rawLogoSize, availableSpace * 0.35, heightConstraint, widthConstraint)
    );

    return {
        strokeWidth,
        distance,
        logoPadding,
        logoSize,
    };
};

const getBrandingLogoPlacement = (
    canvasSize: CanvasSize,
    settings: BrandingBorderSettings,
    metrics: BrandingRenderMetrics
) => {
    const { distance, logoPadding, logoSize } = metrics;

    const left = distance + logoPadding + settings.logoOffsetX;
    const right = canvasSize.width - (distance + logoPadding - settings.logoOffsetX) - logoSize;
    const top = distance + logoPadding + settings.logoOffsetY;
    const bottom = canvasSize.height - (distance + logoPadding - settings.logoOffsetY) - logoSize;

    if (settings.logoPosition === "top-left") {
        return { x: left, y: top, size: logoSize };
    }
    if (settings.logoPosition === "top-right") {
        return { x: right, y: top, size: logoSize };
    }
    if (settings.logoPosition === "bottom-left") {
        return { x: left, y: bottom, size: logoSize };
    }

    return { x: right, y: bottom, size: logoSize };
};

const loadImageFromBlob = (blob: Blob): Promise<{ image: HTMLImageElement; objectUrl: string }> =>
    new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            resolve({ image, objectUrl });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for download."));
        };

        image.src = objectUrl;
    });

const DEFAULT_CROP: Crop = {
    unit: "%",
    x: 5,
    y: 5,
    width: 90,
    height: 90,
};

const CROP_PRESET_GROUPS: Array<{ label: string; presets: CropPreset[] }> = [
    {
        label: "Quick",
        presets: [
            { id: "free", label: "Free Form", aspectRatio: 0, ratio: "Any" },
            { id: "square", label: "Square", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "Instagram",
        presets: [
            { id: "instagram_portrait", label: "Portrait", aspectRatio: 4 / 5, ratio: "4:5" },
            { id: "instagram_landscape", label: "Landscape", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "instagram_story", label: "Story", aspectRatio: 9 / 16, ratio: "9:16" },
            { id: "instagram_carousel", label: "Carousel", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "Facebook",
        presets: [
            { id: "facebook_post", label: "Post", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "facebook_cover", label: "Cover", aspectRatio: 2.7, ratio: "2.7:1" },
            { id: "facebook_story", label: "Story", aspectRatio: 9 / 16, ratio: "9:16" },
        ],
    },
    {
        label: "LinkedIn",
        presets: [
            { id: "linkedin_post", label: "Post", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "linkedin_cover", label: "Cover", aspectRatio: 4, ratio: "4:1" },
            { id: "linkedin_company", label: "Company", aspectRatio: 1128 / 191, ratio: "5.91:1" },
        ],
    },
    {
        label: "Twitter",
        presets: [
            { id: "twitter_post", label: "Post", aspectRatio: 16 / 9, ratio: "16:9" },
            { id: "twitter_card", label: "Card", aspectRatio: 2, ratio: "2:1" },
            { id: "twitter_header", label: "Header", aspectRatio: 3, ratio: "3:1" },
        ],
    },
    {
        label: "TikTok",
        presets: [
            { id: "tiktok_video", label: "Video", aspectRatio: 9 / 16, ratio: "9:16" },
            { id: "tiktok_profile", label: "Profile", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "YouTube",
        presets: [
            { id: "youtube_video", label: "Video", aspectRatio: 16 / 9, ratio: "16:9" },
            { id: "youtube_banner", label: "Banner", aspectRatio: 2560 / 400, ratio: "6.4:1" },
        ],
    },
    {
        label: "Pinterest",
        presets: [
            { id: "pinterest_pin", label: "Pin", aspectRatio: 2 / 3, ratio: "2:3" },
            { id: "pinterest_square", label: "Square", aspectRatio: 1, ratio: "1:1" },
        ],
    },
];

const findCropPreset = (id: string) => {
    for (const group of CROP_PRESET_GROUPS) {
        const preset = group.presets.find((item) => item.id === id);
        if (preset) {
            return preset;
        }
    }
    return CROP_PRESET_GROUPS[0].presets[0];
};

const createTextElement = (): TextElement => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: "",
    prompt: "",
});

const createHistoryEntry = (imageUrl: string, label: string): HistoryEntry => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    imageUrl,
    label,
});

const getHistoryLabel = (tool: EditorToolKey, variantIndex: number, total: number): string => {
    const baseLabelMap: Record<EditorToolKey, string> = {
        modify: "Modify",
        text: "Text",
        asset: "Asset",
        erase: "Erase",
        crop: "Crop",
        expand: "Expand",
    };
    const base = baseLabelMap[tool] || "Edit";
    if (total <= 1) {
        return base;
    }
    return `${base} ${variantIndex + 1}`;
};

const toSafeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const getAssetCountLabel = (value?: number | string | null): string => {
    const parsed = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number.parseInt(value, 10)
            : 0;
    const count = Number.isFinite(parsed) ? parsed : 0;
    return `${count} ${count === 1 ? "asset" : "assets"}`;
};

const loadVideoDimensions = (videoUrl: string): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
        if (!videoUrl) {
            resolve(null);
            return;
        }

        const video = document.createElement("video");
        video.preload = "metadata";
        video.crossOrigin = "anonymous";

        const cleanup = () => {
            video.removeAttribute("src");
            video.load();
        };

        video.onloadedmetadata = () => {
            resolve({
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
            });
            cleanup();
        };

        video.onerror = () => {
            resolve(null);
            cleanup();
        };

        video.src = videoUrl;
    });

const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};

type SavedEditorState = {
    imageUrl: string;
    activeImageUrl: string;
    originalImageUrl: string;
    imageHistory: HistoryEntry[];
    activeHistoryIndex: number;
};

// Module-level cache: survives SPA route navigations but clears on full page reload.
// This avoids sessionStorage size limits when history entries contain large data: URIs.
let cachedEditorState: SavedEditorState | null = null;

const saveEditorState = (state: SavedEditorState) => {
    cachedEditorState = state;
};

const loadEditorState = (imageUrl: string): SavedEditorState | null => {
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

export default function AssetEditorPage() {
    const { isCreateAdEnabledInAssetEditor } = useStandaloneCreativeConfig();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const brandingSettings = useBrandingStore((state) => state.settings);
    const setBrandingEnabled = useBrandingStore((state) => state.setEnabled);
    const [activeTool, setActiveTool] = useState<EditorToolKey>(() => {
        const toolParam = searchParams.get("tool");
        return isEditorToolKey(toolParam) ? toolParam : "modify";
    });
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [variations, setVariations] = useState(4);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationModalOpen, setGenerationModalOpen] = useState(false);
    const [generationItems, setGenerationItems] = useState<Array<{ imageUrl: string }>>([]);
    const [activeImageUrl, setActiveImageUrl] = useState("");
    const [originalImageUrl, setOriginalImageUrl] = useState("");
    const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
    const [textElements, setTextElements] = useState<TextElement[]>([createTextElement()]);
    const [removeExistingTexts, setRemoveExistingTexts] = useState(false);
    const [objectRemovalMask, setObjectRemovalMask] = useState<string | null>(null);
    const [addedObjectImages, setAddedObjectImages] = useState<UploadedObject[]>([]);
    const [addedObjectPrompt, setAddedObjectPrompt] = useState("");
    const [optimizeForPets, setOptimizeForPets] = useState(false);
    const [brushSize, setBrushSize] = useState(30);
    const [expandWidth, setExpandWidth] = useState(1080);
    const [expandHeight, setExpandHeight] = useState(1080);
    const [expandZoom, setExpandZoom] = useState(1);
    const [expandPosition, setExpandPosition] = useState({ x: 0, y: 0 });
    const [expandPreset, setExpandPreset] = useState<string | null>(null);
    const [selectedCropPreset, setSelectedCropPreset] = useState<string>("free");
    const [isCropOverlayVisible, setIsCropOverlayVisible] = useState(true);
    const [cropSelection, setCropSelection] = useState<Crop>(DEFAULT_CROP);
    const [cropPixelSelection, setCropPixelSelection] = useState<PixelCrop | null>(null);
    const [cropImageElement, setCropImageElement] = useState<HTMLImageElement | null>(null);
    const [isApplyingCrop, setIsApplyingCrop] = useState(false);
    const [imageHistory, setImageHistory] = useState<HistoryEntry[]>([]);
    const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(-1);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [cropToastVersion, setCropToastVersion] = useState(0);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState("");
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveProjects, setSaveProjects] = useState<ProjectApiItem[]>([]);
    const [isSaveProjectsLoading, setIsSaveProjectsLoading] = useState(false);
    const [saveProjectsError, setSaveProjectsError] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [assetName, setAssetName] = useState("");
    const [assetDescription, setAssetDescription] = useState("");
    const [saveError, setSaveError] = useState("");
    const [isSavingAsset, setIsSavingAsset] = useState(false);
    const cancelRef = useRef(false);
    const generationAbortControllerRef = useRef<AbortController | null>(null);

    const imageParam = searchParams.get("img")?.trim() || "";

    const imageUrl = useMemo(() => {
        if (!imageParam) return "";

        // Support both raw and pre-encoded image URL forms.
        let normalized = imageParam;
        if (imageParam.includes("%")) {
            try {
                normalized = decodeURIComponent(imageParam);
            } catch {
                return "";
            }
        }

        const proxied = toProxyGeneratedImageUrl(normalized);
        return isAllowedPreviewUrl(proxied) ? proxied : "";
    }, [imageParam]);

    useEffect(() => {
        const saved = loadEditorState(imageUrl);
        if (saved) {
            setActiveImageUrl(saved.activeImageUrl);
            setOriginalImageUrl(saved.originalImageUrl);
            setImageHistory(saved.imageHistory);
            setActiveHistoryIndex(saved.activeHistoryIndex);
        } else {
            setActiveImageUrl(imageUrl);
            setOriginalImageUrl(imageUrl);
            setImageHistory([]);
            setActiveHistoryIndex(imageUrl ? -1 : -1);
        }
        setIsCropOverlayVisible(true);
        setObjectRemovalMask(null);
        setIsHistoryOpen(false);
    }, [imageUrl]);

    const handleCropPresetSelect = useCallback((presetId: string) => {
        setSelectedCropPreset(presetId);
        setIsCropOverlayVisible(true);
    }, []);

    useEffect(() => {
        const toolParam = searchParams.get("tool");
        if (!isEditorToolKey(toolParam) || toolParam === activeTool) {
            return;
        }
        setActiveTool(toolParam);
    }, [searchParams]);

    const handleToolSelect = useCallback((tool: string) => {
        if (!isEditorToolKey(tool)) {
            return;
        }

        const nextParams = new URLSearchParams(searchParams);
        if (nextParams.get("tool") !== tool) {
            nextParams.set("tool", tool);
            setSearchParams(nextParams, { replace: true });
        }

        setActiveTool(tool);
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        if (activeTool !== "expand" || !activeImageUrl) return;

        const image = new Image();
        image.onload = () => {
            setExpandWidth(image.naturalWidth || 1080);
            setExpandHeight(image.naturalHeight || 1080);
            setExpandZoom(1);
            setExpandPosition({ x: 0, y: 0 });
            setExpandPreset(null);
        };
        image.src = activeImageUrl;
    }, [activeTool, activeImageUrl]);

    useEffect(() => {
        let isMounted = true;

        const hydrateSourceFile = async () => {
            if (!activeImageUrl) {
                setSourceImageFile(null);
                return;
            }

            try {
                const response = await fetch(activeImageUrl);
                if (!response.ok) {
                    throw new Error(`Unable to fetch source image (${response.status})`);
                }

                const blob = await response.blob();
                if (!isMounted) return;

                const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
                const sourceFile = new File([blob], `asset-editor-source.${ext}`, {
                    type: blob.type || "image/jpeg",
                });
                setSourceImageFile(sourceFile);
            } catch {
                if (isMounted) {
                    setSourceImageFile(null);
                }
            }
        };

        hydrateSourceFile();

        return () => {
            isMounted = false;
        };
    }, [activeImageUrl]);

    const canUndo = activeHistoryIndex >= 0;
    const canRedo = activeHistoryIndex < imageHistory.length - 1;

    const setActiveFromHistoryIndex = useCallback((index: number) => {
        if (index < -1 || index >= imageHistory.length) {
            return;
        }

        if (index === -1) {
            if (!originalImageUrl) {
                return;
            }
            setActiveHistoryIndex(-1);
            setActiveImageUrl(originalImageUrl);
            return;
        }

        const item = imageHistory[index];
        if (!item) {
            return;
        }
        setActiveHistoryIndex(index);
        setActiveImageUrl(item.imageUrl);
    }, [imageHistory, originalImageUrl]);

    const commitHistoryImages = (nextImageUrls: string[], tool: EditorToolKey) => {
        const sanitizedUrls = nextImageUrls.filter(Boolean);
        if (sanitizedUrls.length === 0) {
            return;
        }

        setImageHistory((prev) => {
            const base = prev.slice(0, activeHistoryIndex + 1);
            const nextEntries = sanitizedUrls.map((url, index) =>
                createHistoryEntry(url, getHistoryLabel(tool, index, sanitizedUrls.length))
            );
            const nextHistory = [...base, ...nextEntries];
            const finalIndex = nextHistory.length - 1;
            setActiveHistoryIndex(finalIndex);
            setActiveImageUrl(nextHistory[finalIndex].imageUrl);
            return nextHistory;
        });
    };

    const textEntries = useMemo(
        () => textElements.filter((item) => item.content.trim()),
        [textElements]
    );

    const isGenerateDisabled = useMemo(() => {
        if (!sourceImageFile) return true;

        if (activeTool === "text") {
            return !removeExistingTexts && textEntries.length === 0;
        }

        if (activeTool === "erase") {
            return !objectRemovalMask;
        }

        if (activeTool === "asset") {
            return addedObjectImages.length === 0 || !addedObjectPrompt.trim();
        }

        if (activeTool === "expand") {
            return expandWidth <= 0 || expandHeight <= 0;
        }

        if (activeTool === "crop") {
            return true;
        }

        return false;
    }, [activeTool, addedObjectImages.length, addedObjectPrompt, expandHeight, expandWidth, objectRemovalMask, removeExistingTexts, sourceImageFile, textEntries.length]);

    const isApplyCropDisabled = useMemo(() => {
        if (!cropImageElement) {
            return true;
        }

        if (cropPixelSelection) {
            return cropPixelSelection.width < 1 || cropPixelSelection.height < 1;
        }

        return !(cropSelection.width && cropSelection.height);
    }, [cropImageElement, cropPixelSelection, cropSelection.height, cropSelection.width]);

    const selectedCropPresetConfig = useMemo(
        () => findCropPreset(selectedCropPreset),
        [selectedCropPreset]
    );

    const isPetOptimizationVisible = useMemo(() => {
        const host = typeof window === "undefined" ? "" : window.location.hostname.toLowerCase();
        return host.includes("sop") || host.includes("tsc");
    }, []);

    const saveProjectOptions = useMemo(() => {
        return saveProjects.map((project, index) => {
            const projectId = toSafeString(project?.id) || `project-${index}`;
            return {
                id: projectId,
                name: toSafeString(project?.project_name) || "Untitled project",
                description: toSafeString(project?.description),
                assetCountLabel: getAssetCountLabel(project?.asset_count),
                canSelect: Boolean(toSafeString(project?.id)),
            };
        });
    }, [saveProjects]);

    const handleAddObjectFiles = (files: File[]) => {
        if (!files || files.length === 0) return;
        const nextItems: UploadedObject[] = files
            .filter((file) => file.type.startsWith("image/"))
            .map((file) => ({
                id: typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                file,
                previewUrl: URL.createObjectURL(file),
            }));

        if (nextItems.length === 0) return;

        setAddedObjectImages((prev) => [...prev, ...nextItems]);
    };

    const handleRemoveAddedObject = (id: string) => {
        setAddedObjectImages((prev) => {
            const item = prev.find((entry) => entry.id === id);
            if (item) {
                URL.revokeObjectURL(item.previewUrl);
            }
            return prev.filter((entry) => entry.id !== id);
        });
    };

    const handleGenerate = async () => {
        if (!sourceImageFile || isGenerating || isGenerateDisabled) {
            return;
        }

        const abortController = new AbortController();
        generationAbortControllerRef.current = abortController;
        cancelRef.current = false;
        setIsGenerating(true);
        const requestedVariations = activeTool === "text" || activeTool === "erase" || activeTool === "expand" || activeTool === "asset" ? 1 : variations;
        const showResultsInModal = activeTool !== "text" && activeTool !== "erase" && activeTool !== "expand" && activeTool !== "asset";

        setGenerationModalOpen(showResultsInModal);
        if (showResultsInModal) {
            setGenerationItems(Array.from({ length: requestedVariations }, () => ({ imageUrl: "" })));
        }

        const nextImages: string[] = [];

        try {
            for (let index = 0; index < requestedVariations; index += 1) {
                if (cancelRef.current) break;

                const { finalImageUrl } = activeTool === "expand"
                    ? await generateExpandedImage(sourceImageFile, {
                        targetWidth: expandWidth,
                        targetHeight: expandHeight,
                        zoom: expandZoom,
                        position: expandPosition,
                    }, abortController.signal)
                    : await generateEditedImage(sourceImageFile, {
                        prompt: activeTool === "modify" ? prompt.trim() : "",
                        negativePrompt: negativePrompt.trim(),
                        preserveMaxDetail: true,
                        customTexts: activeTool === "text"
                            ? textEntries.map((item) => ({
                                content: item.content.trim(),
                                prompt: item.prompt.trim(),
                            }))
                            : [],
                        removeAllText: activeTool === "text" ? removeExistingTexts : false,
                        addedObjectImages: activeTool === "asset"
                            ? addedObjectImages.map((item) => item.file)
                            : [],
                        addedObjectPrompt: activeTool === "asset"
                            ? addedObjectPrompt.trim()
                            : "",
                        newProductImage: null,
                        replacementPrompt: "",
                        objectRemovalMask: activeTool === "erase"
                            ? objectRemovalMask
                            : null,
                        optimizeForPets: activeTool === "asset" ? optimizeForPets : false,
                        preserveExistingToys: activeTool === "modify",
                    }, abortController.signal);

                nextImages.push(finalImageUrl);

                if (showResultsInModal) {
                    setGenerationItems((prev) => {
                        const draft = [...prev];
                        draft[index] = { imageUrl: finalImageUrl };
                        return draft;
                    });
                }
            }

            if (nextImages.length > 0) {
                commitHistoryImages(nextImages, activeTool);

                // Reset transient masks after applying an edit so the new result is visible immediately.
                if (activeTool === "erase") {
                    setObjectRemovalMask(null);
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                return;
            }
            // Keep modal state and partial results so users can inspect generated variations.
        } finally {
            if (generationAbortControllerRef.current === abortController) {
                generationAbortControllerRef.current = null;
            }
            setIsGenerating(false);
        }
    };

    const downloadImage = async (imageUrlToDownload: string, filename: string) => {
        if (!imageUrlToDownload) {
            return;
        }

        const nextFilename = `${filename || "banner-agent-edit"}-${Date.now()}.png`;

        const triggerBlobDownload = (blob: Blob, resolvedFilename: string) => {
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = resolvedFilename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => {
                URL.revokeObjectURL(objectUrl);
            }, 150);
        };

        const downloadOriginal = async () => {
            const blob = await fetchImageAsBlob(imageUrlToDownload);
            triggerBlobDownload(blob, nextFilename);
        };

        if (!brandingSettings.enabled) {
            await downloadOriginal();
            return;
        }

        const downloadWithBranding = async () => {
            const effectiveColor = brandingSettings.autoColor
                ? await sampleEdgeColorFromImage(imageUrlToDownload).catch(() => brandingSettings.color)
                : brandingSettings.color;
            const processedLogoUrl = brandingSettings.logoEnabled && brandingSettings.logoUrl
                ? await recolorLightPixelsInLogo(brandingSettings.logoUrl, effectiveColor).catch(() => brandingSettings.logoUrl)
                : brandingSettings.logoUrl;
            const sourceBlob = await fetchImageAsBlob(imageUrlToDownload);
            const { image: sourceImage, objectUrl: sourceObjectUrl } = await loadImageFromBlob(sourceBlob);
            const canvas = document.createElement("canvas");
            canvas.width = sourceImage.naturalWidth || sourceImage.width || 1;
            canvas.height = sourceImage.naturalHeight || sourceImage.height || 1;
            const context = canvas.getContext("2d");

            if (!context) {
                URL.revokeObjectURL(sourceObjectUrl);
                return;
            }

            context.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);

            if (brandingSettings.enabled) {
                const metrics = getBrandingMetrics({ width: canvas.width, height: canvas.height }, brandingSettings);
                const inset = metrics.distance + metrics.strokeWidth / 2;

                if (metrics.strokeWidth > 0) {
                    context.save();
                    context.strokeStyle = effectiveColor;
                    context.lineWidth = metrics.strokeWidth;
                    context.strokeRect(
                        inset,
                        inset,
                        Math.max(0, canvas.width - inset * 2),
                        Math.max(0, canvas.height - inset * 2)
                    );
                    context.restore();
                }

                if (brandingSettings.logoEnabled && processedLogoUrl) {
                    try {
                        const logoBlob = await fetchImageAsBlob(processedLogoUrl);
                        const { image: logoImage, objectUrl: logoObjectUrl } = await loadImageFromBlob(logoBlob);
                        const placement = getBrandingLogoPlacement(
                            { width: canvas.width, height: canvas.height },
                            brandingSettings,
                            metrics
                        );
                        const ratio = logoImage.naturalWidth / Math.max(1, logoImage.naturalHeight);
                        const drawWidth = ratio >= 1 ? placement.size : placement.size * ratio;
                        const drawHeight = ratio >= 1 ? placement.size / ratio : placement.size;
                        const drawX = placement.x + (placement.size - drawWidth) / 2;
                        const drawY = placement.y + (placement.size - drawHeight) / 2;
                        context.drawImage(logoImage, drawX, drawY, drawWidth, drawHeight);
                        URL.revokeObjectURL(logoObjectUrl);
                    } catch {
                        // Skip logo rendering on failure, keep border output.
                    }
                }
            }

            URL.revokeObjectURL(sourceObjectUrl);
            const dataUrl = canvas.toDataURL("image/png", 1);
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = nextFilename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        };

        await downloadWithBranding();
    };

    const handleApplyCrop = async () => {
        if (!cropImageElement || isApplyingCrop) {
            return;
        }

        setIsApplyingCrop(true);

        try {
            const fallbackPixelCrop = {
                x: ((cropSelection.x || 0) / 100) * cropImageElement.width,
                y: ((cropSelection.y || 0) / 100) * cropImageElement.height,
                width: ((cropSelection.width || 0) / 100) * cropImageElement.width,
                height: ((cropSelection.height || 0) / 100) * cropImageElement.height,
            };

            const effectivePixelCrop = cropPixelSelection || fallbackPixelCrop;
            if (effectivePixelCrop.width < 1 || effectivePixelCrop.height < 1) {
                return;
            }

            const scaleX = cropImageElement.naturalWidth / cropImageElement.width;
            const scaleY = cropImageElement.naturalHeight / cropImageElement.height;

            const sourceX = Math.round(effectivePixelCrop.x * scaleX);
            const sourceY = Math.round(effectivePixelCrop.y * scaleY);
            const sourceWidth = Math.max(1, Math.round(effectivePixelCrop.width * scaleX));
            const sourceHeight = Math.max(1, Math.round(effectivePixelCrop.height * scaleY));

            const canvas = document.createElement("canvas");
            canvas.width = sourceWidth;
            canvas.height = sourceHeight;
            const context = canvas.getContext("2d", {
                alpha: true,
                willReadFrequently: false,
            });

            if (!context) {
                return;
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            let croppedImageUrl = "";

            try {
                context.drawImage(
                    cropImageElement,
                    sourceX,
                    sourceY,
                    sourceWidth,
                    sourceHeight,
                    0,
                    0,
                    sourceWidth,
                    sourceHeight
                );
                croppedImageUrl = canvas.toDataURL("image/jpeg", 0.99);
            } catch {
                if (!sourceImageFile) {
                    return;
                }

                const localImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const localUrl = URL.createObjectURL(sourceImageFile);
                    const image = new Image();
                    image.onload = () => {
                        URL.revokeObjectURL(localUrl);
                        resolve(image);
                    };
                    image.onerror = () => {
                        URL.revokeObjectURL(localUrl);
                        reject(new Error("Unable to load local source image for crop."));
                    };
                    image.src = localUrl;
                });

                context.clearRect(0, 0, sourceWidth, sourceHeight);
                context.drawImage(
                    localImage,
                    sourceX,
                    sourceY,
                    sourceWidth,
                    sourceHeight,
                    0,
                    0,
                    sourceWidth,
                    sourceHeight
                );
                croppedImageUrl = canvas.toDataURL("image/jpeg", 0.99);
            }

            if (!croppedImageUrl) {
                return;
            }

            commitHistoryImages([croppedImageUrl], "crop");
            setCropImageElement(null);
            setCropPixelSelection(null);
            setIsCropOverlayVisible(false);
            setIsHistoryOpen(false);
            setCropToastVersion((prev) => prev + 1);
        } finally {
            setIsApplyingCrop(false);
        }
    };

    const handleUndo = useCallback(() => {
        if (!canUndo) {
            return;
        }

        const nextIndex = activeHistoryIndex - 1;
        setActiveFromHistoryIndex(nextIndex);
    }, [activeHistoryIndex, canUndo, setActiveFromHistoryIndex]);

    const handleRedo = useCallback(() => {
        if (!canRedo) {
            return;
        }

        const nextIndex = activeHistoryIndex + 1;
        setActiveFromHistoryIndex(nextIndex);
    }, [activeHistoryIndex, canRedo, setActiveFromHistoryIndex]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey)) {
                return;
            }

            if (isTypingTarget(event.target)) {
                return;
            }

            const key = event.key.toLowerCase();
            const isUndoShortcut = key === "z" && !event.shiftKey;
            const isRedoShortcut = (key === "z" && event.shiftKey) || key === "y";

            if (isUndoShortcut) {
                event.preventDefault();
                handleUndo();
                return;
            }

            if (isRedoShortcut) {
                event.preventDefault();
                handleRedo();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [handleRedo, handleUndo]);

    const handleAbortGeneration = () => {
        cancelRef.current = true;
        generationAbortControllerRef.current?.abort();
        generationAbortControllerRef.current = null;
        setIsGenerating(false);
        setGenerationModalOpen(false);
    };

    const handleTextElementAdd = () => {
        setTextElements((prev) => [...prev, createTextElement()]);
    };

    const handleTextElementRemove = (id: string) => {
        setTextElements((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((item) => item.id !== id);
        });
    };

    const handleTextElementChange = (id: string, field: "content" | "prompt", value: string) => {
        setTextElements((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
        );
    };

    const handleCreateAd = useCallback(() => {
        // Persist editor state so it can be restored when the user comes back
        saveEditorState({
            imageUrl,
            activeImageUrl,
            originalImageUrl,
            imageHistory,
            activeHistoryIndex,
        });

        const nextBasePath = "../advanced-editor?mode=banner";
        if (!activeImageUrl) {
            navigate(nextBasePath, { relative: "path" });
            return;
        }

        const shouldUseSession = activeImageUrl.startsWith("data:") || activeImageUrl.length > 1800;
        if (shouldUseSession) {
            window.sessionStorage.setItem("banner-agent:advanced-editor-source", activeImageUrl);
            navigate(`${nextBasePath}&source=session`, { relative: "path" });
            return;
        }

        navigate(`${nextBasePath}&img=${encodeURIComponent(activeImageUrl)}`, { relative: "path" });
    }, [activeImageUrl, activeHistoryIndex, imageHistory, imageUrl, navigate, originalImageUrl]);

    const openSaveModal = useCallback(() => {
        if (!generatedVideoUrl) {
            return;
        }
        setIsSaveModalOpen(true);
        setSaveError("");
        setSaveProjectsError("");
        setSelectedProjectId("");
        setAssetName("");
        setAssetDescription("");
    }, [generatedVideoUrl]);

    const closeSaveModal = useCallback((force = false) => {
        if (isSavingAsset && !force) {
            return;
        }
        setIsSaveModalOpen(false);
        setSaveError("");
        setSaveProjectsError("");
        setSelectedProjectId("");
        setAssetName("");
        setAssetDescription("");
    }, [isSavingAsset]);

    useEffect(() => {
        if (!isSaveModalOpen) {
            return;
        }

        let isMounted = true;
        const loadProjects = async () => {
            setIsSaveProjectsLoading(true);
            setSaveProjectsError("");
            try {
                const response = await bannerAgentService.fetchProjects();
                const items = Array.isArray(response?.projects) ? response.projects : [];
                if (!isMounted) return;
                setSaveProjects(items);
                setSelectedProjectId((prev) => prev || toSafeString(items[0]?.id));
            } catch (loadError) {
                if (!isMounted) return;
                const errorMessage = loadError instanceof Error
                    ? loadError.message
                    : "Unable to load projects.";
                setSaveProjectsError(errorMessage);
                setSaveProjects([]);
            } finally {
                if (isMounted) {
                    setIsSaveProjectsLoading(false);
                }
            }
        };

        void loadProjects();

        return () => {
            isMounted = false;
        };
    }, [isSaveModalOpen]);

    useEffect(() => {
        if (!isSaveModalOpen) {
            return;
        }

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeSaveModal();
            }
        };

        document.addEventListener("keydown", handleKeydown);
        return () => {
            document.removeEventListener("keydown", handleKeydown);
        };
    }, [closeSaveModal, isSaveModalOpen]);

    const handleSaveVideoAsset = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (isSavingAsset) {
            return;
        }

        const trimmedName = assetName.trim();
        if (!trimmedName) {
            setSaveError("Asset name is required.");
            return;
        }

        if (!selectedProjectId) {
            setSaveError("Select a project to save this asset.");
            return;
        }

        if (!generatedVideoUrl) {
            setSaveError("No video available to save.");
            return;
        }

        setIsSavingAsset(true);
        setSaveError("");

        try {
            const trimmedDescription = assetDescription.trim();
            const dimensions = await loadVideoDimensions(generatedVideoUrl);
            const dimensionLabel = dimensions && dimensions.width > 0 && dimensions.height > 0
                ? `${dimensions.width}x${dimensions.height}`
                : "";
            const originalUrl = toSafeString(activeImageUrl) || toSafeString(originalImageUrl);

            await bannerAgentService.createProjectAsset(selectedProjectId, {
                asset_name: trimmedName,
                ...(trimmedDescription ? { description: trimmedDescription } : {}),
                metadata: {
                    image_data: generatedVideoUrl,
                    source: "editor",
                    dimensions: dimensionLabel,
                    ...(originalUrl ? { original_url: originalUrl } : {}),
                    type: "video",
                    video_url: generatedVideoUrl,
                },
            });

            closeSaveModal(true);
        } catch (saveAssetError) {
            const message = saveAssetError instanceof Error
                ? saveAssetError.message
                : "Unable to save asset.";
            setSaveError(message);
        } finally {
            setIsSavingAsset(false);
        }
    }, [
        activeImageUrl,
        assetDescription,
        assetName,
        closeSaveModal,
        generatedVideoUrl,
        isSavingAsset,
        originalImageUrl,
        selectedProjectId,
    ]);

    const handleOpenVideoModal = useCallback(() => {
        if (!activeImageUrl) {
            return;
        }

        setVideoModalOpen(true);
    }, [activeImageUrl]);

    const handleVideoGenerated = useCallback((videoUrl: string) => {
        setGeneratedVideoUrl(videoUrl);
        setVideoPlayerOpen(true);
    }, []);

    return (
        <section className="asset-editor-page">
            <Topbar
                onCreateAd={handleCreateAd}
                onConvertToVideo={handleOpenVideoModal}
                canConvertToVideo={!!activeImageUrl && !isGenerating}
                canCreateAd={isCreateAdEnabledInAssetEditor}
                brandingEnabled={brandingSettings.enabled}
                onBrandingToggle={setBrandingEnabled}
            />

            <div className="asset-editor-page__content">
                <ToolSidebar activeItem={activeTool} onSelect={handleToolSelect} />
                <EditPanel
                    activeTool={activeTool}
                    prompt={prompt}
                    negativePrompt={negativePrompt}
                    variations={variations}
                    brushSize={brushSize}
                    onPromptChange={setPrompt}
                    onNegativePromptChange={setNegativePrompt}
                    onVariationsChange={setVariations}
                    onBrushSizeChange={setBrushSize}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    isGenerateDisabled={isGenerateDisabled}
                    textElements={textElements}
                    removeExistingTexts={removeExistingTexts}
                    onTextElementAdd={handleTextElementAdd}
                    onTextElementRemove={handleTextElementRemove}
                    onTextElementChange={handleTextElementChange}
                    onRemoveExistingTextsChange={setRemoveExistingTexts}
                    expandWidth={expandWidth}
                    expandHeight={expandHeight}
                    expandZoom={expandZoom}
                    expandPreset={expandPreset}
                    onExpandWidthChange={(value: number) => {
                        setExpandWidth(value);
                        setExpandPreset(null);
                    }}
                    onExpandHeightChange={(value: number) => {
                        setExpandHeight(value);
                        setExpandPreset(null);
                    }}
                    onExpandZoomChange={setExpandZoom}
                    onExpandPresetSelect={(preset: string, width: number, height: number) => {
                        setExpandPreset(preset);
                        setExpandWidth(width);
                        setExpandHeight(height);
                    }}
                    addedObjectImages={addedObjectImages}
                    onAddObjectFiles={handleAddObjectFiles}
                    onRemoveAddedObject={handleRemoveAddedObject}
                    addedObjectPrompt={addedObjectPrompt}
                    onAddedObjectPromptChange={setAddedObjectPrompt}
                    optimizeForPets={optimizeForPets}
                    onOptimizeForPetsChange={setOptimizeForPets}
                    showOptimizeForPets={isPetOptimizationVisible}
                    cropPresetGroups={CROP_PRESET_GROUPS}
                    selectedCropPreset={selectedCropPreset}
                    onCropPresetSelect={handleCropPresetSelect}
                    onApplyCrop={handleApplyCrop}
                    isApplyingCrop={isApplyingCrop}
                    isApplyCropDisabled={isApplyCropDisabled || !isCropOverlayVisible}
                />
                <CanvasArea
                    activeTool={activeTool}
                    imageUrl={activeImageUrl}
                    onDownloadImage={() => {
                        void downloadImage(activeImageUrl, "banner-agent-current-edit");
                    }}
                    canDownload={Boolean(activeImageUrl)}
                    brandingSettings={brandingSettings}
                    isGenerating={isGenerating && (activeTool === "text" || activeTool === "erase" || activeTool === "expand")}
                    brushSize={brushSize}
                    onMaskChange={setObjectRemovalMask}
                    initialMaskDataUrl={objectRemovalMask}
                    expandWidth={expandWidth}
                    expandHeight={expandHeight}
                    expandZoom={expandZoom}
                    expandPosition={expandPosition}
                    onExpandPositionChange={setExpandPosition}
                    cropSelection={cropSelection}
                    onCropSelectionChange={setCropSelection}
                    onCropCompleteChange={setCropPixelSelection}
                    selectedCropPresetId={selectedCropPreset}
                    selectedCropPresetAspect={selectedCropPresetConfig.aspectRatio > 0 ? selectedCropPresetConfig.aspectRatio : undefined}
                    isCropOverlayVisible={isCropOverlayVisible}
                    onCropImageReady={setCropImageElement}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    isHistoryOpen={isHistoryOpen}
                    onHistoryToggle={() => setIsHistoryOpen((prev) => !prev)}
                    onHistoryClose={() => setIsHistoryOpen(false)}
                    historyItems={imageHistory}
                    originalImageUrl={originalImageUrl || null}
                    activeHistoryIndex={activeHistoryIndex}
                    onHistorySelect={setActiveFromHistoryIndex}
                    cropToastVersion={cropToastVersion}
                    onCropToastUndo={handleUndo}
                />
            </div>

            <GenerationModal
                isOpen={generationModalOpen}
                isGenerating={isGenerating}
                items={generationItems}
                canDownload={generationItems.some((item) => Boolean(item.imageUrl))}
                onUseImage={(imageUrl: string) => {
                    const existingIndex = imageHistory.findIndex((item) => item.imageUrl === imageUrl);
                    if (existingIndex >= 0) {
                        setActiveFromHistoryIndex(existingIndex);
                    } else {
                        commitHistoryImages([imageUrl], activeTool);
                    }
                    setGenerationModalOpen(false);
                }}
                onDownloadImage={(imageUrl: string, index: number) =>
                    void downloadImage(imageUrl, `banner-agent-variation-${index + 1}`)
                }
                onClose={() => setGenerationModalOpen(false)}
                onAbortGeneration={handleAbortGeneration}
            />

            <SaveProjectModal
                isOpen={isSaveModalOpen}
                isSaving={isSavingAsset}
                isLoadingProjects={isSaveProjectsLoading}
                projectsError={saveProjectsError}
                saveError={saveError}
                projects={saveProjectOptions}
                selectedProjectId={selectedProjectId}
                assetName={assetName}
                assetDescription={assetDescription}
                onClose={closeSaveModal}
                onSubmit={handleSaveVideoAsset}
                onProjectSelect={(projectId) => {
                    if (!projectId) return;
                    setSelectedProjectId(projectId);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                onAssetNameChange={(value) => {
                    setAssetName(value);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                onAssetDescriptionChange={(value) => {
                    setAssetDescription(value);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                title="Save to Project"
                subtitle="Choose a project and store this generated video as a new asset."
            />

            <VideoGenerationModal
                isOpen={videoModalOpen}
                imageUrl={activeImageUrl}
                onClose={() => setVideoModalOpen(false)}
                onVideoGenerated={handleVideoGenerated}
            />

            <VideoPlayerModal
                isOpen={videoPlayerOpen}
                videoUrl={generatedVideoUrl}
                onSave={openSaveModal}
                onClose={() => setVideoPlayerOpen(false)}
            />
        </section>
    );
}
