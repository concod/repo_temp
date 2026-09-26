import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { ASPECT_RATIOS } from "./aspectRatios";
import type { AspectRatioOption, SmartLayoutSnapshot, VariationResult } from "./types";
import { generateAdvancedVariation } from "./advancedVariationService";
import exportPlaceholder from "../../../assets/advanced-editor-icons/export-placeholder.svg"

interface VariationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceImage: string | null;
    onExportCanvas: () => Promise<string>;
    captureSnapshot: () => SmartLayoutSnapshot;
    applySmartLayout: (snapshot: SmartLayoutSnapshot, ratio: AspectRatioOption) => Promise<void>;
    restoreSnapshot: (snapshot: SmartLayoutSnapshot) => void;
    onEditSmartVariation: (ratio: AspectRatioOption, editableState: SmartLayoutSnapshot) => void;
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function downloadDataUrl(dataUrl: string, filename: string): void {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return fetch(dataUrl).then((response) => {
        if (!response.ok) {
            throw new Error("Failed to prepare image for ZIP export");
        }
        return response.blob();
    });
}

function resizeImageToDataUrl(dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL("image/png", 1));
        };
        img.onerror = () => reject(new Error("Failed to load image for resizing"));
        img.src = dataUrl;
    });
}

/** Group aspect ratios by category for sidebar display */
function groupByCategory(ratios: AspectRatioOption[]): Record<string, AspectRatioOption[]> {
    const groups: Record<string, AspectRatioOption[]> = {};
    ratios.forEach((ratio) => {
        const cat = ratio.category || "Other";
        if (!groups[cat]) {
            groups[cat] = [];
        }
        groups[cat].push(ratio);
    });
    return groups;
}

function getDisplayedDimensions(ratio: AspectRatioOption, isSmartLayoutMode: boolean): { width: number; height: number } {
    if (isSmartLayoutMode) {
        return {
            width: ratio.downloadWidth,
            height: ratio.downloadHeight,
        };
    }

    return {
        width: ratio.width,
        height: ratio.height,
    };
}

