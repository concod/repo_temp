import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { calculateSmartLayout } from "../../ai-variations/smartLayout";
import type { AspectRatioOption, SmartLayoutSnapshot } from "../../ai-variations/types";
import { useBrandingStore } from "../../../../store/brandingStore";
import { bannerAgentService, type ProjectApiItem } from "../../../../services/bannerAgentService";
import {
    CATALOGUE_DEBOUNCE_MS,
    CROP_PRESET_LOOKUP,
    DEFAULT_ADJUST_SETTINGS,
    DEFAULT_BACKGROUND_SETTINGS,
    DEFAULT_CANVAS,
    DEFAULT_CROP_PRESET_ID,
    DEFAULT_FILTER_STATE,
    DEFAULT_REFLECTION_SETTINGS,
    DEFAULT_SHADOW_SETTINGS,
    IMAGE_TOP_TOOLS,
    MAX_IMAGE_SCALE,
    MAX_ZOOM,
    MIN_IMAGE_SCALE,
    MIN_ZOOM,
    RESIZE_CANVAS_PRESETS,
    SESSION_IMAGE_KEY,
    SQUARE_VARIATION,
    TOOLS,
} from "../advancedEditorConstants";
import { IMAGE_TOP_TOOL_ICONS, TOOL_ICONS } from "../advancedEditorAssets";
import type {
    AdvancedToolKey,
    AdjustSettings,
    AssetUploadItem,
    BackgroundTool,
    CanvasPreset,
    CanvasSize,
    CatalogueProductResult,
    CollageBackgroundSettings,
    CollageTemplate,
    EditorSnapshot,
    FilterState,
    ImageTopTool,
    ImageTransform,
    PinnedProductLayer,
    ReflectionSettings,
    ShadowSettings,
    TextInteraction,
    TextOverlay,
    TransparentFillSettings,
    UploadBannerResponse,
    ProcessProductResponse,
} from "../advancedEditorTypes";
import {
    areAdjustSettingsEqual,
    blendHexColors,
    buildAdjustFilterCss,
    buildBackgroundSettingsFromTemplate,
    buildInitialPinnedProductLayers,
    buildShadowFilterCss,
    clamp,
    cloneTextOverlays,
    createPinnedProductLayerId,
    createTextOverlay,
    drawImageToRect,
    fitCanvasToViewport,
    fitImageToPlacement,
    getAssetCountLabel,
    getBestContrastColor,
    getBrandingLogoStyle,
    getBrandingMetrics,
    getCatalogueProductIdentifier,
    getCssFilterFromPreset,
    getDisplaySizeForRatio,
    getPatternPreview,
    getSessionProductImageUrls,
    getTemplateCanvasSizeFromApi,
    getTextOverlayById,
    isDefaultNewTemplate,
    loadImageSize,
    parseRatio,
    recolorLightPixelsInLogo,
    resolveTemplateAssetUrl,
    resizeDataUrlToTarget,
    sampleEdgeColorFromImage,
    toSafeString,
    toSmartEditorUrl,
} from "../advancedEditorUtils";
import {
    fetchImageBlobForProcessing,
    getTemplatesData,
    removeImageBackground,
    searchCatalogueProducts,
    uploadAndProcessDeviceImage,
} from "../advancedEditorServices";

