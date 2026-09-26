import { useEffect, useRef, useState } from "react";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import MaskingCanvas from "../MaskingCanvas/MaskingCanvas.jsx";
import "react-image-crop/dist/ReactCrop.css";
import "./CanvasArea.scss";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getBrandingMetrics = (canvasSize, settings) => {
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

const getBrandingLogoStyle = (settings, metrics) => {
    const { distance, logoPadding, logoSize } = metrics;

    const style = {
        width: logoSize,
        height: logoSize,
    };

    if (settings.logoPosition === "top-left") {
        style.left = distance + logoPadding + settings.logoOffsetX;
        style.top = distance + logoPadding + settings.logoOffsetY;
    } else if (settings.logoPosition === "top-right") {
        style.right = distance + logoPadding - settings.logoOffsetX;
        style.top = distance + logoPadding + settings.logoOffsetY;
    } else if (settings.logoPosition === "bottom-left") {
        style.left = distance + logoPadding + settings.logoOffsetX;
        style.bottom = distance + logoPadding - settings.logoOffsetY;
    } else {
        style.right = distance + logoPadding - settings.logoOffsetX;
        style.bottom = distance + logoPadding - settings.logoOffsetY;
    }

    return style;
};

const hexToRgb = (hex) => {
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

const getLuminance = (color) => {
    const rgb = hexToRgb(color);
    if (!rgb) {
        return 255;
    }
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

const getBestContrastColor = (backgroundColor) => (getLuminance(backgroundColor) > 140 ? "#111827" : "#ffffff");

const rgbToHex = (r, g, b) => {
    const normalize = (value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    return `#${normalize(r)}${normalize(g)}${normalize(b)}`;
};

const sampleEdgeColorFromImage = (imageUrl) => new Promise((resolve, reject) => {
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
        let imageData;
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

        const pushPixel = (x, y) => {
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

const recolorLightPixelsInLogo = (logoUrl, colorHex) => new Promise((resolve, reject) => {
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
        let imageData;
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
            if (alpha === 0) {
                continue;
            }
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

const HistoryItem = ({ imageUrl, label, index, active, onSelectItem }) => (
    <button
        type="button"
        className={`canvas-area__history-item${active ? " is-active" : ""}`}
        onClick={() => onSelectItem(index)}
    >
        <div className="canvas-area__history-thumb-wrap">
            <img src={imageUrl} alt={label} className="canvas-area__history-thumb" />
        </div>
        <span className="canvas-area__history-label">{label}</span>
    </button>
);

function HistoryPanel({ isOpen, originalImageUrl, historyItems, activeHistoryIndex, onSelectItem, onClose }) {
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (isOpen && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [historyItems.length, isOpen]);

    return (
        <aside className={`canvas-area__history-panel${isOpen ? " is-open" : ""}`} aria-hidden={!isOpen}>
            <div className="canvas-area__history-header">
                <div className="canvas-area__history-title-wrap">
                    <CanvasIcon name="history" />
                    <h3>History</h3>
                </div>
                <button type="button" aria-label="Close history panel" onClick={onClose}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 6l12 12M18 6l-12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            <div ref={scrollContainerRef} className="canvas-area__history-list" aria-label="Edit history list">
                {originalImageUrl ? (
                    <HistoryItem
                        imageUrl={originalImageUrl}
                        label="Original"
                        index={-1}
                        active={activeHistoryIndex === -1}
                        onSelectItem={onSelectItem}
                    />
                ) : null}

                {historyItems.map((item, index) => (
                    <HistoryItem
                        key={item.id}
                        imageUrl={item.imageUrl}
                        label={item.label}
                        index={index}
                        active={activeHistoryIndex === index}
                        onSelectItem={onSelectItem}
                    />
                ))}
            </div>
        </aside>
    );
}

function CanvasIcon({ name }) {
    if (name === "undo") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 8H5v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 8a7 7 0 111.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    if (name === "redo") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 8h4v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 8a7 7 0 10-1.2 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

export default function CanvasArea({
    activeTool = "modify",
    imageUrl = "",
    onDownloadImage,
    canDownload = true,
    brandingSettings,
    isGenerating = false,
    brushSize = 30,
    onMaskChange,
    initialMaskDataUrl,
    expandWidth = 1080,
    expandHeight = 1080,
    expandZoom = 1,
    expandPosition = { x: 0, y: 0 },
    onExpandPositionChange,
    assetMode = "add",
    replaceSelection,
    onReplaceSelectionChange,
    onAssetReplaceMaskChange,
    cropSelection,
    onCropSelectionChange,
    onCropCompleteChange,
    selectedCropPresetId,
    selectedCropPresetAspect,
    isCropOverlayVisible = true,
    onCropImageReady,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
    isHistoryOpen = false,
    onHistoryToggle,
    onHistoryClose,
    historyItems = [],
    originalImageUrl = null,
    activeHistoryIndex = -1,
    onHistorySelect,
    cropToastVersion = 0,
    onCropToastUndo,
}) {
    const zoom = 100;
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [resolvedImageUrl, setResolvedImageUrl] = useState("");
    const [aspectRatio, setAspectRatio] = useState(1);
    const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 });
    const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
    const [logoAspectRatio, setLogoAspectRatio] = useState(1);
    const [isDraggingExpand, setIsDraggingExpand] = useState(false);
    const [isSelectingReplace, setIsSelectingReplace] = useState(false);
    const [replaceSelectionDraft, setReplaceSelectionDraft] = useState(null);
    const [showCropToast, setShowCropToast] = useState(false);
    const [canUndoMaskStroke, setCanUndoMaskStroke] = useState(false);
    const [autoBrandColor, setAutoBrandColor] = useState(brandingSettings?.color || "#ffffff");
    const [processedBrandLogoUrl, setProcessedBrandLogoUrl] = useState(brandingSettings?.logoUrl || "");
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const replaceStartRef = useRef({ x: 0, y: 0 });
    const previewRef = useRef(null);
    const cropImageRef = useRef(null);
    const cropToastTimeoutRef = useRef(null);
    const maskCanvasRef = useRef(null);

    useEffect(() => {
        if (!imageUrl) {
            setResolvedImageUrl("");
            setIsImageLoaded(false);
            setAspectRatio(1);
            return;
        }

        let isActive = true;
        const image = new Image();

        setIsImageLoaded(false);
        image.onload = () => {
            if (!isActive) return;
            const ratio = image.naturalWidth > 0 && image.naturalHeight > 0
                ? image.naturalWidth / image.naturalHeight
                : 1;
            setAspectRatio(ratio);
            setNaturalSize({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
            setResolvedImageUrl(imageUrl);
            setIsImageLoaded(true);
        };
        image.onerror = () => {
            if (!isActive) return;
            setResolvedImageUrl("");
            setIsImageLoaded(false);
            setAspectRatio(1);
            setNaturalSize({ width: 1, height: 1 });
        };
        image.src = imageUrl;

        return () => {
            isActive = false;
        };
    }, [imageUrl]);

    const isEraseMode = activeTool === "erase";
    const isReplaceMode = activeTool === "asset" && assetMode === "replace";
    const isExpandMode = activeTool === "expand";
    const isCropMode = activeTool === "crop";
    const targetAspectRatio = expandWidth > 0 && expandHeight > 0
        ? expandWidth / expandHeight
        : aspectRatio;
    const showBranding = Boolean(brandingSettings?.enabled && isImageLoaded && previewSize.width > 0 && previewSize.height > 0);
    const brandingMetrics = showBranding ? getBrandingMetrics(previewSize, brandingSettings) : null;
    const effectiveBrandColor = brandingSettings?.autoColor ? autoBrandColor : brandingSettings?.color;
    const brandingBorderStyle = showBranding && brandingMetrics
        ? {
            inset: brandingMetrics.distance,
            borderColor: effectiveBrandColor || "#ffffff",
            borderWidth: brandingMetrics.strokeWidth,
        }
        : null;
    const baseLogoStyle = showBranding && brandingMetrics
        ? getBrandingLogoStyle(brandingSettings, brandingMetrics)
        : null;
    const safeLogoRatio = Number.isFinite(logoAspectRatio) && logoAspectRatio > 0 ? logoAspectRatio : 1;
    const baseLogoHeight = brandingMetrics?.logoSize ?? 0;
    const maxLogoWidth = brandingMetrics
        ? Math.max(0, previewSize.width - (brandingMetrics.distance + brandingMetrics.logoPadding) * 2)
        : 0;
    let logoWidth = baseLogoHeight * safeLogoRatio;
    let logoHeight = baseLogoHeight;

    if (maxLogoWidth > 0 && logoWidth > maxLogoWidth) {
        const scale = maxLogoWidth / logoWidth;
        logoWidth = maxLogoWidth;
        logoHeight = baseLogoHeight * scale;
    }

    const brandingLogoStyle = baseLogoStyle
        ? {
            ...baseLogoStyle,
            width: logoWidth || baseLogoStyle.width,
            height: logoHeight || baseLogoStyle.height,
        }
        : null;
    const isDownloadDisabled = !canDownload;
    const shouldShiftDownload = Boolean(
        showBranding && brandingSettings?.logoEnabled && brandingSettings?.logoPosition === "bottom-right"
    );
    const downloadOverlayStyle = shouldShiftDownload ? { left: 14, right: "auto" } : undefined;

    useEffect(() => {
        if (!brandingSettings?.autoColor) {
            setAutoBrandColor(brandingSettings?.color || "#ffffff");
            return undefined;
        }

        if (!resolvedImageUrl) {
            setAutoBrandColor(brandingSettings?.color || "#ffffff");
            return undefined;
        }

        let cancelled = false;
        sampleEdgeColorFromImage(resolvedImageUrl)
            .then((nextColor) => {
                if (!cancelled) {
                    setAutoBrandColor(nextColor);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setAutoBrandColor("#ffffff");
                }
            });

        return () => {
            cancelled = true;
        };
    }, [brandingSettings?.autoColor, brandingSettings?.color, resolvedImageUrl]);

    useEffect(() => {
        if (!brandingSettings?.logoUrl || !brandingSettings?.logoEnabled || !brandingSettings?.enabled) {
            setProcessedBrandLogoUrl(brandingSettings?.logoUrl || "");
            return undefined;
        }

        let cancelled = false;
        recolorLightPixelsInLogo(brandingSettings.logoUrl, effectiveBrandColor || "#ffffff")
            .then((processed) => {
                if (!cancelled) {
                    setProcessedBrandLogoUrl(processed);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setProcessedBrandLogoUrl(brandingSettings.logoUrl);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [brandingSettings?.enabled, brandingSettings?.logoEnabled, brandingSettings?.logoUrl, effectiveBrandColor]);

    useEffect(() => {
        const node = previewRef.current;
        if (!node) {
            return undefined;
        }

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            if (rect.width && rect.height) {
                setPreviewSize({ width: rect.width, height: rect.height });
            }
        };

        updateSize();

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateSize);
            return () => window.removeEventListener("resize", updateSize);
        }

        const observer = new ResizeObserver(() => updateSize());
        observer.observe(node);
        return () => observer.disconnect();
    }, [resolvedImageUrl, activeTool]);

    const createPresetCrop = (img) => {
        if (!img) {
            return null;
        }

        if (selectedCropPresetAspect && selectedCropPresetAspect > 0) {
            const presetCrop = makeAspectCrop(
                { unit: "%", width: 90 },
                selectedCropPresetAspect,
                img.naturalWidth,
                img.naturalHeight
            );
            return centerCrop(presetCrop, img.naturalWidth, img.naturalHeight);
        }

        return centerCrop(
            { unit: "%", width: 90, height: 90, x: 5, y: 5 },
            img.naturalWidth,
            img.naturalHeight
        );
    };

    const handleCropImageLoad = (event) => {
        const imageElement = event.currentTarget;
        cropImageRef.current = imageElement;
        if (isCropOverlayVisible) {
            const nextCrop = createPresetCrop(imageElement);
            if (nextCrop) {
                onCropSelectionChange?.(nextCrop);
            }
        }
        onCropImageReady?.(imageElement);
    };

    const startExpandDrag = (event) => {
        if (!isExpandMode) return;

        setIsDraggingExpand(true);
        dragOffsetRef.current = {
            x: event.clientX - expandPosition.x,
            y: event.clientY - expandPosition.y,
        };
    };

    const moveExpandDrag = (event) => {
        if (!isExpandMode || !isDraggingExpand) return;

        onExpandPositionChange?.({
            x: event.clientX - dragOffsetRef.current.x,
            y: event.clientY - dragOffsetRef.current.y,
        });
    };

    const endExpandDrag = () => {
        setIsDraggingExpand(false);
    };

    useEffect(() => {
        if (!isReplaceMode) {
            setIsSelectingReplace(false);
            setReplaceSelectionDraft(null);
            onReplaceSelectionChange?.(null);
            onAssetReplaceMaskChange?.(null);
        }
    }, [isReplaceMode, onAssetReplaceMaskChange, onReplaceSelectionChange]);

    useEffect(() => {
        if (!isCropMode) {
            cropImageRef.current = null;
            onCropImageReady?.(null);
            onCropCompleteChange?.(null);
        }
    }, [isCropMode, onCropCompleteChange, onCropImageReady]);

    useEffect(() => {
        if (!isCropMode || !isCropOverlayVisible || !onCropSelectionChange) {
            return;
        }

        const imageNode = cropImageRef.current;
        if (!imageNode) {
            return;
        }

        const nextCrop = createPresetCrop(imageNode);
        if (nextCrop) {
            onCropSelectionChange(nextCrop);
        }
    }, [isCropMode, isCropOverlayVisible, selectedCropPresetAspect, selectedCropPresetId]);

    useEffect(() => {
        if (cropToastVersion <= 0) {
            return;
        }

        setShowCropToast(true);
        if (cropToastTimeoutRef.current) {
            window.clearTimeout(cropToastTimeoutRef.current);
        }
        cropToastTimeoutRef.current = window.setTimeout(() => {
            setShowCropToast(false);
        }, 3200);
    }, [cropToastVersion]);

    useEffect(() => {
        return () => {
            if (cropToastTimeoutRef.current) {
                window.clearTimeout(cropToastTimeoutRef.current);
            }
        };
    }, []);

    const getRelativePoint = (event) => {
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) {
            return null;
        }

        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        return { x, y, rect };
    };

    const beginReplaceSelection = (event) => {
        if (!isReplaceMode || !isImageLoaded) return;

        const point = getRelativePoint(event);
        if (!point) return;

        event.preventDefault();
        replaceStartRef.current = { x: point.x, y: point.y };
        setIsSelectingReplace(true);
        setReplaceSelectionDraft({ x: point.x, y: point.y, width: 0, height: 0 });
    };

    const updateReplaceSelection = (event) => {
        if (!isReplaceMode || !isSelectingReplace) return;

        const point = getRelativePoint(event);
        if (!point) return;

        const left = Math.min(replaceStartRef.current.x, point.x);
        const top = Math.min(replaceStartRef.current.y, point.y);
        const width = Math.abs(point.x - replaceStartRef.current.x);
        const height = Math.abs(point.y - replaceStartRef.current.y);

        setReplaceSelectionDraft({ x: left, y: top, width, height });
    };

    const finalizeReplaceSelection = () => {
        if (!isSelectingReplace || !previewRef.current || !replaceSelectionDraft) {
            setIsSelectingReplace(false);
            return;
        }

        const rect = previewRef.current.getBoundingClientRect();
        const normalized = {
            x: replaceSelectionDraft.x / rect.width,
            y: replaceSelectionDraft.y / rect.height,
            width: replaceSelectionDraft.width / rect.width,
            height: replaceSelectionDraft.height / rect.height,
        };

        if (normalized.width < 0.01 || normalized.height < 0.01) {
            setReplaceSelectionDraft(null);
            onReplaceSelectionChange?.(null);
            onAssetReplaceMaskChange?.(null);
            setIsSelectingReplace(false);
            return;
        }

        onReplaceSelectionChange?.(normalized);

        const canvas = document.createElement("canvas");
        canvas.width = naturalSize.width;
        canvas.height = naturalSize.height;
        const context = canvas.getContext("2d");

        if (context) {
            context.fillStyle = "black";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "white";
            context.fillRect(
                Math.round(normalized.x * canvas.width),
                Math.round(normalized.y * canvas.height),
                Math.round(normalized.width * canvas.width),
                Math.round(normalized.height * canvas.height)
            );
            onAssetReplaceMaskChange?.(canvas.toDataURL("image/png"));
        }

        setIsSelectingReplace(false);
    };

    const persistedSelection = replaceSelection
        ? {
            left: `${replaceSelection.x * 100}%`,
            top: `${replaceSelection.y * 100}%`,
            width: `${replaceSelection.width * 100}%`,
            height: `${replaceSelection.height * 100}%`,
        }
        : null;

    const handleTopRightUndo = () => {
        if (isEraseMode && canUndoMaskStroke) {
            maskCanvasRef.current?.undoMaskStroke?.();
            return;
        }

        onUndo?.();
    };

    const canUseTopRightUndo = isEraseMode ? canUndoMaskStroke || canUndo : canUndo;

    return (
        <section className="canvas-area" aria-label="Asset preview canvas">
            <div className="canvas-area__controls">
                <button type="button" aria-label="Undo" onClick={handleTopRightUndo} disabled={!canUseTopRightUndo}>
                    <CanvasIcon name="undo" />
                </button>
                <button type="button" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
                    <CanvasIcon name="redo" />
                </button>
                <button
                    type="button"
                    aria-label="History"
                    onClick={onHistoryToggle}
                    className={isHistoryOpen ? "is-active" : ""}
                >
                    <CanvasIcon name="history" />
                </button>
            </div>

            <div className="canvas-area__stage">
                <figure
                    ref={previewRef}
                    className={`canvas-area__preview${isEraseMode ? " canvas-area__preview--erase" : ""}${isExpandMode ? " canvas-area__preview--expand" : ""}${isCropMode ? " canvas-area__preview--crop" : ""}`}
                    style={{
                        aspectRatio: isExpandMode ? targetAspectRatio : aspectRatio,
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: "center center",
                    }}
                    onMouseDown={beginReplaceSelection}
                    onMouseMove={(event) => {
                        moveExpandDrag(event);
                        updateReplaceSelection(event);
                    }}
                    onMouseUp={() => {
                        endExpandDrag();
                        finalizeReplaceSelection();
                    }}
                    onMouseLeave={() => {
                        endExpandDrag();
                        finalizeReplaceSelection();
                    }}
                >
                    {isImageLoaded && resolvedImageUrl ? (
                        isEraseMode ? (
                            <MaskingCanvas
                                key={resolvedImageUrl}
                                ref={maskCanvasRef}
                                imageUrl={resolvedImageUrl}
                                brushSize={brushSize}
                                onMaskChange={onMaskChange}
                                initialMaskDataUrl={initialMaskDataUrl}
                                onMaskUndoAvailabilityChange={setCanUndoMaskStroke}
                            />
                        ) : isExpandMode ? (
                            <div className="canvas-area__expand-stage">
                                <img
                                    src={resolvedImageUrl}
                                    alt="Expand composition"
                                    className={`canvas-area__expand-image${isDraggingExpand ? " dragging" : ""}`}
                                    onMouseDown={startExpandDrag}
                                    draggable={false}
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${expandPosition.x}px, ${expandPosition.y}px) scale(${expandZoom})`,
                                    }}
                                />
                            </div>
                        ) : isCropMode ? (
                            <div className="canvas-area__crop-wrapper">
                                {isCropOverlayVisible ? (
                                    <ReactCrop
                                        crop={cropSelection}
                                        onChange={(nextCrop) => onCropSelectionChange?.(nextCrop)}
                                        onComplete={(pixelCrop) => onCropCompleteChange?.(pixelCrop)}
                                        aspect={selectedCropPresetAspect && selectedCropPresetAspect > 0 ? selectedCropPresetAspect : undefined}
                                        keepSelection
                                        minWidth={10}
                                        minHeight={10}
                                    >
                                        <img
                                            src={resolvedImageUrl}
                                            alt="Crop preview"
                                            className="canvas-area__crop-image"
                                            crossOrigin="anonymous"
                                            onLoad={handleCropImageLoad}
                                        />
                                    </ReactCrop>
                                ) : (
                                    <img
                                        src={resolvedImageUrl}
                                        alt="Crop preview"
                                        className="canvas-area__crop-image"
                                        crossOrigin="anonymous"
                                        onLoad={handleCropImageLoad}
                                    />
                                )}
                            </div>
                        ) : (
                            <img src={resolvedImageUrl} alt="Asset preview" />
                        )
                    ) : (
                        <div className="canvas-area__skeleton" aria-label="Loading preview image">
                            <div className="canvas-area__skeleton-content" role="status" aria-live="polite">
                                <span className="canvas-area__skeleton-spinner" aria-hidden="true" />
                                <span>Loading image...</span>
                            </div>
                        </div>
                    )}

                    {isReplaceMode && replaceSelectionDraft ? (
                        <div
                            className="canvas-area__replace-selection"
                            style={{
                                left: `${replaceSelectionDraft.x}px`,
                                top: `${replaceSelectionDraft.y}px`,
                                width: `${replaceSelectionDraft.width}px`,
                                height: `${replaceSelectionDraft.height}px`,
                            }}
                        />
                    ) : null}

                    {isReplaceMode && !replaceSelectionDraft && persistedSelection ? (
                        <div
                            className="canvas-area__replace-selection"
                            style={persistedSelection}
                        />
                    ) : null}

                    {showBranding && brandingBorderStyle ? (
                        <>
                            <div className="canvas-area__branding-border" style={brandingBorderStyle} />
                            {brandingSettings.logoEnabled && processedBrandLogoUrl && brandingLogoStyle ? (
                                <img
                                    src={processedBrandLogoUrl}
                                    alt="Brand logo"
                                    className="canvas-area__branding-logo"
                                    style={brandingLogoStyle}
                                    onLoad={(event) => {
                                        const { naturalWidth, naturalHeight } = event.currentTarget;
                                        if (naturalWidth > 0 && naturalHeight > 0) {
                                            setLogoAspectRatio(naturalWidth / naturalHeight);
                                        }
                                    }}
                                />
                            ) : null}
                        </>
                    ) : null}

                    {isGenerating ? (
                        <div className="canvas-area__generating" aria-label="Generating image result">
                            <span className="canvas-area__generating-dot" aria-hidden="true" />
                            <span>Generating...</span>
                        </div>
                    ) : null}

                    {showCropToast ? (
                        <div className="canvas-area__crop-toast" role="status" aria-live="polite">
                            <span>Asset Cropped</span>
                            <button type="button" onClick={onCropToastUndo} aria-label="Undo crop">
                                <CanvasIcon name="undo" />
                            </button>
                        </div>
                    ) : null}

                    {isImageLoaded && resolvedImageUrl ? (
                        <button
                            type="button"
                            className="canvas-area__download-overlay"
                            onClick={() => onDownloadImage?.()}
                            aria-label="Download image"
                            disabled={isDownloadDisabled}
                            title={isDownloadDisabled ? "Image not ready yet" : "Download image"}
                            style={downloadOverlayStyle}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span>Download</span>
                        </button>
                    ) : null}
                </figure>
            </div>

            <HistoryPanel
                isOpen={isHistoryOpen}
                originalImageUrl={originalImageUrl}
                historyItems={historyItems}
                activeHistoryIndex={activeHistoryIndex}
                onSelectItem={onHistorySelect}
                onClose={onHistoryClose}
            />

            {/*
            <div className="canvas-area__zoom">
                <input
                    type="range"
                    min={25}
                    max={130}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    aria-label="Canvas zoom"
                />
                <span>{zoom}%</span>
            </div>
            */}
        </section>
    );
}