function clampValue(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function splitIntoVerticalColumns<T>(items: T[], columnCount: number): T[][] {
    const safeColumnCount = Math.max(1, columnCount);
    const columns = Array.from({ length: safeColumnCount }, () => [] as T[]);
    const itemsPerColumn = Math.ceil(items.length / safeColumnCount);

    items.forEach((item, index) => {
        const columnIndex = Math.min(Math.floor(index / Math.max(itemsPerColumn, 1)), safeColumnCount - 1);
        columns[columnIndex].push(item);
    });

    return columns;
}

function isUltraWideBatchRatio(ratio: AspectRatioOption): boolean {
    return (ratio.downloadWidth / Math.max(ratio.downloadHeight, 1)) >= 6.5;
}

interface BatchEditHeroState {
    x: number;
    y: number;
    scale: number;
    naturalWidth: number;
    naturalHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    baseX: number;
    baseY: number;
    baseScale: number;
}

type BatchHeroInteraction = {
    ratioId: string;
    mode: "drag" | "resize";
    stageRect: DOMRect;
    startScale: number;
    startDistance: number;
    offsetX: number;
    offsetY: number;
    startClientX: number;
    startClientY: number;
};

export function VariationsModal({
    isOpen,
    onClose,
    sourceImage,
    onExportCanvas,
    captureSnapshot,
    applySmartLayout,
    restoreSnapshot,
    onEditSmartVariation,
}: VariationsModalProps) {
    const getDefaultRatioIds = (smartLayoutEnabled: boolean): string[] => {
        if (smartLayoutEnabled) {
            return ASPECT_RATIOS.map((ratio) => ratio.id);
        }

        return ASPECT_RATIOS.filter((ratio) => !ratio.comingSoon).map((ratio) => ratio.id);
    };

    const [results, setResults] = useState<Record<string, VariationResult>>({});
    const [selectedRatioIds, setSelectedRatioIds] = useState<string[]>(() => getDefaultRatioIds(true));
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSmartLayoutMode, setIsSmartLayoutMode] = useState(true);
    const [selectedPreview, setSelectedPreview] = useState<{ url: string; title: string; width: number; height: number } | null>(null);
    const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
    const [batchHeroStateByRatio, setBatchHeroStateByRatio] = useState<Record<string, BatchEditHeroState>>({});
    const [batchBaseImageByRatio, setBatchBaseImageByRatio] = useState<Record<string, string>>({});
    const [isBatchExporting, setIsBatchExporting] = useState(false);
    const [isBatchHeroReady, setIsBatchHeroReady] = useState(false);
    const [isBatchStagePreparing, setIsBatchStagePreparing] = useState(false);

    const generationIdRef = useRef(0);
    const batchHeroInteractionRef = useRef<BatchHeroInteraction | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setResults({});
        setIsGenerating(false);
        setIsSmartLayoutMode(true);
        setSelectedRatioIds(getDefaultRatioIds(true));
        setIsBatchEditOpen(false);
        setBatchHeroStateByRatio({});
        setBatchBaseImageByRatio({});
        setIsBatchExporting(false);
        setIsBatchHeroReady(false);
        setIsBatchStagePreparing(false);
        generationIdRef.current += 1;
    }, [isOpen]);

    useEffect(() => {
        if (!isBatchEditOpen || !sourceImage) {
            setIsBatchHeroReady(false);
            return;
        }

        let cancelled = false;
        const image = new Image();
        image.onload = () => {
            if (!cancelled) {
                setIsBatchHeroReady(true);
            }
        };
        image.onerror = () => {
            if (!cancelled) {
                setIsBatchHeroReady(false);
            }
        };
        image.src = sourceImage;

        if (image.complete && image.naturalWidth > 0) {
            setIsBatchHeroReady(true);
        }

        return () => {
            cancelled = true;
        };
    }, [isBatchEditOpen, sourceImage]);

    useEffect(() => {
        setSelectedRatioIds(getDefaultRatioIds(isSmartLayoutMode));
    }, [isSmartLayoutMode]);

    const activeImage = sourceImage;

    const selectedRatios = useMemo(() => {
        return ASPECT_RATIOS.filter((ratio) => {
            if (!selectedRatioIds.includes(ratio.id)) {
                return false;
            }
            if (isSmartLayoutMode) {
                return true;
            }
            return !ratio.comingSoon;
        });
    }, [isSmartLayoutMode, selectedRatioIds]);

    const hasCompleted = useMemo(() => {
        return Object.values(results).some((result) => result.status === "completed");
    }, [results]);

    const completedSmartRatios = useMemo(() => {
        if (!isSmartLayoutMode) {
            return [] as AspectRatioOption[];
        }

        return ASPECT_RATIOS.filter((ratio) => {
            const result = results[ratio.id];
            return result?.status === "completed" && !!result.editableState?.image;
        });
    }, [isSmartLayoutMode, results]);

    const canBatchEdit = completedSmartRatios.length > 1;
    const ultraWideBatchRatios = useMemo(
        () => completedSmartRatios.filter((ratio) => isUltraWideBatchRatio(ratio)),
        [completedSmartRatios]
    );
    const regularBatchRatios = useMemo(
        () => completedSmartRatios.filter((ratio) => !isUltraWideBatchRatio(ratio)),
        [completedSmartRatios]
    );
    const batchEditColumns = useMemo(() => splitIntoVerticalColumns(regularBatchRatios, 3), [regularBatchRatios]);

    const isBatchSceneReady = isBatchHeroReady
        && !isBatchStagePreparing
        && completedSmartRatios.every((ratio) => !!batchBaseImageByRatio[ratio.id]);

    const renderBatchEditCard = (ratio: AspectRatioOption) => {
        const result = results[ratio.id];
        const hero = batchHeroStateByRatio[ratio.id];
        const stageBaseImage = batchBaseImageByRatio[ratio.id];
        if (!result || !hero) {
            return null;
        }

        const heroWidthPct = (hero.naturalWidth * hero.scale / Math.max(hero.canvasWidth, 1)) * 100;
        const heroHeightPct = (hero.naturalHeight * hero.scale / Math.max(hero.canvasHeight, 1)) * 100;
        const heroLeftPct = (hero.x / Math.max(hero.canvasWidth, 1)) * 100;
        const heroTopPct = (hero.y / Math.max(hero.canvasHeight, 1)) * 100;

        return (
            <article key={ratio.id} className={`batch-edit-card ${isUltraWideBatchRatio(ratio) ? "batch-edit-card--ultra-wide" : ""}`}>
                <header className="batch-edit-card__header">
                    <div>
                        <strong>{ratio.label}</strong>
                        <span>{ratio.ratio}</span>
                    </div>
                    <small>{ratio.downloadWidth}×{ratio.downloadHeight}</small>
                </header>

                <div className="batch-edit-card__stage" style={{ aspectRatio: `${ratio.downloadWidth} / ${ratio.downloadHeight}` }}>
                    {stageBaseImage ? <img src={stageBaseImage} alt={`${ratio.label} editable variation`} className="batch-edit-card__bg" /> : null}
                    {!isBatchSceneReady && <div className="batch-edit-card__loading">Loading template...</div>}
                    {activeImage && (
                        <div
                            className={`batch-edit-card__hero ${!isBatchSceneReady ? "is-disabled" : ""}`}
                            style={{
                                left: `${heroLeftPct}%`,
                                top: `${heroTopPct}%`,
                                width: `${heroWidthPct}%`,
                                height: `${heroHeightPct}%`,
                            }}
                            onPointerDown={(event) => beginBatchHeroInteraction(event, ratio.id, "drag")}
                        >
                            <img src={activeImage} alt="" />
                            <button
                                type="button"
                                className="batch-edit-card__hero-resize"
                                onPointerDown={(event) => beginBatchHeroInteraction(event, ratio.id, "resize")}
                                aria-label={`Resize hero for ${ratio.label}`}
                            />
                        </div>
                    )}
                </div>

                <button type="button" className="batch-edit-card__reset" onClick={() => resetBatchHero(ratio.id)} disabled={!isBatchSceneReady}>
                    Reset
                </button>
            </article>
        );
    };

    const openBatchEditModal = async () => {
        if (!canBatchEdit || isBatchStagePreparing) {
            return;
        }

        const initialState: Record<string, BatchEditHeroState> = {};
        completedSmartRatios.forEach((ratio) => {
            const snapshot = results[ratio.id]?.editableState;
            const image = snapshot?.image;
            if (!snapshot || !image) {
                return;
            }

            const sourceWidth = Math.max(1, snapshot.canvasSize.width);
            const sourceHeight = Math.max(1, snapshot.canvasSize.height);
            const targetWidth = ratio.downloadWidth;
            const targetHeight = ratio.downloadHeight;
            const scaleX = targetWidth / sourceWidth;
            const scaleY = targetHeight / sourceHeight;
            const nextScale = Math.min(
                (Math.max(1, image.renderWidth) * scaleX) / Math.max(1, image.naturalWidth),
                (Math.max(1, image.renderHeight) * scaleY) / Math.max(1, image.naturalHeight)
            );
            const halfW = (image.naturalWidth * nextScale) / 2;
            const halfH = (image.naturalHeight * nextScale) / 2;
            const nextX = clampValue((image.x / sourceWidth) * targetWidth, halfW, targetWidth - halfW);
            const nextY = clampValue((image.y / sourceHeight) * targetHeight, halfH, targetHeight - halfH);

            initialState[ratio.id] = {
                x: nextX,
                y: nextY,
                scale: nextScale,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
                canvasWidth: targetWidth,
                canvasHeight: targetHeight,
                baseX: nextX,
                baseY: nextY,
                baseScale: nextScale,
            };
        });

        setBatchHeroStateByRatio(initialState);
        setBatchBaseImageByRatio({});
        setIsBatchHeroReady(false);
        setIsBatchEditOpen(true);

        const previousSnapshot = captureSnapshot();
        setIsBatchStagePreparing(true);

        try {
            const nextBaseImages: Record<string, string> = {};
            for (const ratio of completedSmartRatios) {
                const snapshot = results[ratio.id]?.editableState;
                if (!snapshot) {
                    continue;
                }

                const noHeroSnapshot: SmartLayoutSnapshot = {
                    ...snapshot,
                    canvasSize: {
                        width: ratio.downloadWidth,
                        height: ratio.downloadHeight,
                    },
                    image: null,
                };

                restoreSnapshot(noHeroSnapshot);
                await wait(220);
                const exported = await onExportCanvas();
                const resized = await resizeImageToDataUrl(exported, ratio.downloadWidth, ratio.downloadHeight);
                nextBaseImages[ratio.id] = resized;
            }

            setBatchBaseImageByRatio(nextBaseImages);
        } finally {
            restoreSnapshot(previousSnapshot);
            setIsBatchStagePreparing(false);
        }
    };

    const closeBatchEditModal = () => {
        if (isBatchExporting || isBatchStagePreparing) {
            return;
        }
        batchHeroInteractionRef.current = null;
        setIsBatchEditOpen(false);
        setBatchBaseImageByRatio({});
    };

    const updateBatchHeroState = (ratioId: string, updater: (state: BatchEditHeroState) => BatchEditHeroState) => {
        setBatchHeroStateByRatio((prev) => {
            const current = prev[ratioId];
            if (!current) {
                return prev;
            }
            return {
                ...prev,
                [ratioId]: updater(current),
            };
        });
    };

    const stopBatchHeroInteraction = () => {
        batchHeroInteractionRef.current = null;
        window.removeEventListener("pointermove", handleBatchHeroPointerMove);
        window.removeEventListener("pointerup", stopBatchHeroInteraction);
    };

    function handleBatchHeroPointerMove(event: PointerEvent): void {
        const interaction = batchHeroInteractionRef.current;
        if (!interaction) {
            return;
        }

        const hero = batchHeroStateByRatio[interaction.ratioId];
        if (!hero) {
            return;
        }

        const px = (event.clientX - interaction.stageRect.left) * (hero.canvasWidth / Math.max(interaction.stageRect.width, 1));
        const py = (event.clientY - interaction.stageRect.top) * (hero.canvasHeight / Math.max(interaction.stageRect.height, 1));

        if (interaction.mode === "drag") {
            updateBatchHeroState(interaction.ratioId, (current) => {
                const halfW = (current.naturalWidth * current.scale) / 2;
                const halfH = (current.naturalHeight * current.scale) / 2;
                return {
                    ...current,
                    x: clampValue(px - interaction.offsetX, halfW, current.canvasWidth - halfW),
                    y: clampValue(py - interaction.offsetY, halfH, current.canvasHeight - halfH),
                };
            });
            return;
        }

        updateBatchHeroState(interaction.ratioId, (current) => {
            const dx = event.clientX - interaction.startClientX;
            const sensitivity = 2 / Math.max(interaction.stageRect.width, 100);
            const nextScale = clampValue(interaction.startScale * (1 + dx * sensitivity), 0.05, 5);
            const halfW = (current.naturalWidth * nextScale) / 2;
            const halfH = (current.naturalHeight * nextScale) / 2;
            return {
                ...current,
                scale: nextScale,
                x: clampValue(current.x, halfW, current.canvasWidth - halfW),
                y: clampValue(current.y, halfH, current.canvasHeight - halfH),
            };
        });
    }

    const beginBatchHeroInteraction = (
        event: React.PointerEvent<HTMLElement>,
        ratioId: string,
        mode: "drag" | "resize"
    ) => {
        event.stopPropagation();
        const stage = (event.currentTarget.closest(".batch-edit-card__stage") as HTMLElement | null)
            ?? (event.currentTarget as HTMLElement);
        const hero = batchHeroStateByRatio[ratioId];
        if (!stage || !hero || !isBatchSceneReady) {
            return;
        }

        const stageRect = stage.getBoundingClientRect();
        const px = (event.clientX - stageRect.left) * (hero.canvasWidth / Math.max(stageRect.width, 1));
        const py = (event.clientY - stageRect.top) * (hero.canvasHeight / Math.max(stageRect.height, 1));

        batchHeroInteractionRef.current = {
            ratioId,
            mode,
            stageRect,
            startScale: hero.scale,
            startDistance: Math.hypot(px - hero.x, py - hero.y),
            offsetX: px - hero.x,
            offsetY: py - hero.y,
            startClientX: event.clientX,
            startClientY: event.clientY,
        };

        window.addEventListener("pointermove", handleBatchHeroPointerMove);
        window.addEventListener("pointerup", stopBatchHeroInteraction);
    };

    const resetBatchHero = (ratioId: string) => {
        updateBatchHeroState(ratioId, (state) => ({
            ...state,
            x: state.baseX,
            y: state.baseY,
            scale: state.baseScale,
        }));
    };

    const exportAllBatchEdits = async () => {
        if (!completedSmartRatios.length || isBatchExporting || !isBatchSceneReady) {
            return;
        }

        setIsBatchExporting(true);

        try {
            const zip = new JSZip();

            // Load hero image once for compositing
            const heroImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Failed to load hero image for export"));
                img.src = sourceImage!;
            });

            for (const ratio of completedSmartRatios) {
                const hero = batchHeroStateByRatio[ratio.id];
                const baseImage = batchBaseImageByRatio[ratio.id];
                if (!hero || !baseImage) {
                    continue;
                }

                // Compose final image directly on a canvas: background + hero
                const canvas = document.createElement("canvas");
                canvas.width = ratio.downloadWidth;
                canvas.height = ratio.downloadHeight;
                const ctx = canvas.getContext("2d")!;

                // Draw the base background
                const bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(img);
                    img.onerror = () => reject(new Error("Failed to load background"));
                    img.src = baseImage;
                });
                ctx.drawImage(bgImg, 0, 0, ratio.downloadWidth, ratio.downloadHeight);

                // Draw the hero at its batch-edited position/scale
                const heroW = hero.naturalWidth * hero.scale;
                const heroH = hero.naturalHeight * hero.scale;
                ctx.drawImage(
                    heroImg,
                    hero.x - heroW / 2,
                    hero.y - heroH / 2,
                    heroW,
                    heroH
                );

                const resized = canvas.toDataURL("image/png", 1);
                const filename = `${ratio.label.replace(/\s+/g, "-").toLowerCase()}-${ratio.downloadWidth}x${ratio.downloadHeight}.png`;

                zip.file(filename, await dataUrlToBlob(resized));

                setResults((prev) => ({
                    ...prev,
                    [ratio.id]: {
                        ...(prev[ratio.id] ?? { ratioId: ratio.id, status: "completed" as const }),
                        ratioId: ratio.id,
                        status: "completed",
                        imageUrl: resized,
                    },
                }));
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            downloadBlob(zipBlob, `smart-layout-variations-${Date.now()}.zip`);
        } finally {
            setIsBatchExporting(false);
        }
    };

    const stopGeneration = () => {
        generationIdRef.current += 1;
        setIsGenerating(false);
        setResults((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((key) => {
                if (updated[key].status === "processing") {
                    updated[key] = { ...updated[key], status: "pending" };
                }
            });
            return updated;
        });
    };

    const toggleRatio = (ratio: AspectRatioOption) => {
        if (isGenerating) {
            return;
        }

        if (ratio.comingSoon && !isSmartLayoutMode) {
            return;
        }

        setSelectedRatioIds((prev) => {
            if (prev.includes(ratio.id)) {
                return prev.filter((id) => id !== ratio.id);
            }
            return [...prev, ratio.id];
        });
    };

    const toggleAllRatios = () => {
        if (isGenerating) {
            return;
        }

        const candidates = isSmartLayoutMode
            ? ASPECT_RATIOS
            : ASPECT_RATIOS.filter((ratio) => !ratio.comingSoon);

        if (selectedRatioIds.length === candidates.length) {
            setSelectedRatioIds([]);
            return;
        }

        setSelectedRatioIds(candidates.map((ratio) => ratio.id));
    };

    const generateSmartVariations = async () => {
        if (!selectedRatios.length) {
            return;
        }

        const runId = ++generationIdRef.current;
        setIsGenerating(true);

        const initial: Record<string, VariationResult> = {};
        selectedRatios.forEach((ratio) => {
            initial[ratio.id] = {
                ratioId: ratio.id,
                status: "processing",
            };
        });
        setResults(initial);

        const snapshot = captureSnapshot();

        try {
            for (const ratio of selectedRatios) {
                if (generationIdRef.current !== runId) {
                    break;
                }

                await applySmartLayout(snapshot, ratio);
                await wait(350);

                if (generationIdRef.current !== runId) {
                    break;
                }

                const editableState = captureSnapshot();
                const exported = await onExportCanvas();

                if (generationIdRef.current !== runId) {
                    break;
                }

                setResults((prev) => ({
                    ...prev,
                    [ratio.id]: {
                        ratioId: ratio.id,
                        status: "completed",
                        imageUrl: exported,
                        editableState,
                    },
                }));
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Generation failed";
            setResults((prev) => {
                const updated = { ...prev };
                selectedRatios.forEach((ratio) => {
                    if (updated[ratio.id]?.status === "processing") {
                        updated[ratio.id] = {
                            ratioId: ratio.id,
                            status: "failed",
                            error: message,
                        };
                    }
                });
                return updated;
            });
        } finally {
            restoreSnapshot(snapshot);
            if (generationIdRef.current === runId) {
                setIsGenerating(false);
            }
        }
    };

    const generateAdvancedVariations = async () => {
        if (!selectedRatios.length || !activeImage) {
            return;
        }

        const runId = ++generationIdRef.current;
        setIsGenerating(true);

        const initial: Record<string, VariationResult> = {};
        selectedRatios.forEach((ratio) => {
            initial[ratio.id] = {
                ratioId: ratio.id,
                status: "processing",
            };
        });
        setResults(initial);

        for (const ratio of selectedRatios) {
            if (generationIdRef.current !== runId) {
                break;
            }

            let success = false;
            let lastError: unknown = null;
            const maxRetries = 2;

            for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
                if (generationIdRef.current !== runId) {
                    break;
                }

                try {
                    if (attempt > 0) {
                        await wait(2000);
                    }

                    const response = await generateAdvancedVariation({
                        sourceImageBase64: activeImage,
                        targetRatioLabel: ratio.ratio,
                        requestedApiRatio: ratio.apiRatio,
                        targetWidth: ratio.width,
                        targetHeight: ratio.height,
                    });

                    if (generationIdRef.current !== runId) {
                        break;
                    }

                    setResults((prev) => ({
                        ...prev,
                        [ratio.id]: {
                            ratioId: ratio.id,
                            status: "completed",
                            imageUrl: response.imageUrl,
                            debug: response.debug,
                        },
                    }));

                    success = true;
                    break;
                } catch (error) {
                    lastError = error;
                    if (attempt === maxRetries) {
                        break;
                    }
                }
            }

            if (!success && generationIdRef.current === runId) {
                const message = lastError instanceof Error ? lastError.message : "Generation failed";
                setResults((prev) => ({
                    ...prev,
                    [ratio.id]: {
                        ratioId: ratio.id,
                        status: "failed",
                        error: message,
                    },
                }));
            }
        }

        if (generationIdRef.current !== runId) {
            setResults((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((key) => {
                    if (updated[key].status === "processing") {
                        updated[key] = { ...updated[key], status: "pending" };
                    }
                });
                return updated;
            });
        }

        if (generationIdRef.current === runId) {
            setIsGenerating(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedRatioIds.length) {
            window.alert("Select at least one ratio.");
            return;
        }

        if (!activeImage) {
            window.alert("Source image is required.");
            return;
        }

        if (isSmartLayoutMode) {
            await generateSmartVariations();
            return;
        }

        await generateAdvancedVariations();
    };

    const regenerateSingleVariation = async (ratioId: string) => {
        if (isGenerating) return;

        const ratio = ASPECT_RATIOS.find((r) => r.id === ratioId);
        if (!ratio || !activeImage) return;

        setResults((prev) => ({
            ...prev,
            [ratioId]: { ratioId, status: "processing" },
        }));

        if (isSmartLayoutMode) {
            const snapshot = captureSnapshot();
            try {
                await applySmartLayout(snapshot, ratio);
                await wait(350);
                const editableState = captureSnapshot();
                const exported = await onExportCanvas();
                setResults((prev) => ({
                    ...prev,
                    [ratioId]: { ratioId, status: "completed", imageUrl: exported, editableState },
                }));
            } catch (error) {
                const message = error instanceof Error ? error.message : "Regeneration failed";
                setResults((prev) => ({
                    ...prev,
                    [ratioId]: { ratioId, status: "failed", error: message },
                }));
            } finally {
                restoreSnapshot(snapshot);
            }
        } else {
            try {
                const response = await generateAdvancedVariation({
                    sourceImageBase64: activeImage,
                    targetRatioLabel: ratio.ratio,
                    requestedApiRatio: ratio.apiRatio,
                    targetWidth: ratio.width,
                    targetHeight: ratio.height,
                });
                setResults((prev) => ({
                    ...prev,
                    [ratioId]: { ratioId, status: "completed", imageUrl: response.imageUrl, debug: response.debug },
                }));
            } catch (error) {
                const message = error instanceof Error ? error.message : "Regeneration failed";
                setResults((prev) => ({
                    ...prev,
                    [ratioId]: { ratioId, status: "failed", error: message },
                }));
            }
        }
    };

    if (!isOpen) {
        return null;
    }

    const categorizedRatios = groupByCategory(ASPECT_RATIOS);
    const allSelected = selectedRatioIds.length === (isSmartLayoutMode ? ASPECT_RATIOS.length : ASPECT_RATIOS.filter((r) => !r.comingSoon).length);

    return (
        <div className="export-modal__overlay" role="dialog" aria-modal="true" aria-label="Export Creatives">
            <div className="export-modal">
                {/* Header */}
                <header className="export-modal__header">
                    <div className="export-modal__header-left">
                        <span className="export-modal__header-icon" aria-hidden="true">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M16.18 12.32a1.38 1.38 0 0 0 .27 1.52l.05.05a1.67 1.67 0 1 1-2.36 2.36l-.05-.05a1.38 1.38 0 0 0-1.52-.27 1.38 1.38 0 0 0-.83 1.26v.14a1.67 1.67 0 1 1-3.34 0v-.07A1.38 1.38 0 0 0 7.5 16.18a1.38 1.38 0 0 0-1.52.28l-.05.05a1.67 1.67 0 1 1-2.36-2.36l.05-.05a1.38 1.38 0 0 0 .28-1.52 1.38 1.38 0 0 0-1.26-.83h-.14a1.67 1.67 0 1 1 0-3.34h.07a1.38 1.38 0 0 0 1.08-.9 1.38 1.38 0 0 0-.28-1.52l-.05-.05a1.67 1.67 0 1 1 2.36-2.36l.05.05a1.38 1.38 0 0 0 1.52.28h.07a1.38 1.38 0 0 0 .83-1.26v-.14a1.67 1.67 0 1 1 3.34 0v.07a1.38 1.38 0 0 0 .83 1.26 1.38 1.38 0 0 0 1.52-.28l.05-.05a1.67 1.67 0 1 1 2.36 2.36l-.05.05a1.38 1.38 0 0 0-.28 1.52v.07a1.38 1.38 0 0 0 1.26.83h.14a1.67 1.67 0 1 1 0 3.34h-.07a1.38 1.38 0 0 0-1.26.83Z" stroke="currentColor" strokeWidth="1.5" />
                            </svg>
                        </span>
                        <h2>Export Creatives</h2>
                    </div>
                    <div className="export-modal__header-right">
                        {isGenerating ? (
                            <button type="button" className="export-modal__btn export-modal__btn--outline" onClick={stopGeneration}>
                                Stop
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="export-modal__btn export-modal__btn--outline"
                                onClick={() => { void handleGenerate(); }}
                                disabled={isGenerating || !selectedRatioIds.length}
                                aria-label="Regenerate"
                            >
                                Generate
                            </button>
                        )}
                        {hasCompleted && (
                            canBatchEdit && (
                                <button
                                    type="button"
                                    className="export-modal__btn export-modal__btn--outline"
                                    onClick={() => { void openBatchEditModal(); }}
                                    disabled={isGenerating || isBatchExporting || isBatchStagePreparing}
                                >
                                    Edit All Variations
                                </button>
                            )
                        )}
                        {hasCompleted && (
                            <button
                                type="button"
                                className="export-modal__btn export-modal__btn--download"
                                onClick={() => {
                                    Object.entries(results).forEach(([ratioId, result]) => {
                                        if (result.status !== "completed" || !result.imageUrl) {
                                            return;
                                        }
                                        const ratio = ASPECT_RATIOS.find((candidate) => candidate.id === ratioId);
                                        if (!ratio) {
                                            return;
                                        }
                                        if (ratio.subDimensions && ratio.subDimensions.length > 0) {
                                            ratio.subDimensions.forEach((dim) => {
                                                void resizeImageToDataUrl(result.imageUrl!, dim.width, dim.height).then((resized) => {
                                                    downloadDataUrl(resized, `${ratio.id}-${dim.width}x${dim.height}.png`);
                                                });
                                            });
                                        } else if (isSmartLayoutMode) {
                                            void resizeImageToDataUrl(result.imageUrl!, ratio.downloadWidth, ratio.downloadHeight).then((resized) => {
                                                downloadDataUrl(resized, `${ratio.label.replace(/\s+/g, "-").toLowerCase()}-${ratio.downloadWidth}x${ratio.downloadHeight}.png`);
                                            });
                                        } else {
                                            downloadDataUrl(result.imageUrl!, `${ratio.label.replace(/\s+/g, "-").toLowerCase()}-${ratio.width}x${ratio.height}.png`);
                                        }
                                    });
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M7 1v9m0 0L4 7m3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Download All
                            </button>
                        )}
                        <button
                            type="button"
                            className="export-modal__close"
                            onClick={() => {
                                if (isGenerating) {
                                    stopGeneration();
                                }
                                onClose();
                            }}
                            aria-label="Close"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4.5 4.5 13.5 13.5M4.5 13.5 13.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="export-modal__body">
                    {/* Sidebar */}
                    <aside className="export-sidebar">
                        <div className="export-sidebar__head">
                            <div className="export-sidebar__head-left">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                                </svg>
                                <span>Aspect Ratios</span>
                            </div>
                            <button type="button" className="export-sidebar__toggle-btn" onClick={toggleAllRatios} disabled={isGenerating}>
                                {allSelected ? "Deselect All" : "Select All"}
                            </button>
                        </div>

                        <div className="export-sidebar__smart-layout">
                            <div className="export-sidebar__smart-layout-info">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <rect x="1" y="3" width="14" height="10" rx="2" stroke="#3b82f6" strokeWidth="1.3" />
                                    <path d="M5 6h6M5 8.5h4" stroke="#3b82f6" strokeWidth="1.3" strokeLinecap="round" />
                                </svg>
                                <strong>Smart Layout Mode</strong>
                            </div>
                            <p>When disabled, advanced banner generation pipeline will be executed.</p>
                            <label className="export-sidebar__switch" aria-label="Smart layout switch">
                                <input
                                    type="checkbox"
                                    checked={isSmartLayoutMode}
                                    onChange={(event) => setIsSmartLayoutMode(event.target.checked)}
                                    disabled={isGenerating}
                                />
                                <span />
                            </label>
                        </div>

                        <div className="export-sidebar__ratios">
                            {Object.entries(categorizedRatios).map(([category, ratios]) => (
                                <div key={category} className="export-sidebar__category">
                                    <h4 className="export-sidebar__category-label">{category}</h4>
                                    <div className="export-sidebar__category-items">
                                        {ratios.map((ratio) => {
                                            const disabled = ratio.comingSoon && !isSmartLayoutMode;
                                            const selected = selectedRatioIds.includes(ratio.id);
                                            const completed = results[ratio.id]?.status === "completed";
                                            const displayedDimensions = getDisplayedDimensions(ratio, isSmartLayoutMode);

                                            return (
                                                <label
                                                    key={ratio.id}
                                                    className={`export-sidebar__ratio-item ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={() => toggleRatio(ratio)}
                                                        disabled={disabled || isGenerating}
                                                        className="visually-hidden"
                                                    />
                                                    <div className="export-sidebar__ratio-thumb">
                                                        {completed && results[ratio.id]?.imageUrl ? (
                                                            <img src={results[ratio.id].imageUrl} alt="" />
                                                        ) : (
                                                            <div className="export-sidebar__ratio-thumb-placeholder">
                                                                <img src={exportPlaceholder} alt="Placeholder" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="export-sidebar__ratio-meta">
                                                        <strong>{ratio.label}</strong>
                                                        <small>{displayedDimensions.width}X{displayedDimensions.height}</small>
                                                    </div>
                                                    {selected && completed ? (
                                                        <span className="export-sidebar__ratio-check">
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                                <circle cx="8" cy="8" r="7" fill="#22c55e" />
                                                                <path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    ) : null}
                                                    <span className="export-sidebar__ratio-badge">{ratio.ratio}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* Gallery */}
                    <div className="export-gallery">
                        {Object.keys(results).length === 0 ? (
                            <div className="export-gallery__empty">
                                <button
                                    type="button"
                                    className="export-modal__btn export-modal__btn--generate"
                                    onClick={() => { void handleGenerate(); }}
                                    disabled={isGenerating || !selectedRatioIds.length}
                                >
                                    {isGenerating ? "Generating..." : "Generate Variations"}
                                </button>
                                <p>Select aspect ratios and click generate to preview results.</p>
                            </div>
                        ) : (
                            <div className="export-gallery__grid">
                                {selectedRatios.map((ratio) => {
                                    const result = results[ratio.id] || { ratioId: ratio.id, status: "pending" as const };
                                    const displayedDimensions = getDisplayedDimensions(ratio, isSmartLayoutMode);

                                    return (
                                        <article key={ratio.id} className="export-card">
                                            <header className="export-card__header">
                                                <div className="export-card__top-row">
                                                    <div className="export-card__title-row">
                                                        <h5>{ratio.label}</h5>
                                                        <span className="export-card__ratio-badge">{ratio.ratio}</span>
                                                    </div>
                                                    <div className="export-card__actions">
                                                        {result.status === "completed" && result.imageUrl ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="export-card__action-btn"
                                                                    onClick={() => { void regenerateSingleVariation(ratio.id); }}
                                                                    disabled={isGenerating}
                                                                    aria-label="Regenerate"
                                                                    title="Regenerate"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                        <path d="M1.75 7a5.25 5.25 0 0 1 9.47-3.15M12.25 7a5.25 5.25 0 0 1-9.47 3.15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                                        <path d="M11.22 1.75v2.1h-2.1M2.78 12.25v-2.1h2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                </button>
                                                                {isSmartLayoutMode && (
                                                                    <button
                                                                        type="button"
                                                                        className="export-card__action-btn"
                                                                        onClick={() => {
                                                                            if (!result.editableState) {
                                                                                return;
                                                                            }
                                                                            onEditSmartVariation(ratio, result.editableState);
                                                                        }}
                                                                        disabled={!result.editableState}
                                                                        aria-label="Edit hero"
                                                                        title="Edit hero"
                                                                    >
                                                                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                            <path d="M9.69 2.06a1.5 1.5 0 1 1 2.12 2.12l-6.9 6.9-2.5.38.38-2.5 6.9-6.9Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                                            <path d="M8.63 3.12 10.88 5.37" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="export-card__action-btn"
                                                                    onClick={() => {
                                                                        if (isSmartLayoutMode) {
                                                                            void resizeImageToDataUrl(result.imageUrl!, ratio.downloadWidth, ratio.downloadHeight).then((resized) => {
                                                                                downloadDataUrl(resized, `${ratio.id}-${ratio.downloadWidth}x${ratio.downloadHeight}.png`);
                                                                            });
                                                                        } else {
                                                                            downloadDataUrl(result.imageUrl!, `${ratio.id}-${ratio.width}x${ratio.height}.png`);
                                                                        }
                                                                    }}
                                                                    aria-label="Download"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                        <path d="M7 1v9m0 0L4 7m3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                </button>
                                                                {/* <button
                                                                    type="button"
                                                                    className="export-card__action-btn"
                                                                    aria-label="More options"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                        <circle cx="3" cy="7" r="1.2" fill="currentColor" />
                                                                        <circle cx="7" cy="7" r="1.2" fill="currentColor" />
                                                                        <circle cx="11" cy="7" r="1.2" fill="currentColor" />
                                                                    </svg>
                                                                </button> */}
                                                            </>
                                                        ) : result.status !== "processing" ? (
                                                            <button
                                                                type="button"
                                                                className="export-card__action-btn"
                                                                onClick={() => { void regenerateSingleVariation(ratio.id); }}
                                                                disabled={isGenerating}
                                                                aria-label="Regenerate"
                                                                title="Regenerate"
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                    <path d="M1.75 7a5.25 5.25 0 0 1 9.47-3.15M12.25 7a5.25 5.25 0 0 1-9.47 3.15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                                    <path d="M11.22 1.75v2.1h-2.1M2.78 12.25v-2.1h2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <p className="export-card__desc">{ratio.category}, {displayedDimensions.width}X{displayedDimensions.height}</p>
                                            </header>
                                            <div className="export-card__preview">
                                                {result.status === "completed" && result.imageUrl ? (
                                                    <img
                                                        src={result.imageUrl}
                                                        alt={`${ratio.label} variation`}
                                                        onClick={() => setSelectedPreview({ url: result.imageUrl!, title: ratio.label, width: ratio.width, height: ratio.height })}
                                                    />
                                                ) : (
                                                    <div className={`export-card__state ${result.status === "failed" ? "is-failed" : ""}`}>
                                                        {result.status === "processing" ? "Generating..." : null}
                                                        {result.status === "pending" ? "Queued" : null}
                                                        {result.status === "failed" ? (result.error || "Failed") : null}
                                                    </div>
                                                )}
                                            </div>
                                            {result.status === "completed" && result.imageUrl && ratio.subDimensions && ratio.subDimensions.length > 0 && (
                                                <div className="export-card__sizes">
                                                    <span className="export-card__sizes-label">AVAILABLE SIZES</span>
                                                    <div className="export-card__sizes-list">
                                                        {ratio.subDimensions.map((dim) => (
                                                            <button
                                                                key={`${dim.width}x${dim.height}`}
                                                                type="button"
                                                                className="export-card__size-btn"
                                                                onClick={() => {
                                                                    void resizeImageToDataUrl(result.imageUrl!, dim.width, dim.height).then((resized) => {
                                                                        downloadDataUrl(resized, `${ratio.id}-${dim.width}x${dim.height}.png`);
                                                                    });
                                                                }}
                                                                title={dim.label}
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                                                                    <path d="M7 1v9m0 0L4 7m3 3 3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                                {dim.width}x{dim.height}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {selectedPreview ? (
                <div className="export-modal__preview-overlay" role="dialog" aria-modal="true">
                    <div className="export-modal__preview-content">
                        <button
                            type="button"
                            className="export-modal__close"
                            onClick={() => setSelectedPreview(null)}
                            aria-label="Close preview"
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M4.5 4.5 13.5 13.5M4.5 13.5 13.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            </svg>
                        </button>
                        <img src={selectedPreview.url} alt={selectedPreview.title} style={{ maxWidth: `min(${selectedPreview.width}px, 94vw)`, maxHeight: `min(${selectedPreview.height}px, 92vh)` }} />
                    </div>
                </div>
            ) : null}

            {isBatchEditOpen ? (
                <div className="batch-edit-modal__overlay" role="dialog" aria-modal="true" aria-label="Edit all variations">
                    <div className="batch-edit-modal">
                        <header className="batch-edit-modal__header">
                            <div className="batch-edit-modal__title-wrap">
                                {/* <button type="button" className="batch-edit-modal__menu" aria-label="Batch edit menu">☰</button> */}
                                <h3>Edit All Variations</h3>
                            </div>
                            <p>{isBatchSceneReady ? "Drag to move • Corner handles to resize the hero in each template" : "Preparing templates for editing..."}</p>
                            <div className="batch-edit-modal__actions">
                                <button type="button" onClick={() => { void exportAllBatchEdits(); }} disabled={isBatchExporting || !isBatchSceneReady}>
                                    {isBatchExporting ? "Exporting..." : "Export All"}
                                </button>
                                <button type="button" className="batch-edit-modal__close" onClick={closeBatchEditModal} disabled={isBatchExporting || isBatchStagePreparing} aria-label="Close batch edit">
                                    ×
                                </button>
                            </div>
                        </header>

                        <div className="batch-edit-modal__grid">
                            {batchEditColumns.map((column, columnIndex) => (
                                <div key={`batch-edit-column-${columnIndex}`} className="batch-edit-modal__column">
                                    {column.map((ratio) => renderBatchEditCard(ratio))}
                                </div>
                            ))}
                            {ultraWideBatchRatios.length > 0 ? (
                                <div className="batch-edit-modal__wide-stack">
                                    {ultraWideBatchRatios.map((ratio) => renderBatchEditCard(ratio))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
