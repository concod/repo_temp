import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Crop, PixelCrop } from "react-image-crop";
import { isAllowedPreviewUrl, toProxyGeneratedImageUrl } from "../../../../features/chatbot/utils/imageUtils";
import { generateEditedImage, generateExpandedImage } from "../../../../services/imageEditorService";
import { fetchImageAsBlob } from "../../../../services/topazUpscaleService";
import { useBrandingStore } from "../../../../store/brandingStore";
import { bannerAgentService, type ProjectApiItem } from "../../../../services/bannerAgentService";
import { useStandaloneCreativeConfig } from "../../../../../../shared/packages/marketingCreativeCore/provider";
import {
    DEFAULT_CROP,
    isEditorToolKey,
} from "../assetEditorConstants";
import {
    createHistoryEntry,
    createTextElement,
    findCropPreset,
    getAssetCountLabel,
    getBrandingLogoPlacement,
    getBrandingMetrics,
    getHistoryLabel,
    isTypingTarget,
    loadImageFromBlob,
    loadVideoDimensions,
    recolorLightPixelsInLogo,
    sampleEdgeColorFromImage,
    toSafeString,
} from "../assetEditorUtils";
import { loadEditorState, saveEditorState } from "../assetEditorState";
import type {
    EditorToolKey,
    HistoryEntry,
    TextElement,
    UploadedObject,
} from "../assetEditorTypes";

export function useAssetEditorController() {
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

            // Tools whose results are shown in the generation modal (e.g. "modify")
            // must NOT auto-apply to the canvas/history. The selected variation is
            // committed only when the user picks one via the modal's "Use Image" action.
            if (nextImages.length > 0 && !showResultsInModal) {
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

    return {
        // config / branding
        isCreateAdEnabledInAssetEditor,
        brandingSettings,
        setBrandingEnabled,

        // tool selection
        activeTool,
        handleToolSelect,

        // edit panel inputs
        prompt,
        setPrompt,
        negativePrompt,
        setNegativePrompt,
        variations,
        setVariations,
        brushSize,
        setBrushSize,

        // generation
        isGenerating,
        isGenerateDisabled,
        handleGenerate,
        handleAbortGeneration,
        generationModalOpen,
        setGenerationModalOpen,
        generationItems,

        // image / history
        activeImageUrl,
        originalImageUrl,
        imageHistory,
        activeHistoryIndex,
        setActiveFromHistoryIndex,
        commitHistoryImages,
        canUndo,
        canRedo,
        handleUndo,
        handleRedo,
        isHistoryOpen,
        setIsHistoryOpen,

        // text tool
        textElements,
        removeExistingTexts,
        setRemoveExistingTexts,
        handleTextElementAdd,
        handleTextElementRemove,
        handleTextElementChange,

        // asset tool
        addedObjectImages,
        handleAddObjectFiles,
        handleRemoveAddedObject,
        addedObjectPrompt,
        setAddedObjectPrompt,
        optimizeForPets,
        setOptimizeForPets,
        isPetOptimizationVisible,

        // erase tool
        objectRemovalMask,
        setObjectRemovalMask,

        // expand tool
        expandWidth,
        setExpandWidth,
        expandHeight,
        setExpandHeight,
        expandZoom,
        setExpandZoom,
        expandPosition,
        setExpandPosition,
        expandPreset,
        setExpandPreset,

        // crop tool
        selectedCropPreset,
        handleCropPresetSelect,
        selectedCropPresetConfig,
        isCropOverlayVisible,
        cropSelection,
        setCropSelection,
        setCropPixelSelection,
        setCropImageElement,
        isApplyingCrop,
        isApplyCropDisabled,
        handleApplyCrop,
        cropToastVersion,

        // download
        downloadImage,

        // create ad
        handleCreateAd,

        // video
        videoModalOpen,
        setVideoModalOpen,
        videoPlayerOpen,
        setVideoPlayerOpen,
        generatedVideoUrl,
        handleOpenVideoModal,
        handleVideoGenerated,

        // save modal
        isSaveModalOpen,
        isSavingAsset,
        isSaveProjectsLoading,
        saveProjectsError,
        saveError,
        setSaveError,
        saveProjectOptions,
        selectedProjectId,
        setSelectedProjectId,
        assetName,
        setAssetName,
        assetDescription,
        setAssetDescription,
        openSaveModal,
        closeSaveModal,
        handleSaveVideoAsset,
    };
}
