import { useCallback, useEffect, useRef, useState } from "react";

type EraserMode = "eraser" | "hand";

type ImageEraserModalProps = {
    isOpen: boolean;
    imageUrl: string;
    imageName: string;
    brushSize: number;
    onBrushSizeChange: (size: number) => void;
    onClose: () => void;
    onSave: (editedDataUrl: string) => void;
};

export function ImageEraserModal({
    isOpen,
    imageUrl,
    imageName,
    brushSize,
    onBrushSizeChange,
    onClose,
    onSave,
}: ImageEraserModalProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const isDrawingRef = useRef(false);
    const didDrawInStrokeRef = useRef(false);

    const [toolMode, setToolMode] = useState<EraserMode>("eraser");
    const [zoom, setZoom] = useState(0.55);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
    const [lastDrawPoint, setLastDrawPoint] = useState<{ x: number; y: number } | null>(null);
    const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);

    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex >= 0 && historyIndex < history.length - 1;

    const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;

        if (!wrapper || !canvas) {
            return null;
        }

        const rect = wrapper.getBoundingClientRect();
        const x = (clientX - rect.left) / zoom;
        const y = (clientY - rect.top) / zoom;

        return {
            x: Math.min(Math.max(x, 0), canvas.width),
            y: Math.min(Math.max(y, 0), canvas.height),
        };
    }, [zoom]);

    const pushHistorySnapshot = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory((prev) => {
            const truncated = prev.slice(0, historyIndex + 1);
            truncated.push(imageData);
            setHistoryIndex(truncated.length - 1);
            return truncated;
        });
    }, [historyIndex]);

    const drawEraseSegment = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1, brushSize);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        if (from.x === to.x && from.y === to.y) {
            ctx.lineTo(to.x + 0.01, to.y + 0.01);
        }
        ctx.stroke();
        ctx.restore();
    }, [brushSize]);

    const handleUndo = useCallback(() => {
        if (!canUndo) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const nextIndex = historyIndex - 1;
        ctx.putImageData(history[nextIndex], 0, 0);
        setHistoryIndex(nextIndex);
    }, [canUndo, history, historyIndex]);

    const handleRedo = useCallback(() => {
        if (!canRedo) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const nextIndex = historyIndex + 1;
        ctx.putImageData(history[nextIndex], 0, 0);
        setHistoryIndex(nextIndex);
    }, [canRedo, history, historyIndex]);

    const handleReset = useCallback(() => {
        if (!history.length) {
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }

        ctx.putImageData(history[0], 0, 0);
        setHistoryIndex(0);
    }, [history]);

    const handleSave = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        try {
            const dataUrl = canvas.toDataURL("image/png");
            onSave(dataUrl);
            onClose();
        } catch {
            // Keep current image if export fails due browser security restrictions.
            onSave(imageUrl);
            onClose();
        }
    }, [imageUrl, onClose, onSave]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setToolMode("eraser");
        setZoom(0.55);
        setPanOffset({ x: 0, y: 0 });
        setCursorPosition(null);
        setHistory([]);
        setHistoryIndex(-1);

        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const initial = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHistory([initial]);
            setHistoryIndex(0);
        };

        img.src = imageUrl;
    }, [imageUrl, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const withModifier = event.ctrlKey || event.metaKey;

            if (withModifier && event.key.toLowerCase() === "z") {
                event.preventDefault();
                if (event.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key.toLowerCase() === "e") {
                setToolMode("eraser");
                return;
            }

            if (event.key.toLowerCase() === "h") {
                setToolMode("hand");
                return;
            }

            if (event.key === "[" && !withModifier) {
                event.preventDefault();
                onBrushSizeChange(Math.max(5, brushSize - 5));
                return;
            }

            if (event.key === "]" && !withModifier) {
                event.preventDefault();
                onBrushSizeChange(Math.min(100, brushSize + 5));
                return;
            }

            if (event.key === " " && toolMode === "eraser") {
                event.preventDefault();
                setToolMode("hand");
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.key === " ") {
                setToolMode("eraser");
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [brushSize, handleRedo, handleUndo, isOpen, onBrushSizeChange, onClose, toolMode]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="advanced-editor-image-eraser-modal" role="dialog" aria-modal="true" aria-label="Erase image">
            <div className="advanced-editor-image-eraser-modal__card">
                <header className="advanced-editor-image-eraser-modal__header">
                    <div>
                        <h3>Erase</h3>
                        <p>{imageName}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close eraser modal">
                        x
                    </button>
                </header>

                <div className="advanced-editor-image-eraser-modal__body">
                    <aside className="advanced-editor-image-eraser-modal__sidebar">
                        <p>Paint over any object or area to remove it.</p>

                        <label htmlFor="advanced-editor-image-eraser-brush-size">
                            <span>Brush Size</span>
                            <strong>{brushSize}px</strong>
                        </label>
                        <input
                            id="advanced-editor-image-eraser-brush-size"
                            type="range"
                            min={5}
                            max={100}
                            step={1}
                            value={brushSize}
                            onChange={(event) => onBrushSizeChange(Number(event.target.value))}
                        />

                        <button type="button" className="advanced-editor-image-eraser-modal__save" onClick={handleSave}>
                            Save Changes
                        </button>
                    </aside>

                    <section className="advanced-editor-image-eraser-modal__canvas-wrap">
                        <div className="advanced-editor-image-eraser-modal__toolbar">
                            <div className="advanced-editor-image-eraser-modal__mode-toggle">
                                <button
                                    type="button"
                                    className={toolMode === "eraser" ? "is-active" : ""}
                                    onClick={() => setToolMode("eraser")}
                                >
                                    Eraser
                                </button>
                                <button
                                    type="button"
                                    className={toolMode === "hand" ? "is-active" : ""}
                                    onClick={() => setToolMode("hand")}
                                >
                                    Hand
                                </button>
                            </div>

                            <div className="advanced-editor-image-eraser-modal__actions">
                                <button type="button" onClick={handleUndo} disabled={!canUndo} aria-label="Undo">
                                    ↺
                                </button>
                                <button type="button" onClick={handleRedo} disabled={!canRedo} aria-label="Redo">
                                    ↻
                                </button>
                                <button type="button" onClick={handleReset} aria-label="Reset">
                                    ⟲
                                </button>
                            </div>
                        </div>

                        <div className="advanced-editor-image-eraser-modal__checkerboard">
                            <div
                                className="advanced-editor-image-eraser-modal__canvas-transform"
                                ref={wrapperRef}
                                style={{
                                    transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoom})`,
                                    transformOrigin: "top left",
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    className={toolMode === "hand" ? "is-hand" : "is-eraser"}
                                    onMouseDown={(event) => {
                                        const point = getCanvasCoordinates(event.clientX, event.clientY);
                                        if (!point) {
                                            return;
                                        }

                                        if (toolMode === "hand") {
                                            setIsPanning(true);
                                            setLastPanPoint({ x: event.clientX, y: event.clientY });
                                            return;
                                        }

                                        if (event.button !== 0) {
                                            return;
                                        }

                                        isDrawingRef.current = true;
                                        didDrawInStrokeRef.current = false;
                                        setLastDrawPoint(point);
                                        drawEraseSegment(point, point);
                                        didDrawInStrokeRef.current = true;
                                    }}
                                    onMouseMove={(event) => {
                                        const point = getCanvasCoordinates(event.clientX, event.clientY);
                                        if (!point) {
                                            return;
                                        }

                                        setCursorPosition(point);

                                        if (isPanning) {
                                            const dx = event.clientX - lastPanPoint.x;
                                            const dy = event.clientY - lastPanPoint.y;
                                            setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
                                            setLastPanPoint({ x: event.clientX, y: event.clientY });
                                            return;
                                        }

                                        if (!isDrawingRef.current || toolMode !== "eraser") {
                                            return;
                                        }

                                        const start = lastDrawPoint ?? point;
                                        drawEraseSegment(start, point);
                                        setLastDrawPoint(point);
                                        didDrawInStrokeRef.current = true;
                                    }}
                                    onMouseUp={() => {
                                        if (isPanning) {
                                            setIsPanning(false);
                                        }

                                        if (!isDrawingRef.current) {
                                            return;
                                        }

                                        isDrawingRef.current = false;
                                        setLastDrawPoint(null);

                                        if (didDrawInStrokeRef.current) {
                                            pushHistorySnapshot();
                                        }
                                        didDrawInStrokeRef.current = false;
                                    }}
                                    onMouseLeave={() => {
                                        setCursorPosition(null);

                                        if (isPanning) {
                                            setIsPanning(false);
                                        }

                                        if (!isDrawingRef.current) {
                                            return;
                                        }

                                        isDrawingRef.current = false;
                                        setLastDrawPoint(null);

                                        if (didDrawInStrokeRef.current) {
                                            pushHistorySnapshot();
                                        }
                                        didDrawInStrokeRef.current = false;
                                    }}
                                    onWheel={(event) => {
                                        event.preventDefault();
                                    }}
                                />

                                {toolMode === "eraser" && cursorPosition && !isPanning && (
                                    <div
                                        className="advanced-editor-image-eraser-modal__cursor"
                                        style={{
                                            left: cursorPosition.x,
                                            top: cursorPosition.y,
                                            width: brushSize,
                                            height: brushSize,
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="advanced-editor-image-eraser-modal__zoom-chip">
                            <input
                                type="range"
                                min={0.25}
                                max={2}
                                step={0.05}
                                value={zoom}
                                onChange={(event) => setZoom(Number(event.target.value))}
                                aria-label="Eraser zoom"
                            />
                            <strong>{Math.round(zoom * 100)}%</strong>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