export const useAdvancedEditorController = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const brandingSettings = useBrandingStore((state) => state.settings);
    const setBrandingEnabled = useBrandingStore((state) => state.setEnabled);
    const [activeTool, setActiveTool] = useState<AdvancedToolKey>("template");
    const [templates, setTemplates] = useState<CollageTemplate[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
    const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
    const [templateError, setTemplateError] = useState<string>("");
    const [sourceOriginalUrl, setSourceOriginalUrl] = useState<string>("");
    const [sourceProcessedUrl, setSourceProcessedUrl] = useState<string | null>(null);
    const [erasedImageUrl, setErasedImageUrl] = useState<string | null>(null);
    const [isSourceImageVisible, setIsSourceImageVisible] = useState(true);
    const [isBackgroundRemoving, setIsBackgroundRemoving] = useState(false);
    const [canvasSize, setCanvasSize] = useState<CanvasSize>(DEFAULT_CANVAS);
    const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number }>({
        width: 380,
        height: 380,
    });
    const [imageTransform, setImageTransform] = useState<ImageTransform>({
        x: DEFAULT_CANVAS.width * 0.5,
        y: DEFAULT_CANVAS.height * 0.5,
        scale: 0.6,
    });
    const [isImageSelected, setIsImageSelected] = useState(false);
    const [zoomPercent, setZoomPercent] = useState(93);
    const [historyPast, setHistoryPast] = useState<EditorSnapshot[]>([]);
    const [historyFuture, setHistoryFuture] = useState<EditorSnapshot[]>([]);
    const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);
    const [isAdjustingFilterIntensity, setIsAdjustingFilterIntensity] = useState(false);
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [backgroundSettings, setBackgroundSettings] = useState<CollageBackgroundSettings>(
        DEFAULT_BACKGROUND_SETTINGS
    );
    const [backgroundTool, setBackgroundTool] = useState<BackgroundTool>("brush");
    const [brushSize, setBrushSize] = useState(28);
    const [isErasingBackground, setIsErasingBackground] = useState(false);
    const [eraserCursorPos, setEraserCursorPos] = useState<{ x: number; y: number } | null>(null);
    const [resizeCanvasWidth, setResizeCanvasWidth] = useState(DEFAULT_CANVAS.width);
    const [resizeCanvasHeight, setResizeCanvasHeight] = useState(DEFAULT_CANVAS.height);
    const [lockResizeAspectRatio, setLockResizeAspectRatio] = useState(false);
    const [resizeAspectRatio, setResizeAspectRatio] = useState(DEFAULT_CANVAS.width / DEFAULT_CANVAS.height);
    const [selectedResizePreset, setSelectedResizePreset] = useState<string | null>(null);
    const [showResizeAdvanced, setShowResizeAdvanced] = useState(false);
    const [activeRailMode, setActiveRailMode] = useState<"main" | "image">("main");
    const [isImageEraserModalOpen, setIsImageEraserModalOpen] = useState(false);
    const [isVariationsModalOpen, setIsVariationsModalOpen] = useState(false);
    const [isCatalogueModalOpen, setIsCatalogueModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveProjects, setSaveProjects] = useState<ProjectApiItem[]>([]);
    const [isSaveProjectsLoading, setIsSaveProjectsLoading] = useState(false);
    const [saveProjectsError, setSaveProjectsError] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [assetName, setAssetName] = useState("");
    const [assetDescription, setAssetDescription] = useState("");
    const [saveError, setSaveError] = useState("");
    const [isSavingAsset, setIsSavingAsset] = useState(false);
    const [catalogueKeyword, setCatalogueKeyword] = useState("");
    const [catalogueResults, setCatalogueResults] = useState<CatalogueProductResult[]>([]);
    const [isCatalogueSearching, setIsCatalogueSearching] = useState(false);
    const [catalogueError, setCatalogueError] = useState<string | null>(null);
    const [catalogueSelectionLoadingId, setCatalogueSelectionLoadingId] = useState<string | null>(null);
    const [isCatalogueProcessing, setIsCatalogueProcessing] = useState(false);
    const [catalogueProcessingMessage, setCatalogueProcessingMessage] = useState("");
    const [catalogueToast, setCatalogueToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [isAssetUploadModalOpen, setIsAssetUploadModalOpen] = useState(false);
    const [assetUploadItems, setAssetUploadItems] = useState<AssetUploadItem[]>([]);
    const [isAssetUploadProcessing, setIsAssetUploadProcessing] = useState(false);
    const [assetUploadProcessingMessage, setAssetUploadProcessingMessage] = useState("");
    const [assetUploadError, setAssetUploadError] = useState<string | null>(null);
    const [pinnedProductLayers, setPinnedProductLayers] = useState<PinnedProductLayer[]>([]);
    const [heroAdjustTargetRatio, setHeroAdjustTargetRatio] = useState<AspectRatioOption | null>(null);
    const [isHeroAdjustDownloading, setIsHeroAdjustDownloading] = useState(false);
    const [activeImageTopTool, setActiveImageTopTool] = useState<ImageTopTool>("crop");
    const [appliedCropPresetId, setAppliedCropPresetId] = useState(DEFAULT_CROP_PRESET_ID);
    const [adjustSettings, setAdjustSettings] = useState<AdjustSettings>(DEFAULT_ADJUST_SETTINGS);
    const [isAdjustingImageAdjustments, setIsAdjustingImageAdjustments] = useState(false);
    const [shadowSettings, setShadowSettings] = useState<ShadowSettings>(DEFAULT_SHADOW_SETTINGS);
    const [reflectionSettings, setReflectionSettings] = useState<ReflectionSettings>(DEFAULT_REFLECTION_SETTINGS);
    const [autoBrandColor, setAutoBrandColor] = useState<string>(brandingSettings.color);
    const [processedBrandLogoUrl, setProcessedBrandLogoUrl] = useState<string>(brandingSettings.logoUrl);

    const canvasRef = useRef<HTMLDivElement | null>(null);
    const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const backgroundWorkingCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const backgroundSettingsRef = useRef(backgroundSettings);
    backgroundSettingsRef.current = backgroundSettings;
    const canvasSizeRef = useRef(canvasSize);
    canvasSizeRef.current = canvasSize;
    const lastErasePointRef = useRef<{ x: number; y: number } | null>(null);
    const processedUrlCacheRef = useRef<Map<string, string>>(new Map());
    const processingPromiseRef = useRef<Promise<string> | null>(null);
    const processedBrandLogoCacheRef = useRef<Map<string, string>>(new Map());
    // Preserve the original (pre-bg-removal) natural size so layout calculations
    // remain stable when the bg-removed image comes back at a lower resolution.
    const originalImageNaturalSizeRef = useRef<{ width: number; height: number } | null>(null);
    // Holds the on-canvas geometry of a pinned layer that was just promoted to
    // the active image, so its position/size is preserved on image load instead
    // of being re-fitted and re-centered to the template placement.
    const promotedPinnedGeometryRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const templateApplyRunIdRef = useRef(0);
    const applyTemplateRef = useRef<
        (template: CollageTemplate, shouldSaveHistory?: boolean) => Promise<void>
    >(async () => {
        return;
    });
    const dragRef = useRef<
        | {
            mode: "drag";
            offsetX: number;
            offsetY: number;
        }
        | {
            mode: "resize";
            startDistance: number;
            startScale: number;
        }
        | null
    >(null);
    const filterSnapshotBeforeAdjustRef = useRef<EditorSnapshot | null>(null);
    const adjustSnapshotBeforeAdjustRef = useRef<EditorSnapshot | null>(null);
    const textInteractionRef = useRef<TextInteraction | null>(null);
    const isSmartVariationRunRef = useRef(false);
    const catalogueSearchRequestIdRef = useRef(0);

    const mode = searchParams.get("mode");
    const isHeroAdjustMode = heroAdjustTargetRatio !== null;

    const activeTemplate = useMemo(
        () => templates.find((template) => template.id === activeTemplateId) ?? null,
        [templates, activeTemplateId]
    );

    const filteredTemplates = useMemo(() => {
        if (!templates.length) {
            return [];
        }

        const bannerTemplates = templates.filter((template) => template.templateType === "banner");
        const nonBannerTemplates = templates.filter((template) => template.templateType !== "banner");
        const orderedTemplates = mode === "banner"
            ? [...bannerTemplates, ...nonBannerTemplates]
            : [...nonBannerTemplates, ...bannerTemplates];
        const placeholders = orderedTemplates.filter(isDefaultNewTemplate);
        const nonPlaceholders = orderedTemplates.filter((template) => !isDefaultNewTemplate(template));

        return [...nonPlaceholders, ...placeholders];
    }, [mode, templates]);

    const zoomScale = zoomPercent / 100;
    const prefersProcessedSource = activeTemplate?.skipAIBackgroundRemoval !== true;
    const canvasFilterCss = useMemo(
        () => getCssFilterFromPreset(filterState.preset, filterState.intensity),
        [filterState.intensity, filterState.preset]
    );
    const imageShadowFilterCss = useMemo(
        () => buildShadowFilterCss(shadowSettings),
        [shadowSettings]
    );
    const imageAdjustFilterCss = useMemo(
        () => buildAdjustFilterCss(adjustSettings),
        [adjustSettings]
    );
    const imageCompositeFilterCss = useMemo(() => {
        const filters: string[] = [];

        if (imageAdjustFilterCss !== "none") {
            filters.push(imageAdjustFilterCss);
        }

        if (imageShadowFilterCss !== "none") {
            filters.push(imageShadowFilterCss);
        }

        return filters.length > 0 ? filters.join(" ") : undefined;
    }, [imageAdjustFilterCss, imageShadowFilterCss]);

    const brandingMetrics = useMemo(
        () => getBrandingMetrics(canvasSize, brandingSettings),
        [brandingSettings, canvasSize]
    );

    const effectiveBrandColor = useMemo(
        () => (brandingSettings.autoColor ? autoBrandColor : brandingSettings.color),
        [autoBrandColor, brandingSettings.autoColor, brandingSettings.color]
    );

    const brandingBorderStyle = useMemo<React.CSSProperties>(
        () => ({
            inset: brandingMetrics.distance,
            borderColor: effectiveBrandColor,
            borderWidth: brandingMetrics.strokeWidth,
        }),
        [brandingMetrics.distance, brandingMetrics.strokeWidth, effectiveBrandColor]
    );

    const brandingLogoStyle = useMemo<React.CSSProperties>(
        () => getBrandingLogoStyle(brandingSettings, brandingMetrics),
        [brandingMetrics, brandingSettings]
    );

    const baseSourceImageUrl = useMemo(() => {
        if (prefersProcessedSource && sourceProcessedUrl) {
            return sourceProcessedUrl;
        }
        return sourceOriginalUrl;
    }, [prefersProcessedSource, sourceOriginalUrl, sourceProcessedUrl]);

    const activeSourceImageUrl = useMemo(() => {
        if (!isSourceImageVisible) {
            return null;
        }
        return erasedImageUrl ?? baseSourceImageUrl;
    }, [baseSourceImageUrl, erasedImageUrl, isSourceImageVisible]);

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

    const selectedTextOverlay = useMemo(
        () => getTextOverlayById(textOverlays, selectedTextId),
        [selectedTextId, textOverlays]
    );

    const appliedCropPreset = useMemo(
        () => CROP_PRESET_LOOKUP[appliedCropPresetId] ?? CROP_PRESET_LOOKUP[DEFAULT_CROP_PRESET_ID],
        [appliedCropPresetId]
    );

    useEffect(() => {
        if (!activeSourceImageUrl) {
            return;
        }

        setIsImageSelected(true);
        setSelectedTextId(null);
        setEditingTextId(null);
    }, [activeSourceImageUrl]);

    useEffect(() => {
        if (!brandingSettings.autoColor) {
            setAutoBrandColor(brandingSettings.color);
            return;
        }

        let cancelled = false;

        const setColor = (nextColor: string) => {
            if (!cancelled) {
                setAutoBrandColor(nextColor);
            }
        };

        if (backgroundSettings.backgroundType === "solid") {
            setColor(getBestContrastColor(backgroundSettings.backgroundColor));
            return () => {
                cancelled = true;
            };
        }

        if (backgroundSettings.backgroundType === "gradient") {
            const middleColor = blendHexColors(
                backgroundSettings.backgroundGradientStart,
                backgroundSettings.backgroundGradientEnd,
                0.5
            );
            setColor(getBestContrastColor(middleColor));
            return () => {
                cancelled = true;
            };
        }

        if (backgroundSettings.backgroundType === "image" && backgroundSettings.backgroundImageUrl) {
            void sampleEdgeColorFromImage(backgroundSettings.backgroundImageUrl)
                .then((nextColor) => {
                    setColor(nextColor);
                })
                .catch(() => {
                    setColor("#ffffff");
                });
            return () => {
                cancelled = true;
            };
        }

        setColor("#ffffff");
        return () => {
            cancelled = true;
        };
    }, [
        backgroundSettings.backgroundColor,
        backgroundSettings.backgroundGradientEnd,
        backgroundSettings.backgroundGradientStart,
        backgroundSettings.backgroundImageUrl,
        backgroundSettings.backgroundType,
        brandingSettings.autoColor,
        brandingSettings.color,
    ]);

    useEffect(() => {
        if (!brandingSettings.logoUrl || !brandingSettings.logoEnabled || !brandingSettings.enabled) {
            setProcessedBrandLogoUrl(brandingSettings.logoUrl);
            return;
        }

        const cacheKey = `${brandingSettings.logoUrl}|${effectiveBrandColor}`;
        const cached = processedBrandLogoCacheRef.current.get(cacheKey);
        if (cached) {
            setProcessedBrandLogoUrl(cached);
            return;
        }

        let cancelled = false;
        void recolorLightPixelsInLogo(brandingSettings.logoUrl, effectiveBrandColor)
            .then((processed) => {
                if (cancelled) {
                    return;
                }
                processedBrandLogoCacheRef.current.set(cacheKey, processed);
                setProcessedBrandLogoUrl(processed);
            })
            .catch(() => {
                if (!cancelled) {
                    setProcessedBrandLogoUrl(brandingSettings.logoUrl);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [
        brandingSettings.enabled,
        brandingSettings.logoEnabled,
        brandingSettings.logoUrl,
        effectiveBrandColor,
    ]);

    useEffect(() => {
        setErasedImageUrl(null);
        setIsSourceImageVisible(true);
    }, [baseSourceImageUrl]);

    const isImageToolPanelRequested = activeRailMode === "image";
    const isImageToolPanelActive = isImageToolPanelRequested && isImageSelected;

    const activePanelLabel = useMemo(() => {
        if (isImageToolPanelActive) {
            return IMAGE_TOP_TOOLS.find((item) => item.id === activeImageTopTool)?.label ?? "Shadow";
        }

        if (isImageToolPanelRequested) {
            return IMAGE_TOP_TOOLS.find((item) => item.id === activeImageTopTool)?.label ?? "Crop";
        }
        return activeTool === "template" ? "Template" : TOOLS.find((item) => item.id === activeTool)?.label ?? "Template";
    }, [activeImageTopTool, activeTool, isImageToolPanelActive, isImageToolPanelRequested]);

    const activePanelIcon = useMemo(() => {
        if (isImageToolPanelActive) {
            return IMAGE_TOP_TOOL_ICONS[activeImageTopTool].panel;
        }

        if (isImageToolPanelRequested) {
            return IMAGE_TOP_TOOL_ICONS[activeImageTopTool].panel;
        }
        return TOOL_ICONS[activeTool].panel;
    }, [activeImageTopTool, activeTool, isImageToolPanelActive, isImageToolPanelRequested]);

    const syncResizeStateWithCanvas = useCallback((size: CanvasSize) => {
        setResizeCanvasWidth(size.width);
        setResizeCanvasHeight(size.height);
        setResizeAspectRatio(size.width / Math.max(size.height, 1));

        const matchedPreset = RESIZE_CANVAS_PRESETS.find((preset) => {
            const presetRatio = parseRatio(preset.ratio);
            const currentRatio = size.width / Math.max(size.height, 1);
            return Math.abs(presetRatio - currentRatio) <= 0.01;
        });

        setSelectedResizePreset(matchedPreset?.ratio ?? null);
    }, []);

    useEffect(() => {
        syncResizeStateWithCanvas(canvasSize);
    }, [canvasSize, syncResizeStateWithCanvas]);

    const applyCanvasResize = useCallback((nextSize: CanvasSize) => {
        setCanvasSize(nextSize);
        setZoomPercent(100);

        const fitted = fitImageToPlacement(activeTemplate, nextSize, imageNaturalSize);
        setImageTransform(fitted);

        const matchedPreset = RESIZE_CANVAS_PRESETS.find((preset) => {
            const presetRatio = parseRatio(preset.ratio);
            const currentRatio = nextSize.width / Math.max(nextSize.height, 1);
            return Math.abs(presetRatio - currentRatio) <= 0.01;
        });

        setSelectedResizePreset(matchedPreset?.ratio ?? null);
    }, [activeTemplate, imageNaturalSize]);

    const applyResizePreset = useCallback((preset: CanvasPreset) => {
        if (isHeroAdjustMode) {
            return;
        }

        const displaySize = getDisplaySizeForRatio(preset.ratio);
        setResizeAspectRatio(parseRatio(preset.ratio));
        setSelectedResizePreset(preset.ratio);
        applyCanvasResize(displaySize);
    }, [applyCanvasResize, isHeroAdjustMode]);

    const updateResizeWidth = useCallback((nextWidth: number) => {
        if (isHeroAdjustMode) {
            return;
        }

        if (!Number.isFinite(nextWidth)) {
            return;
        }

        const clampedWidth = clamp(nextWidth, 100, 5000);
        let nextHeight = resizeCanvasHeight;

        if (lockResizeAspectRatio) {
            nextHeight = clamp(Math.round(clampedWidth / Math.max(resizeAspectRatio, 0.01)), 100, 5000);
        }

        setResizeCanvasWidth(clampedWidth);
        setResizeCanvasHeight(nextHeight);
        setSelectedResizePreset(null);
        applyCanvasResize({ width: clampedWidth, height: nextHeight });
    }, [applyCanvasResize, isHeroAdjustMode, lockResizeAspectRatio, resizeAspectRatio, resizeCanvasHeight]);

    const updateResizeHeight = useCallback((nextHeight: number) => {
        if (isHeroAdjustMode) {
            return;
        }

        if (!Number.isFinite(nextHeight)) {
            return;
        }

        const clampedHeight = clamp(nextHeight, 100, 5000);
        let nextWidth = resizeCanvasWidth;

        if (lockResizeAspectRatio) {
            nextWidth = clamp(Math.round(clampedHeight * Math.max(resizeAspectRatio, 0.01)), 100, 5000);
        }

        setResizeCanvasWidth(nextWidth);
        setResizeCanvasHeight(clampedHeight);
        setSelectedResizePreset(null);
        applyCanvasResize({ width: nextWidth, height: clampedHeight });
    }, [applyCanvasResize, isHeroAdjustMode, lockResizeAspectRatio, resizeAspectRatio, resizeCanvasWidth]);

    const toggleResizeAspectRatio = useCallback(() => {
        if (isHeroAdjustMode) {
            return;
        }

        setLockResizeAspectRatio((prev) => {
            const next = !prev;
            if (next) {
                setResizeAspectRatio(resizeCanvasWidth / Math.max(resizeCanvasHeight, 1));
            }
            return next;
        });
    }, [isHeroAdjustMode, resizeCanvasHeight, resizeCanvasWidth]);

    const resetResizeCanvas = useCallback(() => {
        if (isHeroAdjustMode) {
            return;
        }

        setLockResizeAspectRatio(false);
        setSelectedResizePreset(null);
        applyCanvasResize(DEFAULT_CANVAS);
    }, [applyCanvasResize, isHeroAdjustMode]);

    const buildSnapshot = useCallback((): EditorSnapshot => {
        return {
            activeTemplateId,
            transform: imageTransform,
            appliedCropPresetId,
            canvasSize,
            filters: filterState,
            adjustSettings: { ...adjustSettings },
            shadowSettings: { ...shadowSettings },
            reflectionSettings: { ...reflectionSettings },
            erasedImageUrl,
            textOverlays: cloneTextOverlays(textOverlays),
            backgroundSettings: {
                ...backgroundSettings,
                transparentFill: { ...backgroundSettings.transparentFill },
            },
            backgroundTool,
            brushSize,
        };
    }, [
        activeTemplateId,
        imageTransform,
        appliedCropPresetId,
        canvasSize,
        filterState,
        adjustSettings,
        shadowSettings,
        reflectionSettings,
        erasedImageUrl,
        textOverlays,
        backgroundSettings,
        backgroundTool,
        brushSize,
    ]);

    const currentBackgroundStyle = useMemo(() => {
        if (backgroundSettings.backgroundType === "solid") {
            return { background: backgroundSettings.backgroundColor || "#2f8f3c" };
        }

        if (backgroundSettings.backgroundType === "gradient") {
            return {
                background: `linear-gradient(${backgroundSettings.backgroundGradientAngle || 180}deg, ${backgroundSettings.backgroundGradientStart || "#2f8f3c"}, ${backgroundSettings.backgroundGradientEnd || "#1d5b29"})`,
            };
        }

        if (backgroundSettings.backgroundType === "transparent") {
            return {
                background: "transparent",
            };
        }

        if (backgroundSettings.backgroundType === "image") {
            return {
                background: "transparent",
            };
        }

        return {
            background:
                "linear-gradient(120deg, rgba(40,133,58,0.96) 0%, rgba(25,108,46,0.96) 100%)",
        };
    }, [backgroundSettings]);

    const saveSnapshot = useCallback(() => {
        const snapshot = buildSnapshot();
        setHistoryPast((prev) => [...prev, snapshot]);
        setHistoryFuture([]);
    }, [buildSnapshot]);

    const updateShadowSettings = useCallback((updates: Partial<ShadowSettings>) => {
        setShadowSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    const updateReflectionSettings = useCallback((updates: Partial<ReflectionSettings>) => {
        setReflectionSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    const applyCropPreset = useCallback((nextPresetId: string) => {
        if (nextPresetId === appliedCropPresetId) {
            return;
        }
        saveSnapshot();
        setAppliedCropPresetId(nextPresetId);
    }, [appliedCropPresetId, saveSnapshot]);

    const openImageEraserModal = useCallback(() => {
        if (isHeroAdjustMode) {
            return;
        }

        if (!activeSourceImageUrl) {
            return;
        }

        setActiveImageTopTool("eraser");
        setIsImageEraserModalOpen(true);
    }, [activeSourceImageUrl, isHeroAdjustMode]);

    const handleSaveImageEraser = useCallback((editedDataUrl: string) => {
        saveSnapshot();
        setErasedImageUrl(editedDataUrl);
        setIsImageEraserModalOpen(false);
        setIsImageSelected(true);
    }, [saveSnapshot]);

    const applyTemplate = useCallback(
        async (template: CollageTemplate, shouldSaveHistory = true) => {
            const runId = ++templateApplyRunIdRef.current;
            setIsApplyingTemplate(true);

            try {
                if (shouldSaveHistory) {
                    saveSnapshot();
                }

                const background = template.settings.background;
                const bgImageUrl = resolveTemplateAssetUrl(background.imageUrl);
                const apiCanvasSize = getTemplateCanvasSizeFromApi(template);
                let backgroundImageSize: CanvasSize | null = null;

                if (background.type === "image" && bgImageUrl) {
                    try {
                        const size = await loadImageSize(bgImageUrl);
                        backgroundImageSize = {
                            width: size.width,
                            height: size.height,
                        };
                    } catch {
                        backgroundImageSize = null;
                    }
                }

                const currentRatio = canvasSize.width > 0 && canvasSize.height > 0
                    ? canvasSize.width / canvasSize.height
                    : DEFAULT_CANVAS.width / DEFAULT_CANVAS.height;

                const fallbackRatio = template.templateType === "collage" ? 1 : currentRatio;

                const ratio = apiCanvasSize
                    ? apiCanvasSize.width / apiCanvasSize.height
                    : backgroundImageSize && backgroundImageSize.width > 0 && backgroundImageSize.height > 0
                        ? backgroundImageSize.width / backgroundImageSize.height
                        : fallbackRatio;

                const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : currentRatio;

                const preferredWidth = apiCanvasSize?.width ?? backgroundImageSize?.width ?? (safeRatio >= 1 ? 1200 : 800);
                const preferredHeight = apiCanvasSize?.height ?? backgroundImageSize?.height ?? (safeRatio >= 1 ? 700 : 1200);

                const nextCanvasSize = fitCanvasToViewport(safeRatio, preferredWidth, preferredHeight);

                const fitted = fitImageToPlacement(template, nextCanvasSize, imageNaturalSize);

                setCanvasSize(nextCanvasSize);
                setActiveTemplateId(template.id);
                setBackgroundSettings(buildBackgroundSettingsFromTemplate(template));
                setBackgroundTool("brush");
                setBrushSize(28);
                setImageTransform(fitted);
                setFilterState(DEFAULT_FILTER_STATE);
                setAdjustSettings(DEFAULT_ADJUST_SETTINGS);

                const shouldUseProcessedSource = template.skipAIBackgroundRemoval !== true;
                if (shouldUseProcessedSource && sourceOriginalUrl && !sourceProcessedUrl && !isBackgroundRemoving) {
                    setIsBackgroundRemoving(true);
                    try {
                        const cachedProcessed = processedUrlCacheRef.current.get(sourceOriginalUrl);
                        if (cachedProcessed) {
                            setSourceProcessedUrl(cachedProcessed);
                        } else {
                            if (!processingPromiseRef.current) {
                                processingPromiseRef.current = removeImageBackground(sourceOriginalUrl);
                            }
                            const processedUrl = await processingPromiseRef.current;
                            processedUrlCacheRef.current.set(sourceOriginalUrl, processedUrl);
                            setSourceProcessedUrl(processedUrl);
                        }
                    } catch (error) {
                        console.error("Background removal failed:", error);
                    } finally {
                        processingPromiseRef.current = null;
                        setIsBackgroundRemoving(false);
                    }
                }
            } finally {
                if (templateApplyRunIdRef.current === runId) {
                    setIsApplyingTemplate(false);
                }
            }
        },
        [
            canvasSize.height,
            canvasSize.width,
            imageNaturalSize.height,
            imageNaturalSize.width,
            isBackgroundRemoving,
            saveSnapshot,
            sourceOriginalUrl,
            sourceProcessedUrl,
        ]
    );

    useEffect(() => {
        applyTemplateRef.current = applyTemplate;
    }, [applyTemplate]);

    useEffect(() => {
        // Reset the original size reference when the source image changes so
        // it gets re-captured from the next onLoad.
        originalImageNaturalSizeRef.current = null;
        setPinnedProductLayers([]);

        const encodedUrl = searchParams.get("img");
        if (encodedUrl) {
            const decoded = encodedUrl.includes("%") ? decodeURIComponent(encodedUrl) : encodedUrl;
            setSourceOriginalUrl(decoded);
            setSourceProcessedUrl(processedUrlCacheRef.current.get(decoded) ?? null);
            return;
        }

        const sourceType = searchParams.get("source");
        if (sourceType === "session") {
            const sessionImage = window.sessionStorage.getItem(SESSION_IMAGE_KEY) || "";
            const sessionProductImages = getSessionProductImageUrls();

            if (sessionImage || sessionProductImages.length > 0) {
                const primaryImage = sessionImage || sessionProductImages[0] || "";
                const remainingProductImages = sessionProductImages.filter((url) => url !== primaryImage);

                setSourceOriginalUrl(primaryImage);
                setSourceProcessedUrl(processedUrlCacheRef.current.get(primaryImage) ?? null);

                if (remainingProductImages.length > 0) {
                    setPinnedProductLayers(buildInitialPinnedProductLayers(remainingProductImages, canvasSizeRef.current));
                }
            }
            return;
        }

        const sessionFallback = window.sessionStorage.getItem(SESSION_IMAGE_KEY) || "";
        if (sessionFallback) {
            setSourceOriginalUrl(sessionFallback);
            setSourceProcessedUrl(processedUrlCacheRef.current.get(sessionFallback) ?? null);
        }
    }, [searchParams]);

    useEffect(() => {
        if (!prefersProcessedSource || !sourceOriginalUrl || sourceProcessedUrl || isBackgroundRemoving) {
            return;
        }

        let cancelled = false;

        const ensureProcessedSource = async () => {
            setIsBackgroundRemoving(true);

            try {
                const cachedProcessed = processedUrlCacheRef.current.get(sourceOriginalUrl);
                if (cachedProcessed) {
                    if (!cancelled) {
                        setSourceProcessedUrl(cachedProcessed);
                    }
                    return;
                }

                if (!processingPromiseRef.current) {
                    processingPromiseRef.current = removeImageBackground(sourceOriginalUrl);
                }

                const processedUrl = await processingPromiseRef.current;
                processedUrlCacheRef.current.set(sourceOriginalUrl, processedUrl);
                if (!cancelled) {
                    setSourceProcessedUrl(processedUrl);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Background removal failed:", error);
                }
            } finally {
                processingPromiseRef.current = null;
                if (!cancelled) {
                    setIsBackgroundRemoving(false);
                }
            }
        };

        void ensureProcessedSource();

        return () => {
            cancelled = true;
        };
    }, [prefersProcessedSource, sourceOriginalUrl, sourceProcessedUrl]);

    useEffect(() => {
        let cancelled = false;

        const fetchTemplates = async () => {
            setIsLoadingTemplates(true);
            setTemplateError("");

            try {
                const data = await getTemplatesData();
                if (cancelled) return;

                const loaded = data.templates || [];
                setTemplates(loaded);

                if (!loaded.length) {
                    setActiveTemplateId(null);
                    setBackgroundSettings({
                        ...DEFAULT_BACKGROUND_SETTINGS,
                        transparentFill: { ...DEFAULT_BACKGROUND_SETTINGS.transparentFill },
                    });
                    return;
                }

                const bannerTemplates = loaded.filter((template) => template.templateType === "banner");
                const nonBannerTemplates = loaded.filter((template) => template.templateType !== "banner");
                const orderedTemplates = mode === "banner"
                    ? [...bannerTemplates, ...nonBannerTemplates]
                    : [...nonBannerTemplates, ...bannerTemplates];
                const placeholders = orderedTemplates.filter(isDefaultNewTemplate);
                const nonPlaceholders = orderedTemplates.filter((template) => !isDefaultNewTemplate(template));
                const defaultTemplate = [...nonPlaceholders, ...placeholders][0] ?? null;

                if (defaultTemplate && applyTemplateRef.current) {
                    await applyTemplateRef.current(defaultTemplate, false);
                }
            } catch (error) {
                if (cancelled) return;
                setTemplateError(error instanceof Error ? error.message : "Failed to load templates");
            } finally {
                if (!cancelled) {
                    setIsLoadingTemplates(false);
                }
            }
        };

        void fetchTemplates();

        return () => {
            cancelled = true;
        };
    }, [mode]);

    const runCatalogueSearch = useCallback(async (rawKeyword: string) => {
        const trimmed = rawKeyword.trim();

        if (!trimmed) {
            setCatalogueResults([]);
            setCatalogueError(null);
            return;
        }

        const requestId = ++catalogueSearchRequestIdRef.current;
        setIsCatalogueSearching(true);
        setCatalogueError(null);

        try {
            const results = await searchCatalogueProducts(trimmed);

            if (requestId !== catalogueSearchRequestIdRef.current) {
                return;
            }

            setCatalogueResults(results.slice(0, 12));
            if (!results.length) {
                setCatalogueError("No matching products were found.");
            }
        } catch (error) {
            if (requestId !== catalogueSearchRequestIdRef.current) {
                return;
            }

            const message = error instanceof Error ? error.message : "Unable to search catalogue right now.";
            setCatalogueResults([]);
            setCatalogueError(message);
        } finally {
            if (requestId === catalogueSearchRequestIdRef.current) {
                setIsCatalogueSearching(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!isCatalogueModalOpen) {
            return;
        }

        const trimmed = catalogueKeyword.trim();
        if (!trimmed) {
            setCatalogueResults([]);
            setCatalogueError(null);
            setIsCatalogueSearching(false);
            return;
        }

        if (trimmed.length < 3) {
            setCatalogueResults([]);
            setCatalogueError("Enter at least 3 characters to search.");
            setIsCatalogueSearching(false);
            return;
        }

        const timeout = window.setTimeout(() => {
            void runCatalogueSearch(trimmed);
        }, CATALOGUE_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [catalogueKeyword, isCatalogueModalOpen, runCatalogueSearch]);

    useEffect(() => {
        if (!catalogueToast) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setCatalogueToast(null);
        }, 3500);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [catalogueToast]);

    const openSaveModal = useCallback(() => {
        setIsSaveModalOpen(true);
        setSaveError("");
        setSaveProjectsError("");
        setSelectedProjectId("");
        setAssetName("");
        setAssetDescription("");
    }, []);

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

    const openCatalogueModal = useCallback(() => {
        setIsCatalogueModalOpen(true);
        setCatalogueError(null);
    }, []);

    const closeCatalogueModal = useCallback(() => {
        if (catalogueSelectionLoadingId || isCatalogueProcessing) {
            return;
        }

        setIsCatalogueModalOpen(false);
        setCatalogueKeyword("");
        setCatalogueResults([]);
        setCatalogueError(null);
    }, [catalogueSelectionLoadingId, isCatalogueProcessing]);

    const handleCatalogueSearchSubmit = useCallback(() => {
        const trimmed = catalogueKeyword.trim();
        if (trimmed.length < 3) {
            setCatalogueError("Enter at least 3 characters to search.");
            return;
        }

        void runCatalogueSearch(trimmed);
    }, [catalogueKeyword, runCatalogueSearch]);

    const openAssetUploadModal = useCallback(() => {
        setIsAssetUploadModalOpen(true);
        setAssetUploadError(null);
    }, []);

    const closeAssetUploadModal = useCallback(() => {
        if (isAssetUploadProcessing) {
            return;
        }

        setIsAssetUploadModalOpen(false);
        setAssetUploadError(null);
        setAssetUploadItems((prev) => {
            prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
            return [];
        });
    }, [isAssetUploadProcessing]);

    const handleAssetFilesSelected = useCallback((files: FileList | null) => {
        if (!files || !files.length) {
            return;
        }

        const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
        if (!imageFiles.length) {
            setAssetUploadError("Only image files can be added to the canvas.");
            return;
        }

        setAssetUploadError(null);
        setAssetUploadItems((prev) => [
            ...prev,
            ...imageFiles.map((file) => ({
                id: createPinnedProductLayerId(),
                file,
                previewUrl: URL.createObjectURL(file),
            })),
        ]);
    }, []);

    const removeAssetUploadItem = useCallback((itemId: string) => {
        setAssetUploadItems((prev) => {
            const target = prev.find((item) => item.id === itemId);
            if (target) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter((item) => item.id !== itemId);
        });
    }, []);

    const handleCatalogueProductSelect = useCallback(async (product: CatalogueProductResult) => {
        const selectedId = getCatalogueProductIdentifier(product);
        setCatalogueSelectionLoadingId(selectedId);
        setCatalogueError(null);
        setIsCatalogueProcessing(true);

        try {
            setCatalogueProcessingMessage("Downloading product image...");
            const blob = await fetchImageBlobForProcessing(product.image_url);
            const mimeType = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
            const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
            const sourceFile = new File(
                [blob],
                `${(product.product_name || "catalogue-product").replace(/\s+/g, "-").toLowerCase()}.${extension}`,
                { type: mimeType }
            );

            setCatalogueProcessingMessage("Uploading product image...");
            const formData = new FormData();
            formData.append("image", sourceFile);

            const uploadResponse = await fetch(toSmartEditorUrl("/api/upload-banner-products"), {
                method: "POST",
                body: formData,
            });

            if (!uploadResponse.ok) {
                const bodyText = await uploadResponse.text().catch(() => "");
                const suffix = bodyText ? ` ${bodyText}` : "";
                throw new Error(`Upload failed (${uploadResponse.status}).${suffix}`);
            }

            const uploadData = (await uploadResponse.json()) as UploadBannerResponse;
            if (!uploadData?.url) {
                throw new Error("Upload response missing image url.");
            }

            setCatalogueProcessingMessage("Processing product image...");
            const processResponse = await fetch(toSmartEditorUrl("/api/process-product-images"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_urls: [uploadData.url] }),
            });

            if (!processResponse.ok) {
                const bodyText = await processResponse.text().catch(() => "");
                const suffix = bodyText ? ` ${bodyText}` : "";
                throw new Error(`Processing failed (${processResponse.status}).${suffix}`);
            }

            const processData = (await processResponse.json()) as ProcessProductResponse;
            const firstResult = processData.results?.[0];
            const processedCandidateUrl = firstResult?.no_bg_url || firstResult?.path_url || uploadData.url;
            const finalCanvasImageUrl = toSmartEditorUrl(
                `/api/proxy-processed-image?url=${encodeURIComponent(processedCandidateUrl)}`
            );

            if (activeSourceImageUrl) {
                const baseWidth = Math.max(imageNaturalSize.width * imageTransform.scale, 40);
                const baseHeight = Math.max(imageNaturalSize.height * imageTransform.scale, 40);
                const cropRatio = appliedCropPreset.ratio;

                const pinnedSize =
                    cropRatio !== null && Number.isFinite(cropRatio) && cropRatio > 0
                        ? (() => {
                            const baseRatio = baseWidth / Math.max(baseHeight, 1);

                            if (baseRatio > cropRatio) {
                                return {
                                    width: Math.max(baseHeight * cropRatio, 40),
                                    height: baseHeight,
                                };
                            }

                            return {
                                width: baseWidth,
                                height: Math.max(baseWidth / cropRatio, 40),
                            };
                        })()
                        : {
                            width: baseWidth,
                            height: baseHeight,
                        };

                const pinnedLayerId =
                    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `pinned-${Date.now()}-${Math.round(Math.random() * 10000)}`;

                setPinnedProductLayers((prev) => [
                    ...prev,
                    {
                        id: pinnedLayerId,
                        imageUrl: activeSourceImageUrl,
                        x: imageTransform.x,
                        y: imageTransform.y,
                        width: pinnedSize.width,
                        height: pinnedSize.height,
                        objectFit: appliedCropPreset.ratio === null ? "contain" : "cover",
                        filter: imageCompositeFilterCss,
                    },
                ]);
            }

            processedUrlCacheRef.current.set(finalCanvasImageUrl, finalCanvasImageUrl);
            setSourceOriginalUrl(finalCanvasImageUrl);
            setSourceProcessedUrl(finalCanvasImageUrl);
            setErasedImageUrl(null);
            setIsSourceImageVisible(true);
            setIsImageSelected(true);

            setIsCatalogueModalOpen(false);
            setCatalogueKeyword("");
            setCatalogueResults([]);
            setCatalogueToast({ type: "success", message: "Product processed and added to canvas." });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unable to add selected product.";
            setCatalogueError(message);
            setCatalogueToast({ type: "error", message: "Unable to add the selected product." });
        } finally {
            setCatalogueSelectionLoadingId(null);
            setIsCatalogueProcessing(false);
            setCatalogueProcessingMessage("");
        }
    }, [
        activeSourceImageUrl,
        appliedCropPreset.ratio,
        imageCompositeFilterCss,
        imageNaturalSize.height,
        imageNaturalSize.width,
        imageTransform.scale,
        imageTransform.x,
        imageTransform.y,
    ]);

    const handlePointerMove = useCallback((event: PointerEvent) => {
        if (!canvasRef.current || !dragRef.current) {
            return;
        }

        const interaction = dragRef.current;

        const canvasRect = canvasRef.current.getBoundingClientRect();
        const nextX = (event.clientX - canvasRect.left) / zoomScale;
        const nextY = (event.clientY - canvasRect.top) / zoomScale;

        if (interaction.mode === "drag") {
            setImageTransform((prev) => ({
                ...prev,
                x: clamp(nextX - interaction.offsetX, 0, canvasSize.width),
                y: clamp(nextY - interaction.offsetY, 0, canvasSize.height),
            }));
            return;
        }

        const centerX = imageTransform.x;
        const centerY = imageTransform.y;
        const distance = Math.hypot(nextX - centerX, nextY - centerY);
        const ratio = distance / Math.max(interaction.startDistance, 1);

        setImageTransform((prev) => ({
            ...prev,
            scale: clamp(interaction.startScale * ratio, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
        }));
    }, [canvasSize.height, canvasSize.width, imageTransform.x, imageTransform.y, zoomScale]);

    const stopPointerInteraction = useCallback(() => {
        if (!dragRef.current) {
            return;
        }
        dragRef.current = null;
        saveSnapshot();
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", stopPointerInteraction);
    }, [handlePointerMove, saveSnapshot]);

    const handleTextPointerMove = useCallback((event: PointerEvent) => {
        if (!canvasRef.current || !textInteractionRef.current) {
            return;
        }

        const interaction = textInteractionRef.current;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const pointerX = (event.clientX - canvasRect.left) / zoomScale;
        const pointerY = (event.clientY - canvasRect.top) / zoomScale;

        if (interaction.mode === "drag") {
            setTextOverlays((prev) => prev.map((overlay) => {
                if (overlay.id !== interaction.textId) {
                    return overlay;
                }

                return {
                    ...overlay,
                    x: clamp(pointerX - interaction.offsetX, 0, Math.max(0, canvasSize.width - overlay.width)),
                    y: clamp(pointerY - interaction.offsetY, 0, Math.max(0, canvasSize.height - overlay.fontSize)),
                };
            }));
            return;
        }

        const ratio = 1 + (pointerX - interaction.startPointerX) / Math.max(30, interaction.startWidth);
        const nextRatio = clamp(ratio, 0.45, 3.2);

        setTextOverlays((prev) => prev.map((overlay) => {
            if (overlay.id !== interaction.textId) {
                return overlay;
            }

            return {
                ...overlay,
                width: clamp(interaction.startWidth * nextRatio, 120, canvasSize.width),
                fontSize: clamp(Math.round(interaction.startFontSize * nextRatio), 14, 180),
            };
        }));
    }, [canvasSize.height, canvasSize.width, zoomScale]);

    const stopTextPointerInteraction = useCallback(() => {
        textInteractionRef.current = null;
        window.removeEventListener("pointermove", handleTextPointerMove);
        window.removeEventListener("pointerup", stopTextPointerInteraction);
    }, [handleTextPointerMove]);

    const handlePinnedLayerSelect = useCallback((layerId: string) => {
        const targetLayer = pinnedProductLayers.find((layer) => layer.id === layerId);
        if (!targetLayer) return;

        // Pin the currently active image (if any) in place of the selected layer
        if (activeSourceImageUrl) {
            const currentPinned: PinnedProductLayer = {
                id: createPinnedProductLayerId(),
                imageUrl: activeSourceImageUrl,
                x: imageTransform.x,
                y: imageTransform.y,
                width: imageNaturalSize.width * imageTransform.scale,
                height: imageNaturalSize.height * imageTransform.scale,
                objectFit: "contain",
                filter: imageCompositeFilterCss,
            };

            setPinnedProductLayers((prev) =>
                prev.map((layer) => (layer.id === layerId ? currentPinned : layer))
            );
        } else {
            setPinnedProductLayers((prev) => prev.filter((layer) => layer.id !== layerId));
        }

        // Remember the promoted layer's on-canvas geometry so the image load
        // handler preserves its position/size instead of re-centering it.
        promotedPinnedGeometryRef.current = {
            x: targetLayer.x,
            y: targetLayer.y,
            width: targetLayer.width,
            height: targetLayer.height,
        };
        // Reset the natural-size reference so the promoted image's own
        // dimensions are captured fresh on load, instead of inheriting the
        // previously active image's size.
        originalImageNaturalSizeRef.current = null;

        // Promote the clicked pinned layer to active
        processedUrlCacheRef.current.set(targetLayer.imageUrl, targetLayer.imageUrl);
        setSourceOriginalUrl(targetLayer.imageUrl);
        setSourceProcessedUrl(targetLayer.imageUrl);
        setErasedImageUrl(null);
        setIsSourceImageVisible(true);
        setIsImageSelected(true);
        // Provisional sizing so the promoted layer renders in place immediately;
        // refined to the image's true aspect ratio once it loads.
        setImageNaturalSize({ width: targetLayer.width, height: targetLayer.height });
        setImageTransform({
            x: targetLayer.x,
            y: targetLayer.y,
            scale: 1,
        });
    }, [
        activeSourceImageUrl,
        imageCompositeFilterCss,
        imageNaturalSize.height,
        imageNaturalSize.width,
        imageTransform.scale,
        imageTransform.x,
        imageTransform.y,
        pinnedProductLayers,
    ]);

    const startDragging = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!canvasRef.current) return;
        event.stopPropagation();
        const rect = canvasRef.current.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / zoomScale;
        const pointerY = (event.clientY - rect.top) / zoomScale;

        dragRef.current = {
            mode: "drag",
            offsetX: pointerX - imageTransform.x,
            offsetY: pointerY - imageTransform.y,
        };

        setIsImageSelected(true);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopPointerInteraction);
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!canvasRef.current) return;
        event.stopPropagation();

        const rect = canvasRef.current.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / zoomScale;
        const pointerY = (event.clientY - rect.top) / zoomScale;
        const centerX = imageTransform.x;
        const centerY = imageTransform.y;

        dragRef.current = {
            mode: "resize",
            startDistance: Math.hypot(pointerX - centerX, pointerY - centerY),
            startScale: imageTransform.scale,
        };

        setIsImageSelected(true);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", stopPointerInteraction);
    };

    const addText = useCallback((preset?: Partial<TextOverlay>) => {
        if (isHeroAdjustMode) {
            return;
        }

        saveSnapshot();
        const overlay = createTextOverlay(canvasSize, preset);
        setTextOverlays((prev) => [...prev, overlay]);
        setSelectedTextId(overlay.id);
        setEditingTextId(null);
        setIsImageSelected(false);
    }, [canvasSize, isHeroAdjustMode, saveSnapshot]);

    const updateText = useCallback((textId: string, updates: Partial<TextOverlay>, shouldSnapshot = true) => {
        if (isHeroAdjustMode) {
            return;
        }

        if (shouldSnapshot) {
            saveSnapshot();
        }
        setTextOverlays((prev) => prev.map((overlay) => {
            if (overlay.id !== textId) {
                return overlay;
            }

            return {
                ...overlay,
                ...updates,
            };
        }));
    }, [isHeroAdjustMode, saveSnapshot]);

    const deleteText = useCallback((textId: string) => {
        if (isHeroAdjustMode) {
            return;
        }

        saveSnapshot();
        setTextOverlays((prev) => prev.filter((overlay) => overlay.id !== textId));
        setSelectedTextId((prev) => (prev === textId ? null : prev));
        setEditingTextId((prev) => (prev === textId ? null : prev));
    }, [isHeroAdjustMode, saveSnapshot]);

    const startTextDrag = useCallback((event: React.PointerEvent<HTMLDivElement>, overlay: TextOverlay) => {
        if (isHeroAdjustMode) {
            return;
        }

        if (!canvasRef.current) {
            return;
        }

        event.stopPropagation();
        saveSnapshot();

        const rect = canvasRef.current.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / zoomScale;
        const pointerY = (event.clientY - rect.top) / zoomScale;

        textInteractionRef.current = {
            mode: "drag",
            textId: overlay.id,
            offsetX: pointerX - overlay.x,
            offsetY: pointerY - overlay.y,
        };

        setSelectedTextId(overlay.id);
        setEditingTextId(null);
        setIsImageSelected(false);

        window.addEventListener("pointermove", handleTextPointerMove);
        window.addEventListener("pointerup", stopTextPointerInteraction);
    }, [handleTextPointerMove, isHeroAdjustMode, saveSnapshot, stopTextPointerInteraction, zoomScale]);

    const startTextResize = useCallback((event: React.PointerEvent<HTMLButtonElement>, overlay: TextOverlay) => {
        if (isHeroAdjustMode) {
            return;
        }

        if (!canvasRef.current) {
            return;
        }

        event.stopPropagation();
        saveSnapshot();

        const rect = canvasRef.current.getBoundingClientRect();
        const pointerX = (event.clientX - rect.left) / zoomScale;

        textInteractionRef.current = {
            mode: "resize",
            textId: overlay.id,
            startPointerX: pointerX,
            startWidth: overlay.width,
            startFontSize: overlay.fontSize,
        };

        setSelectedTextId(overlay.id);
        setEditingTextId(null);
        setIsImageSelected(false);

        window.addEventListener("pointermove", handleTextPointerMove);
        window.addEventListener("pointerup", stopTextPointerInteraction);
    }, [handleTextPointerMove, isHeroAdjustMode, saveSnapshot, stopTextPointerInteraction, zoomScale]);

    const handleUndo = () => {
        if (historyPast.length === 0) return;
        const snapshot = historyPast[historyPast.length - 1];
        const current = buildSnapshot();

        setHistoryPast((prev) => prev.slice(0, -1));
        setHistoryFuture((prev) => [...prev, current]);
        setActiveTemplateId(snapshot.activeTemplateId);
        setImageTransform(snapshot.transform);
        setAppliedCropPresetId(snapshot.appliedCropPresetId ?? DEFAULT_CROP_PRESET_ID);
        setCanvasSize(snapshot.canvasSize);
        setFilterState(snapshot.filters);
        setAdjustSettings(snapshot.adjustSettings ?? DEFAULT_ADJUST_SETTINGS);
        setShadowSettings(snapshot.shadowSettings ?? DEFAULT_SHADOW_SETTINGS);
        setReflectionSettings(snapshot.reflectionSettings ?? DEFAULT_REFLECTION_SETTINGS);
        setErasedImageUrl(snapshot.erasedImageUrl ?? null);
        setTextOverlays(cloneTextOverlays(snapshot.textOverlays));
        setBackgroundSettings({
            ...snapshot.backgroundSettings,
            transparentFill: { ...snapshot.backgroundSettings.transparentFill },
        });
        setBackgroundTool(snapshot.backgroundTool);
        setBrushSize(snapshot.brushSize);
        setSelectedTextId(null);
        setEditingTextId(null);
    };

    const handleRedo = () => {
        if (historyFuture.length === 0) return;
        const snapshot = historyFuture[historyFuture.length - 1];
        const current = buildSnapshot();

        setHistoryFuture((prev) => prev.slice(0, -1));
        setHistoryPast((prev) => [...prev, current]);
        setActiveTemplateId(snapshot.activeTemplateId);
        setImageTransform(snapshot.transform);
        setAppliedCropPresetId(snapshot.appliedCropPresetId ?? DEFAULT_CROP_PRESET_ID);
        setCanvasSize(snapshot.canvasSize);
        setFilterState(snapshot.filters);
        setAdjustSettings(snapshot.adjustSettings ?? DEFAULT_ADJUST_SETTINGS);
        setShadowSettings(snapshot.shadowSettings ?? DEFAULT_SHADOW_SETTINGS);
        setReflectionSettings(snapshot.reflectionSettings ?? DEFAULT_REFLECTION_SETTINGS);
        setErasedImageUrl(snapshot.erasedImageUrl ?? null);
        setTextOverlays(cloneTextOverlays(snapshot.textOverlays));
        setBackgroundSettings({
            ...snapshot.backgroundSettings,
            transparentFill: { ...snapshot.backgroundSettings.transparentFill },
        });
        setBackgroundTool(snapshot.backgroundTool);
        setBrushSize(snapshot.brushSize);
        setSelectedTextId(null);
        setEditingTextId(null);
    };

    useEffect(() => {
        const handleWindowKeyDown = (event: KeyboardEvent) => {
            if (isHeroAdjustMode) {
                return;
            }

            if (!selectedTextId) {
                return;
            }

            const target = event.target as HTMLElement | null;
            if (
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable
            ) {
                return;
            }

            if (event.key !== "Delete" && event.key !== "Backspace") {
                return;
            }

            event.preventDefault();
            deleteText(selectedTextId);
        };

        window.addEventListener("keydown", handleWindowKeyDown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeyDown);
        };
    }, [deleteText, isHeroAdjustMode, selectedTextId]);

    const imageRenderSize = useMemo(() => {
        const baseWidth = Math.max(imageNaturalSize.width * imageTransform.scale, 40);
        const baseHeight = Math.max(imageNaturalSize.height * imageTransform.scale, 40);
        const cropRatio = appliedCropPreset.ratio;

        if (cropRatio === null || !Number.isFinite(cropRatio) || cropRatio <= 0) {
            return {
                width: baseWidth,
                height: baseHeight,
            };
        }

        const baseRatio = baseWidth / Math.max(baseHeight, 1);
        if (baseRatio > cropRatio) {
            return {
                width: Math.max(baseHeight * cropRatio, 40),
                height: baseHeight,
            };
        }

        return {
            width: baseWidth,
            height: Math.max(baseWidth / cropRatio, 40),
        };
    }, [appliedCropPreset.ratio, imageNaturalSize.height, imageNaturalSize.width, imageTransform.scale]);

    const addProcessedImagesToCanvas = useCallback((finalUrls: string[]) => {
        if (!finalUrls.length) {
            return;
        }

        const pinnedSize = imageRenderSize;
        const objectFit: PinnedProductLayer["objectFit"] =
            appliedCropPreset.ratio === null ? "contain" : "cover";

        setPinnedProductLayers((prev) => {
            const additions: PinnedProductLayer[] = [];

            // Pin the currently active product image (if any) in place, so it
            // stays on the canvas when the new image becomes active.
            if (activeSourceImageUrl) {
                additions.push({
                    id: createPinnedProductLayerId(),
                    imageUrl: activeSourceImageUrl,
                    x: imageTransform.x,
                    y: imageTransform.y,
                    width: pinnedSize.width,
                    height: pinnedSize.height,
                    objectFit,
                    filter: imageCompositeFilterCss,
                });
            }

            // Every uploaded image except the last becomes a pinned layer,
            // cascaded slightly so multiple assets don't stack exactly.
            finalUrls.slice(0, -1).forEach((url, index) => {
                const offset = (index + 1) * 32;
                additions.push({
                    id: createPinnedProductLayerId(),
                    imageUrl: url,
                    x: clamp(imageTransform.x + offset, 0, canvasSize.width),
                    y: clamp(imageTransform.y + offset, 0, canvasSize.height),
                    width: pinnedSize.width,
                    height: pinnedSize.height,
                    objectFit,
                });
            });

            return [...prev, ...additions];
        });

        const activeUrl = finalUrls[finalUrls.length - 1];
        processedUrlCacheRef.current.set(activeUrl, activeUrl);
        setSourceOriginalUrl(activeUrl);
        setSourceProcessedUrl(activeUrl);
        setErasedImageUrl(null);
        setIsSourceImageVisible(true);
        setIsImageSelected(true);
    }, [
        activeSourceImageUrl,
        appliedCropPreset.ratio,
        canvasSize.height,
        canvasSize.width,
        imageCompositeFilterCss,
        imageRenderSize,
        imageTransform.x,
        imageTransform.y,
    ]);

    const handleAssetUploadConfirm = useCallback(async () => {
        if (!assetUploadItems.length) {
            setAssetUploadError("Add at least one asset to upload.");
            return;
        }

        setIsAssetUploadProcessing(true);
        setAssetUploadError(null);

        try {
            const finalUrls: string[] = [];

            for (let index = 0; index < assetUploadItems.length; index++) {
                setAssetUploadProcessingMessage(
                    `Processing asset ${index + 1} of ${assetUploadItems.length}...`
                );
                const finalUrl = await uploadAndProcessDeviceImage(assetUploadItems[index].file);
                finalUrls.push(finalUrl);
            }

            addProcessedImagesToCanvas(finalUrls);

            assetUploadItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
            setAssetUploadItems([]);
            setIsAssetUploadModalOpen(false);
            setCatalogueToast({
                type: "success",
                message:
                    finalUrls.length > 1
                        ? `${finalUrls.length} assets added to canvas.`
                        : "Asset added to canvas.",
            });
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : "Unable to upload the selected assets.";
            setAssetUploadError(message);
            setCatalogueToast({ type: "error", message: "Unable to upload the selected assets." });
        } finally {
            setIsAssetUploadProcessing(false);
            setAssetUploadProcessingMessage("");
        }
    }, [addProcessedImagesToCanvas, assetUploadItems]);

    const captureSmartLayoutSnapshot = useCallback((): SmartLayoutSnapshot => {
        isSmartVariationRunRef.current = true;
        return {
            canvasSize: { ...canvasSize },
            image: activeSourceImageUrl
                ? {
                    x: imageTransform.x,
                    y: imageTransform.y,
                    scale: imageTransform.scale,
                    naturalWidth: imageNaturalSize.width,
                    naturalHeight: imageNaturalSize.height,
                    renderWidth: imageRenderSize.width,
                    renderHeight: imageRenderSize.height,
                }
                : null,
            textOverlays: textOverlays.map((overlay) => ({
                id: overlay.id,
                text: overlay.text,
                x: overlay.x,
                y: overlay.y,
                width: overlay.width,
                fontSize: overlay.fontSize,
                alignment: overlay.alignment,
            })),
        };
    }, [
        activeSourceImageUrl,
        canvasSize,
        imageNaturalSize.height,
        imageNaturalSize.width,
        imageRenderSize.height,
        imageRenderSize.width,
        imageTransform.scale,
        imageTransform.x,
        imageTransform.y,
        textOverlays,
    ]);

    const applySmartLayoutForRatio = useCallback(async (snapshot: SmartLayoutSnapshot, ratio: AspectRatioOption) => {
        const layoutItems: Array<{ id: string; type: "image" | "text"; width: number; height: number; visualWeight: number }> = [];
        const hasTextOverlays = snapshot.textOverlays.length > 0;
        const workingCanvasSize = getDisplaySizeForRatio(ratio.ratio);

        if (snapshot.image) {
            layoutItems.push({
                id: "editor-image",
                type: "image",
                width: Math.max(1, snapshot.image.renderWidth),
                height: Math.max(1, snapshot.image.renderHeight),
                visualWeight: Math.max(1, snapshot.image.renderWidth * snapshot.image.renderHeight),
            });
        }

        snapshot.textOverlays.forEach((text) => {
            const estimatedHeight = Math.max(20, text.fontSize * 1.3);
            layoutItems.push({
                id: text.id,
                type: "text",
                width: Math.max(40, text.width),
                height: estimatedHeight,
                visualWeight: Math.max(1, text.width * estimatedHeight),
            });
        });

        const frames = calculateSmartLayout(layoutItems, workingCanvasSize.width, workingCanvasSize.height);
        const frameById = new Map(frames.map((frame) => [frame.id, frame]));
        const textSnapshotById = new Map(snapshot.textOverlays.map((overlay) => [overlay.id, overlay]));

        setCanvasSize({ width: workingCanvasSize.width, height: workingCanvasSize.height });
        setResizeCanvasWidth(workingCanvasSize.width);
        setResizeCanvasHeight(workingCanvasSize.height);
        setSelectedResizePreset(null);

        // For non-square aspect ratios (wider than ~1.5:1 or taller than ~1:1.5),
        // switch background scale mode to "fill" so that multi-color background
        // images (e.g. dual-color templates) display all colors instead of
        // cropping to a single-color slice.
        const canvasRatio = workingCanvasSize.width / Math.max(1, workingCanvasSize.height);
        if (canvasRatio >= 1.5 || canvasRatio <= 0.67) {
            setBackgroundSettings((prev) => ({
                ...prev,
                backgroundScaleMode: "fill",
            }));
        } else {
            setBackgroundSettings((prev) => ({
                ...prev,
                backgroundScaleMode: "cover",
            }));
        }

        if (snapshot.image) {
            const imageFrame = frameById.get("editor-image");
            if (imageFrame) {
                if (!hasTextOverlays) {
                    const sourceWidthPct = snapshot.image.renderWidth / Math.max(1, snapshot.canvasSize.width);
                    const sourceHeightPct = snapshot.image.renderHeight / Math.max(1, snapshot.canvasSize.height);

                    const widthToHeightRatio = workingCanvasSize.width / Math.max(1, workingCanvasSize.height);
                    const isExtremeWide = widthToHeightRatio >= 3;
                    const isWide = widthToHeightRatio >= 1.8;

                    // For wide/extreme-wide ratios, cap the target height so the hero
                    // fits within the available vertical space.
                    const maxHeightPct = isExtremeWide ? 0.65 : isWide ? 0.80 : 1.0;
                    const targetWidth = Math.max(80, workingCanvasSize.width * sourceWidthPct * 1.02);
                    const targetHeight = Math.min(
                        Math.max(80, workingCanvasSize.height * sourceHeightPct * 1.02),
                        workingCanvasSize.height * maxHeightPct
                    );
                    let heroScale = clamp(
                        Math.min(
                            targetWidth / Math.max(1, snapshot.image.naturalWidth),
                            targetHeight / Math.max(1, snapshot.image.naturalHeight)
                        ),
                        MIN_IMAGE_SCALE,
                        MAX_IMAGE_SCALE
                    );

                    // For wide aspect ratios, hard-cap the scale so the rendered
                    // image height never exceeds the canvas height.
                    if (isWide) {
                        const maxScaleForHeight = (workingCanvasSize.height * maxHeightPct) / Math.max(1, snapshot.image.naturalHeight);
                        heroScale = Math.min(heroScale, maxScaleForHeight);
                        heroScale = clamp(heroScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
                    }

                    // Preserve the hero's relative position from the original canvas
                    // instead of always centering it.
                    const srcXPct = snapshot.image.x / Math.max(1, snapshot.canvasSize.width);
                    const srcYPct = snapshot.image.y / Math.max(1, snapshot.canvasSize.height);

                    // Compute the rendered half-dimensions so we can clamp within bounds.
                    const heroHalfW = (snapshot.image.naturalWidth * heroScale) / 2;
                    const heroHalfH = (snapshot.image.naturalHeight * heroScale) / 2;

                    const targetX = clamp(
                        workingCanvasSize.width * srcXPct,
                        heroHalfW,
                        workingCanvasSize.width - heroHalfW
                    );
                    const targetY = clamp(
                        workingCanvasSize.height * srcYPct,
                        heroHalfH,
                        workingCanvasSize.height - heroHalfH
                    );

                    setImageTransform((prev) => ({
                        ...prev,
                        x: targetX,
                        y: targetY,
                        scale: heroScale,
                    }));
                } else {
                    let nextScale = clamp(
                        Math.min(
                            imageFrame.width / Math.max(1, snapshot.image.naturalWidth),
                            imageFrame.height / Math.max(1, snapshot.image.naturalHeight)
                        ) * 0.9,
                        MIN_IMAGE_SCALE,
                        MAX_IMAGE_SCALE
                    );

                    // For wide aspect ratios, hard-cap so image height fits within canvas.
                    const widthToHeightRatio2 = workingCanvasSize.width / Math.max(1, workingCanvasSize.height);
                    const isWide2 = widthToHeightRatio2 >= 1.8;
                    if (isWide2) {
                        const maxHPct = widthToHeightRatio2 >= 3 ? 0.65 : 0.80;
                        const maxScaleForHeight = (workingCanvasSize.height * maxHPct) / Math.max(1, snapshot.image.naturalHeight);
                        nextScale = Math.min(nextScale, maxScaleForHeight);
                        nextScale = clamp(nextScale, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
                    }

                    // Ensure Y position keeps image within canvas bounds.
                    const imgHalfH = (snapshot.image.naturalHeight * nextScale) / 2;
                    const targetY = clamp(
                        imageFrame.y + (imageFrame.height / 2),
                        imgHalfH,
                        workingCanvasSize.height - imgHalfH
                    );

                    setImageTransform((prev) => ({
                        ...prev,
                        x: clamp(imageFrame.x + (imageFrame.width / 2), 0, workingCanvasSize.width),
                        y: clamp(targetY, 0, workingCanvasSize.height),
                        scale: nextScale,
                    }));
                }
            }
        }

        setTextOverlays((prev) => prev.map((overlay) => {
            const frame = frameById.get(overlay.id);
            const source = textSnapshotById.get(overlay.id);

            if (!frame || !source) {
                return overlay;
            }

            const nextWidth = Math.max(90, frame.width);
            const nextFontSize = clamp(Math.round(source.fontSize * frame.scale), 14, 180);

            return {
                ...overlay,
                x: clamp(frame.x, 0, Math.max(0, workingCanvasSize.width - nextWidth)),
                y: clamp(frame.y, 0, Math.max(0, workingCanvasSize.height - nextFontSize)),
                width: nextWidth,
                fontSize: nextFontSize,
                alignment: "center",
            };
        }));

        await new Promise((resolve) => {
            window.setTimeout(resolve, 260);
        });
    }, []);

    const restoreSmartLayoutSnapshot = useCallback((snapshot: SmartLayoutSnapshot) => {
        setCanvasSize({ ...snapshot.canvasSize });
        setResizeCanvasWidth(snapshot.canvasSize.width);
        setResizeCanvasHeight(snapshot.canvasSize.height);

        // Restore background scale mode to "cover" after smart layout exports.
        setBackgroundSettings((prev) => ({
            ...prev,
            backgroundScaleMode: "cover",
        }));

        setIsSourceImageVisible(!!snapshot.image);

        if (snapshot.image) {
            setImageTransform((prev) => ({
                ...prev,
                x: snapshot.image!.x,
                y: snapshot.image!.y,
                scale: snapshot.image!.scale,
            }));
        }

        const snapshotTextById = new Map(snapshot.textOverlays.map((overlay) => [overlay.id, overlay]));
        setTextOverlays((prev) => prev.map((overlay) => {
            const source = snapshotTextById.get(overlay.id);
            if (!source) {
                return overlay;
            }

            return {
                ...overlay,
                text: source.text,
                x: source.x,
                y: source.y,
                width: source.width,
                fontSize: source.fontSize,
                alignment: source.alignment,
            };
        }));
        isSmartVariationRunRef.current = false;
    }, []);

    const beginHeroAdjustForVariation = useCallback((ratio: AspectRatioOption, editableState: SmartLayoutSnapshot) => {
        const ratioValue = Math.max(0.01, parseRatio(ratio.ratio));
        const sourceWidth = Math.max(1, editableState.canvasSize.width);
        const sourceHeight = Math.max(1, editableState.canvasSize.height);
        const sourceRatio = sourceWidth / sourceHeight;

        let snapshotForEdit = editableState;

        // Guard against stale or mismatched snapshot dimensions by normalizing
        // the editable state to the selected variation ratio before opening.
        if (Math.abs(sourceRatio - ratioValue) > 0.01) {
            const sourceArea = Math.max(1, sourceWidth * sourceHeight);
            const targetWidth = Math.max(100, Math.round(Math.sqrt(sourceArea * ratioValue)));
            const targetHeight = Math.max(100, Math.round(targetWidth / ratioValue));
            const scaleX = targetWidth / sourceWidth;
            const scaleY = targetHeight / sourceHeight;

            const normalizedImage = editableState.image
                ? (() => {
                    const image = editableState.image!;
                    const nextScale = clamp(
                        Math.min(
                            (Math.max(1, image.renderWidth) * scaleX) / Math.max(1, image.naturalWidth),
                            (Math.max(1, image.renderHeight) * scaleY) / Math.max(1, image.naturalHeight)
                        ),
                        MIN_IMAGE_SCALE,
                        MAX_IMAGE_SCALE
                    );

                    const halfW = (image.naturalWidth * nextScale) / 2;
                    const halfH = (image.naturalHeight * nextScale) / 2;
                    const xPct = image.x / sourceWidth;
                    const yPct = image.y / sourceHeight;

                    return {
                        ...image,
                        x: clamp(targetWidth * xPct, halfW, targetWidth - halfW),
                        y: clamp(targetHeight * yPct, halfH, targetHeight - halfH),
                        scale: nextScale,
                        renderWidth: image.naturalWidth * nextScale,
                        renderHeight: image.naturalHeight * nextScale,
                    };
                })()
                : null;

            const normalizedText = editableState.textOverlays.map((overlay) => ({
                ...overlay,
                x: clamp(overlay.x * scaleX, 0, Math.max(0, targetWidth - 20)),
                y: clamp(overlay.y * scaleY, 0, Math.max(0, targetHeight - 20)),
                width: Math.max(90, overlay.width * scaleX),
                fontSize: clamp(Math.round(overlay.fontSize * scaleY), 14, 180),
            }));

            snapshotForEdit = {
                canvasSize: {
                    width: targetWidth,
                    height: targetHeight,
                },
                image: normalizedImage,
                textOverlays: normalizedText,
            };
        }

        restoreSmartLayoutSnapshot(snapshotForEdit);
        setHeroAdjustTargetRatio(ratio);
        setSelectedTextId(null);
        setEditingTextId(null);
        setBackgroundTool("brush");
    }, [restoreSmartLayoutSnapshot]);

    const exitHeroAdjustMode = useCallback(() => {
        setHeroAdjustTargetRatio(null);
    }, []);

    const exportCanvasForVariations = useCallback(async (): Promise<string> => {
        const canvasNode = canvasRef.current;
        if (!canvasNode) {
            throw new Error("Canvas not available for export");
        }

        // Hide selection UI (resize handles / selection outlines) in exported assets.
        const previousSelectionState = {
            isImageSelected,
            selectedTextId,
            editingTextId,
        };

        setIsImageSelected(false);
        setSelectedTextId(null);
        setEditingTextId(null);

        await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
        });

        // Ensure the background image canvas is fully drawn before html2canvas
        // captures it. When applySmartLayoutForRatio resizes the canvas, the
        // useEffect that redraws the background fires asynchronously and may not
        // have completed by the time we export — causing a blank background.
        // Read from refs to avoid stale closure values during the smart layout
        // generation loop.
        const currentBgSettings = backgroundSettingsRef.current;
        const currentCanvasSize = canvasSizeRef.current;
        const bgCanvas = backgroundCanvasRef.current;
        if (bgCanvas && currentBgSettings.backgroundType === "image" && currentBgSettings.backgroundImageUrl) {
            const bgCtx = bgCanvas.getContext("2d");
            if (bgCtx) {
                const cachedImage = backgroundImageRef.current;
                const imageToUse = cachedImage && cachedImage.complete && cachedImage.naturalWidth > 0
                    ? cachedImage
                    : await new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => resolve(img);
                        img.onerror = () => reject(new Error("Background image load failed"));
                        img.src = currentBgSettings.backgroundImageUrl!;
                    });

                bgCanvas.width = currentCanvasSize.width;
                bgCanvas.height = currentCanvasSize.height;
                bgCtx.clearRect(0, 0, currentCanvasSize.width, currentCanvasSize.height);
                drawImageToRect(bgCtx, imageToUse, currentCanvasSize.width, currentCanvasSize.height, currentBgSettings.backgroundScaleMode);
            }
        }

        try {
            const exportedCanvas = await html2canvas(canvasNode, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: null,
                scale: 2,
                logging: false,
                onclone: (doc) => {
                    const clonedCanvas = doc.querySelector(".advanced-editor-canvas") as HTMLElement | null;
                    if (clonedCanvas) {
                        clonedCanvas.style.transform = "none";
                        clonedCanvas.style.maxWidth = "none";
                        clonedCanvas.style.maxHeight = "none";
                    }

                    // Ensure the viewport parent doesn't clip the canvas in the clone.
                    const clonedViewport = doc.querySelector(".advanced-editor-canvas-viewport") as HTMLElement | null;
                    if (clonedViewport) {
                        clonedViewport.style.overflow = "visible";
                        clonedViewport.style.height = "auto";
                    }

                    // Hard-remove selection visuals from clone to avoid blue handle artifacts.
                    doc.querySelectorAll(".advanced-editor-product").forEach((node) => {
                        node.classList.remove("is-selected");
                    });
                    doc.querySelectorAll(".advanced-editor-text-layer-canvas").forEach((node) => {
                        node.classList.remove("is-selected");
                    });
                    doc.querySelectorAll(".advanced-editor-product__resize-handle, .advanced-editor-text-layer-canvas__resize").forEach((node) => {
                        (node as HTMLElement).style.display = "none";
                    });

                    // Fix hero image stretching: html2canvas doesn't support object-fit,
                    // so resize the product container to match the image's natural aspect
                    // ratio, ensuring the img at 100% fills it without distortion.
                    doc.querySelectorAll(".advanced-editor-product").forEach((containerNode) => {
                        const container = containerNode as HTMLElement;
                        const img = container.querySelector(".advanced-editor-product__main-image") as HTMLImageElement | null;
                        if (!img) return;

                        const containerW = parseFloat(container.style.width) || container.offsetWidth;
                        const containerH = parseFloat(container.style.height) || container.offsetHeight;
                        const naturalW = img.naturalWidth || containerW;
                        const naturalH = img.naturalHeight || containerH;

                        if (!naturalW || !naturalH || !containerW || !containerH) return;

                        const objectFit = img.style.objectFit || "contain";

                        if (objectFit === "contain") {
                            // Shrink the container to match the image's aspect ratio so that
                            // a simple stretch-to-fill produces correct proportions.
                            const imgRatio = naturalW / naturalH;
                            const containerRatio = containerW / containerH;
                            let fitW = containerW;
                            let fitH = containerH;

                            if (imgRatio > containerRatio) {
                                fitW = containerW;
                                fitH = containerW / imgRatio;
                            } else {
                                fitH = containerH;
                                fitW = containerH * imgRatio;
                            }

                            container.style.width = `${fitW}px`;
                            container.style.height = `${fitH}px`;
                        }

                        // Remove object-fit so html2canvas renders correctly via stretch.
                        img.style.objectFit = "fill";

                        // Ensure the container doesn't extend beyond the canvas bounds
                        // (prevents clipping for very wide aspect ratios).
                        const canvasEl = clonedCanvas;
                        if (canvasEl) {
                            const canvasW = parseFloat(canvasEl.style.width) || canvasEl.offsetWidth;
                            const canvasH = parseFloat(canvasEl.style.height) || canvasEl.offsetHeight;
                            const curW = parseFloat(container.style.width) || container.offsetWidth;
                            const curH = parseFloat(container.style.height) || container.offsetHeight;
                            const posLeft = parseFloat(container.style.left) || 0;
                            const posTop = parseFloat(container.style.top) || 0;

                            // Container uses transform: translate(-50%, -50%), so bounds are:
                            // top = posTop - curH/2, bottom = posTop + curH/2
                            const imgTop = posTop - curH / 2;
                            const imgBottom = posTop + curH / 2;

                            if (imgTop < 0 || imgBottom > canvasH) {
                                // Scale down the container to fit within canvas height
                                const maxH = Math.min(curH, posTop * 2, (canvasH - posTop) * 2, canvasH * 0.85);
                                const scaleFactor = maxH / curH;
                                const newH = curH * scaleFactor;
                                const newW = curW * scaleFactor;
                                container.style.width = `${newW}px`;
                                container.style.height = `${newH}px`;
                                // Clamp position to keep hero within bounds while preserving
                                // its intended placement (don't force to center).
                                const clampedTop = Math.max(newH / 2, Math.min(posTop, canvasH - newH / 2));
                                container.style.top = `${clampedTop}px`;
                            }

                            // Same check for width overflow
                            const imgLeft = posLeft - (parseFloat(container.style.width) || curW) / 2;
                            const imgRight = posLeft + (parseFloat(container.style.width) || curW) / 2;
                            if (imgLeft < 0 || imgRight > canvasW) {
                                const curWNow = parseFloat(container.style.width) || curW;
                                const curHNow = parseFloat(container.style.height) || curH;
                                const maxW = Math.min(curWNow, posLeft * 2, (canvasW - posLeft) * 2, canvasW * 0.95);
                                const scaleFactorW = maxW / curWNow;
                                container.style.width = `${curWNow * scaleFactorW}px`;
                                container.style.height = `${curHNow * scaleFactorW}px`;
                                // Clamp horizontal position to keep within bounds
                                const updatedW = parseFloat(container.style.width);
                                const clampedLeft = Math.max(updatedW / 2, Math.min(posLeft, canvasW - updatedW / 2));
                                container.style.left = `${clampedLeft}px`;
                            }
                        }
                    });
                },
            });

            return exportedCanvas.toDataURL("image/png", 1);
        } finally {
            setIsImageSelected(previousSelectionState.isImageSelected);
            setSelectedTextId(previousSelectionState.selectedTextId);
            setEditingTextId(previousSelectionState.editingTextId);
        }
    }, [editingTextId, isImageSelected, selectedTextId]);

    const handleSaveAsset = useCallback(async (event?: React.FormEvent<HTMLFormElement>) => {
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

        setIsSavingAsset(true);
        setSaveError("");

        try {
            const exported = await exportCanvasForVariations();
            const targetWidth = SQUARE_VARIATION.downloadWidth ?? SQUARE_VARIATION.width;
            const targetHeight = SQUARE_VARIATION.downloadHeight ?? SQUARE_VARIATION.height;
            const resized = await resizeDataUrlToTarget(exported, targetWidth, targetHeight);
            const trimmedDescription = assetDescription.trim();
            const originalUrl = toSafeString(sourceOriginalUrl) || toSafeString(activeSourceImageUrl);

            await bannerAgentService.createProjectAsset(selectedProjectId, {
                asset_name: trimmedName,
                ...(trimmedDescription ? { description: trimmedDescription } : {}),
                metadata: {
                    image_data: resized,
                    source: "editor",
                    dimensions: `${targetWidth}x${targetHeight}`,
                    ...(originalUrl ? { original_url: originalUrl } : {}),
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
        activeSourceImageUrl,
        assetDescription,
        assetName,
        closeSaveModal,
        exportCanvasForVariations,
        isSavingAsset,
        selectedProjectId,
        sourceOriginalUrl,
    ]);

    const downloadHeroAdjustedVariation = useCallback(async () => {
        if (!heroAdjustTargetRatio || isHeroAdjustDownloading) {
            return;
        }

        try {
            setIsHeroAdjustDownloading(true);
            const exported = await exportCanvasForVariations();
            const resized = await resizeDataUrlToTarget(
                exported,
                heroAdjustTargetRatio.downloadWidth,
                heroAdjustTargetRatio.downloadHeight
            );
            const link = document.createElement("a");
            link.href = resized;
            link.download = `${heroAdjustTargetRatio.label.replace(/\s+/g, "-").toLowerCase()}-${heroAdjustTargetRatio.downloadWidth}x${heroAdjustTargetRatio.downloadHeight}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            setIsHeroAdjustDownloading(false);
        }
    }, [exportCanvasForVariations, heroAdjustTargetRatio, isHeroAdjustDownloading]);

    const reflectionRenderStyle = useMemo(() => {
        const reflectionOpacity = clamp(reflectionSettings.opacity, 0, 100) / 100;
        const reflectionDistance = clamp(reflectionSettings.distance, 0, 50);
        const reflectionOffset = clamp(reflectionSettings.yOffset, -200, 200);
        const reflectionHeight = clamp(reflectionSettings.height, 10, 100);
        const reflectionBlur = clamp(reflectionSettings.blur, 0, 20);

        return {
            top: `calc(100% + ${reflectionDistance + reflectionOffset}px)`,
            height: `${reflectionHeight}%`,
            opacity: reflectionOpacity,
            filter: reflectionBlur > 0 ? `blur(${reflectionBlur}px)` : undefined,
        };
    }, [reflectionSettings]);

    const handleZoomIn = () => {
        setZoomPercent((prev) => clamp(prev + 5, MIN_ZOOM, MAX_ZOOM));
    };

    const handleZoomOut = () => {
        setZoomPercent((prev) => clamp(prev - 5, MIN_ZOOM, MAX_ZOOM));
    };

    const beginFilterIntensityAdjust = useCallback(() => {
        if (!isAdjustingFilterIntensity) {
            filterSnapshotBeforeAdjustRef.current = buildSnapshot();
            setIsAdjustingFilterIntensity(true);
        }
    }, [buildSnapshot, isAdjustingFilterIntensity]);

    const handleFilterIntensityCommit = () => {
        if (!isAdjustingFilterIntensity) {
            return;
        }

        const snapshot = filterSnapshotBeforeAdjustRef.current;
        filterSnapshotBeforeAdjustRef.current = null;
        setIsAdjustingFilterIntensity(false);

        if (!snapshot) {
            return;
        }

        const changed =
            snapshot.filters.intensity !== filterState.intensity ||
            snapshot.filters.preset !== filterState.preset;

        if (changed) {
            setHistoryPast((prev) => [...prev, snapshot]);
            setHistoryFuture([]);
        }
    };

    const handleImageAdjustCommit = () => {
        if (!isAdjustingImageAdjustments) {
            return;
        }

        const snapshot = adjustSnapshotBeforeAdjustRef.current;
        adjustSnapshotBeforeAdjustRef.current = null;
        setIsAdjustingImageAdjustments(false);

        if (!snapshot) {
            return;
        }

        if (!areAdjustSettingsEqual(snapshot.adjustSettings, adjustSettings)) {
            setHistoryPast((prev) => [...prev, snapshot]);
            setHistoryFuture([]);
        }
    };

    const beginImageAdjust = () => {
        if (!isAdjustingImageAdjustments) {
            adjustSnapshotBeforeAdjustRef.current = buildSnapshot();
            setIsAdjustingImageAdjustments(true);
        }
    };

    const updateAdjustSetting = (key: keyof AdjustSettings, value: number) => {
        setAdjustSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const resetAdjustSettings = () => {
        if (areAdjustSettingsEqual(adjustSettings, DEFAULT_ADJUST_SETTINGS)) {
            return;
        }

        const snapshot = buildSnapshot();
        setAdjustSettings(DEFAULT_ADJUST_SETTINGS);
        setHistoryPast((prev) => [...prev, snapshot]);
        setHistoryFuture([]);
    };

    const updateBackgroundSettings = useCallback((
        updates: Partial<CollageBackgroundSettings>,
        shouldSnapshot = true
    ) => {
        if (shouldSnapshot) {
            saveSnapshot();
        }
        setBackgroundSettings((prev) => ({
            ...prev,
            ...updates,
        }));
    }, [saveSnapshot]);

    const updateTransparentFill = useCallback((
        updates: Partial<TransparentFillSettings>,
        shouldSnapshot = true
    ) => {
        if (shouldSnapshot) {
            saveSnapshot();
        }
        setBackgroundSettings((prev) => ({
            ...prev,
            transparentFill: {
                ...prev.transparentFill,
                ...updates,
            },
        }));
    }, [saveSnapshot]);

    const handleBackgroundImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) {
            return;
        }

        saveSnapshot();

        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : null;
            if (!result) {
                return;
            }

            setBackgroundSettings((prev) => ({
                ...prev,
                backgroundType: "image",
                backgroundImageUrl: result,
            }));
            setBackgroundTool("brush");
        };
        reader.readAsDataURL(file);

        event.target.value = "";
    }, [saveSnapshot]);

    const handleRemoveBackgroundImage = useCallback(() => {
        saveSnapshot();
        setBackgroundTool("brush");
        setEraserCursorPos(null);
        setBackgroundSettings((prev) => ({
            ...prev,
            backgroundType: "transparent",
            backgroundImageUrl: null,
        }));
    }, [saveSnapshot]);

    useEffect(() => {
        const displayCanvas = backgroundCanvasRef.current;
        if (!displayCanvas) {
            return;
        }

        displayCanvas.width = canvasSize.width;
        displayCanvas.height = canvasSize.height;

        const displayCtx = displayCanvas.getContext("2d");
        if (!displayCtx) {
            return;
        }

        displayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);

        if (backgroundSettings.backgroundType !== "image" || !backgroundSettings.backgroundImageUrl) {
            backgroundWorkingCanvasRef.current = null;
            backgroundImageRef.current = null;
            return;
        }

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const workingCanvas = document.createElement("canvas");
            workingCanvas.width = canvasSize.width;
            workingCanvas.height = canvasSize.height;
            const workingCtx = workingCanvas.getContext("2d");
            if (!workingCtx) {
                return;
            }

            workingCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
            drawImageToRect(
                workingCtx,
                image,
                canvasSize.width,
                canvasSize.height,
                backgroundSettings.backgroundScaleMode
            );

            displayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
            displayCtx.drawImage(workingCanvas, 0, 0);

            backgroundWorkingCanvasRef.current = workingCanvas;
            backgroundImageRef.current = image;
        };
        image.onerror = () => {
            backgroundWorkingCanvasRef.current = null;
            backgroundImageRef.current = null;
            displayCtx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        };
        image.src = backgroundSettings.backgroundImageUrl;
    }, [
        backgroundSettings.backgroundType,
        backgroundSettings.backgroundImageUrl,
        backgroundSettings.backgroundScaleMode,
        canvasSize.height,
        canvasSize.width,
    ]);

    useEffect(() => {
        if (backgroundSettings.backgroundType !== "image") {
            setIsErasingBackground(false);
            setEraserCursorPos(null);
            lastErasePointRef.current = null;
            return;
        }

        if (backgroundTool !== "eraser") {
            setIsErasingBackground(false);
            lastErasePointRef.current = null;
        }
    }, [backgroundSettings.backgroundType, backgroundTool]);

    const applyEraseStroke = useCallback((x: number, y: number) => {
        const workingCanvas = backgroundWorkingCanvasRef.current;
        const displayCanvas = backgroundCanvasRef.current;
        if (!workingCanvas || !displayCanvas) {
            return;
        }

        const workingCtx = workingCanvas.getContext("2d");
        const displayCtx = displayCanvas.getContext("2d");
        if (!workingCtx || !displayCtx) {
            return;
        }

        const previous = lastErasePointRef.current;
        workingCtx.save();
        workingCtx.globalCompositeOperation = "destination-out";
        workingCtx.lineCap = "round";
        workingCtx.lineJoin = "round";
        workingCtx.strokeStyle = "rgba(0, 0, 0, 1)";
        workingCtx.lineWidth = brushSize;
        workingCtx.beginPath();
        if (previous) {
            workingCtx.moveTo(previous.x, previous.y);
            workingCtx.lineTo(x, y);
        } else {
            workingCtx.moveTo(x, y);
            workingCtx.lineTo(x + 0.01, y + 0.01);
        }
        workingCtx.stroke();
        workingCtx.restore();

        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(workingCanvas, 0, 0);
        lastErasePointRef.current = { x, y };
    }, [brushSize]);

    const getCanvasPointerPosition = useCallback((clientX: number, clientY: number) => {
        if (!canvasRef.current) {
            return null;
        }

        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: clamp((clientX - rect.left) / zoomScale, 0, canvasSize.width),
            y: clamp((clientY - rect.top) / zoomScale, 0, canvasSize.height),
        };
    }, [canvasSize.height, canvasSize.width, zoomScale]);

    const commitBackgroundErase = useCallback(() => {
        const workingCanvas = backgroundWorkingCanvasRef.current;
        if (!workingCanvas) {
            return;
        }

        try {
            const nextDataUrl = workingCanvas.toDataURL("image/png");
            setBackgroundSettings((prev) => ({
                ...prev,
                backgroundImageUrl: nextDataUrl,
            }));
        } catch {
            // Keep the in-memory edited canvas for current session when export is blocked.
        }
    }, []);

    const handleCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (
            backgroundTool !== "eraser" ||
            backgroundSettings.backgroundType !== "image" ||
            !backgroundSettings.backgroundImageUrl
        ) {
            return;
        }

        if ((event.target as HTMLElement).closest(".advanced-editor-product, .advanced-editor-text-layer-canvas")) {
            return;
        }

        const point = getCanvasPointerPosition(event.clientX, event.clientY);
        if (!point) {
            return;
        }

        event.stopPropagation();
        saveSnapshot();
        setIsImageSelected(false);
        setSelectedTextId(null);
        setEditingTextId(null);
        setIsErasingBackground(true);
        setEraserCursorPos(point);
        lastErasePointRef.current = null;
        applyEraseStroke(point.x, point.y);
    }, [
        applyEraseStroke,
        backgroundSettings.backgroundImageUrl,
        backgroundSettings.backgroundType,
        backgroundTool,
        getCanvasPointerPosition,
        saveSnapshot,
    ]);

    const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const point = getCanvasPointerPosition(event.clientX, event.clientY);
        if (!point) {
            return;
        }

        if (backgroundTool === "eraser" && backgroundSettings.backgroundType === "image") {
            setEraserCursorPos(point);
        }

        if (!isErasingBackground) {
            return;
        }

        event.stopPropagation();
        applyEraseStroke(point.x, point.y);
    }, [
        applyEraseStroke,
        backgroundSettings.backgroundType,
        backgroundTool,
        getCanvasPointerPosition,
        isErasingBackground,
    ]);

    const handleCanvasPointerUp = useCallback(() => {
        if (!isErasingBackground) {
            return;
        }

        setIsErasingBackground(false);
        lastErasePointRef.current = null;
        commitBackgroundErase();
    }, [commitBackgroundErase, isErasingBackground]);

    const handleCanvasPointerLeave = useCallback(() => {
        setEraserCursorPos(null);
        handleCanvasPointerUp();
    }, [handleCanvasPointerUp]);

    const backgroundImageLayerStyle = useMemo(() => {
        const mode = backgroundSettings.backgroundScaleMode;
        return {
            backgroundSize: mode === "fill" ? "100% 100%" : mode,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
        };
    }, [backgroundSettings.backgroundScaleMode]);

    const transparentFillLayerStyle = useMemo(() => {
        const fill = backgroundSettings.transparentFill;
        if (!fill.enabled || backgroundSettings.backgroundType !== "image" || !backgroundSettings.backgroundImageUrl) {
            return undefined;
        }

        if (fill.type === "solid") {
            return { background: fill.color };
        }

        if (fill.type === "gradient") {
            return {
                background: `linear-gradient(${fill.gradientAngle}deg, ${fill.gradientStart}, ${fill.gradientEnd})`,
            };
        }

        if (fill.type === "blur") {
            return {
                backgroundImage: `url(${backgroundSettings.backgroundImageUrl})`,
                ...backgroundImageLayerStyle,
                filter: `blur(${fill.blurAmount}px)`,
                transform: "scale(1.05)",
            };
        }

        return {
            backgroundColor: "rgba(255,255,255,0.04)",
            backgroundImage: getPatternPreview(fill.pattern, fill.color),
            backgroundSize:
                fill.pattern === "dots"
                    ? "18px 18px"
                    : fill.pattern === "grid"
                        ? "20px 20px"
                        : fill.pattern === "noise"
                            ? "8px 8px"
                            : "28px 28px",
        };
    }, [
        backgroundImageLayerStyle,
        backgroundSettings.backgroundImageUrl,
        backgroundSettings.backgroundType,
        backgroundSettings.transparentFill,
    ]);

    const handleSourceImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
        if (isSmartVariationRunRef.current) {
            return;
        }

        const loadedNatural = {
            width: event.currentTarget.naturalWidth || 380,
            height: event.currentTarget.naturalHeight || 380,
        };

        // A pinned layer was just promoted to the active image: keep it exactly
        // where (and how big) it was on the canvas, using the image's real
        // natural dimensions so its aspect ratio is correct. Do NOT re-fit or
        // re-center it to the template placement.
        const promotedGeometry = promotedPinnedGeometryRef.current;
        if (promotedGeometry) {
            promotedPinnedGeometryRef.current = null;
            originalImageNaturalSizeRef.current = loadedNatural;
            setImageNaturalSize(loadedNatural);
            setImageTransform({
                x: promotedGeometry.x,
                y: promotedGeometry.y,
                scale: promotedGeometry.width / Math.max(loadedNatural.width, 1),
            });
            return;
        }

        // When the original (non-bg-removed) image loads, capture its
        // dimensions as the canonical reference size.
        const isProcessedSource = sourceProcessedUrl && activeSourceImageUrl === sourceProcessedUrl;
        if (!isProcessedSource) {
            originalImageNaturalSizeRef.current = loadedNatural;
        }

        // Use the larger of original vs. loaded dimensions for layout so
        // that a lower-resolution bg-removed image doesn't shrink the
        // placement and degrade quality on subsequent template switches.
        const origRef = originalImageNaturalSizeRef.current;
        const nextNatural = origRef && (origRef.width > loadedNatural.width || origRef.height > loadedNatural.height)
            ? origRef
            : loadedNatural;

        setImageNaturalSize(nextNatural);
        const fitted = fitImageToPlacement(
            activeTemplate,
            canvasSize,
            nextNatural
        );

        // Keep processed (background-removed) source centered in canvas after async swap.
        if (isProcessedSource) {
            setImageTransform({
                ...fitted,
                x: canvasSize.width * 0.5,
                y: canvasSize.height * 0.5,
            });
            return;
        }

        setImageTransform(fitted);
    }, [activeSourceImageUrl, activeTemplate, canvasSize, sourceProcessedUrl]);

    return {
        navigate,
        brandingSettings,
        setBrandingEnabled,
        activeTool,
        setActiveTool,
        templates,
        isLoadingTemplates,
        isApplyingTemplate,
        activeTemplateId,
        templateError,
        sourceOriginalUrl,
        sourceProcessedUrl,
        erasedImageUrl,
        isSourceImageVisible,
        isBackgroundRemoving,
        canvasSize,
        imageNaturalSize,
        imageTransform,
        isImageSelected,
        zoomPercent,
        historyPast,
        historyFuture,
        filterState,
        isAdjustingFilterIntensity,
        textOverlays,
        selectedTextId,
        editingTextId,
        backgroundSettings,
        backgroundTool,
        brushSize,
        isErasingBackground,
        eraserCursorPos,
        resizeCanvasWidth,
        resizeCanvasHeight,
        lockResizeAspectRatio,
        resizeAspectRatio,
        selectedResizePreset,
        showResizeAdvanced,
        activeRailMode,
        isImageEraserModalOpen,
        isVariationsModalOpen,
        isCatalogueModalOpen,
        isSaveModalOpen,
        saveProjects,
        isSaveProjectsLoading,
        saveProjectsError,
        selectedProjectId,
        assetName,
        assetDescription,
        saveError,
        isSavingAsset,
        catalogueKeyword,
        catalogueResults,
        isCatalogueSearching,
        catalogueError,
        catalogueSelectionLoadingId,
        isCatalogueProcessing,
        catalogueProcessingMessage,
        catalogueToast,
        isAssetUploadModalOpen,
        assetUploadItems,
        isAssetUploadProcessing,
        assetUploadProcessingMessage,
        assetUploadError,
        pinnedProductLayers,
        heroAdjustTargetRatio,
        isHeroAdjustDownloading,
        activeImageTopTool,
        appliedCropPresetId,
        adjustSettings,
        isAdjustingImageAdjustments,
        shadowSettings,
        reflectionSettings,
        autoBrandColor,
        processedBrandLogoUrl,
        canvasRef,
        backgroundCanvasRef,
        activeTemplate,
        filteredTemplates,
        zoomScale,
        prefersProcessedSource,
        canvasFilterCss,
        imageShadowFilterCss,
        imageAdjustFilterCss,
        imageCompositeFilterCss,
        brandingMetrics,
        effectiveBrandColor,
        brandingBorderStyle,
        brandingLogoStyle,
        baseSourceImageUrl,
        activeSourceImageUrl,
        saveProjectOptions,
        selectedTextOverlay,
        appliedCropPreset,
        isHeroAdjustMode,
        isImageToolPanelRequested,
        isImageToolPanelActive,
        activePanelLabel,
        activePanelIcon,
        syncResizeStateWithCanvas,
        applyCanvasResize,
        applyResizePreset,
        updateResizeWidth,
        updateResizeHeight,
        toggleResizeAspectRatio,
        resetResizeCanvas,
        buildSnapshot,
        currentBackgroundStyle,
        imageRenderSize,
        saveSnapshot,
        updateShadowSettings,
        updateReflectionSettings,
        applyCropPreset,
        openImageEraserModal,
        handleSaveImageEraser,
        applyTemplate,
        runCatalogueSearch,
        openSaveModal,
        closeSaveModal,
        openCatalogueModal,
        closeCatalogueModal,
        handleCatalogueSearchSubmit,
        handleCatalogueProductSelect,
        openAssetUploadModal,
        closeAssetUploadModal,
        handleAssetFilesSelected,
        removeAssetUploadItem,
        handleAssetUploadConfirm,
        handlePointerMove,
        stopPointerInteraction,
        handleTextPointerMove,
        stopTextPointerInteraction,
        handlePinnedLayerSelect,
        startDragging,
        startResize,
        addText,
        updateText,
        deleteText,
        startTextDrag,
        startTextResize,
        handleUndo,
        handleRedo,
        captureSmartLayoutSnapshot,
        applySmartLayoutForRatio,
        restoreSmartLayoutSnapshot,
        beginHeroAdjustForVariation,
        exitHeroAdjustMode,
        exportCanvasForVariations,
        handleSaveAsset,
        downloadHeroAdjustedVariation,
        reflectionRenderStyle,
        handleZoomIn,
        handleZoomOut,
        beginFilterIntensityAdjust,
        handleFilterIntensityCommit,
        handleImageAdjustCommit,
        beginImageAdjust,
        updateAdjustSetting,
        resetAdjustSettings,
        updateBackgroundSettings,
        updateTransparentFill,
        handleBackgroundImageUpload,
        handleRemoveBackgroundImage,
        applyEraseStroke,
        getCanvasPointerPosition,
        commitBackgroundErase,
        handleCanvasPointerDown,
        handleCanvasPointerMove,
        handleCanvasPointerUp,
        handleCanvasPointerLeave,
        backgroundImageLayerStyle,
        transparentFillLayerStyle,
        handleSourceImageLoad,
        setActiveRailMode,
        setActiveImageTopTool,
        setIsImageEraserModalOpen,
        setIsVariationsModalOpen,
        setIsCatalogueModalOpen,
        setCatalogueKeyword,
        setIsImageSelected,
        setSelectedTextId,
        setEditingTextId,
        setFilterState,
        setShowResizeAdvanced,
        setBackgroundTool,
        setBrushSize,
        setResizeCanvasWidth,
        setResizeCanvasHeight,
        setSelectedResizePreset,
        setCatalogueToast,
        setSaveError,
        setSelectedProjectId,
        setAssetName,
        setAssetDescription,
        setZoomPercent,
    };
};
