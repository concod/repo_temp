import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import "./MaskingCanvas.scss";

const MAX_AI_DIMENSION = 2048;

const calculateAIProcessingDimensions = (originalWidth, originalHeight, maxDimension = MAX_AI_DIMENSION) => {
    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth > originalHeight) {
        const width = Math.min(originalWidth, maxDimension);
        const height = width / aspectRatio;
        return { width: Math.round(width), height: Math.round(height) };
    }

    const height = Math.min(originalHeight, maxDimension);
    const width = height * aspectRatio;
    return { width: Math.round(width), height: Math.round(height) };
};

const MaskingCanvas = forwardRef(function MaskingCanvas({
    imageUrl,
    brushSize,
    onMaskChange,
    initialMaskDataUrl,
    onMaskUndoAvailabilityChange,
}, ref) {
    const containerRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const maskCanvasRef = useRef(null);
    const overlayCanvasRef = useRef(null);

    const isDrawingRef = useRef(false);
    const lastPointRef = useRef(null);
    const scaleFactorRef = useRef(1);

    const [history, setHistory] = useState([]);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const drawImageOnCanvas = useCallback(() => {
        const container = containerRef.current;
        const displayCanvas = displayCanvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        if (!container || !displayCanvas || !maskCanvas || !overlayCanvas || !imageUrl) return;

        const displayCtx = displayCanvas.getContext("2d");
        const maskCtx = maskCanvas.getContext("2d");
        const overlayCtx = overlayCanvas.getContext("2d");
        if (!displayCtx || !maskCtx || !overlayCtx) return;

        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = imageUrl;

        image.onload = () => {
            const aiSize = calculateAIProcessingDimensions(image.naturalWidth, image.naturalHeight);
            const containerWidth = Math.max(container.clientWidth, 1);
            const containerHeight = Math.max(container.clientHeight, 1);
            const containerRatio = containerWidth / containerHeight;
            const imageRatio = image.naturalWidth / image.naturalHeight;

            let displayWidth;
            let displayHeight;

            if (containerRatio > imageRatio) {
                displayHeight = containerHeight;
                displayWidth = displayHeight * imageRatio;
            } else {
                displayWidth = containerWidth;
                displayHeight = displayWidth / imageRatio;
            }

            displayCanvas.width = displayWidth;
            displayCanvas.height = displayHeight;
            overlayCanvas.width = displayWidth;
            overlayCanvas.height = displayHeight;
            maskCanvas.width = aiSize.width;
            maskCanvas.height = aiSize.height;
            setCanvasSize({ width: displayWidth, height: displayHeight });
            scaleFactorRef.current = aiSize.width / displayWidth;

            displayCtx.clearRect(0, 0, displayWidth, displayHeight);
            displayCtx.drawImage(image, 0, 0, displayWidth, displayHeight);

            maskCtx.clearRect(0, 0, aiSize.width, aiSize.height);
            overlayCtx.clearRect(0, 0, displayWidth, displayHeight);

            if (initialMaskDataUrl) {
                const initialMask = new Image();
                initialMask.src = initialMaskDataUrl;
                initialMask.onload = () => {
                    maskCtx.drawImage(initialMask, 0, 0, aiSize.width, aiSize.height);
                    overlayCtx.drawImage(initialMask, 0, 0, displayWidth, displayHeight);
                };
            }
        };
    }, [imageUrl, initialMaskDataUrl]);

    useEffect(() => {
        drawImageOnCanvas();
        window.addEventListener("resize", drawImageOnCanvas);
        return () => {
            window.removeEventListener("resize", drawImageOnCanvas);
        };
    }, [drawImageOnCanvas]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            setTimeout(() => {
                drawImageOnCanvas();
            }, 50);
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [drawImageOnCanvas]);

    const getPointerPos = (event) => {
        const displayCanvas = displayCanvasRef.current;
        if (!displayCanvas) return null;

        const rect = displayCanvas.getBoundingClientRect();
        const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
        const clientY = "touches" in event ? event.touches[0].clientY : event.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const saveHistory = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;
        setHistory((prev) => [...prev, maskCanvas.toDataURL()]);
    }, []);

    const startDrawing = useCallback((event) => {
        const pos = getPointerPos(event);
        if (!pos) return;

        saveHistory();
        isDrawingRef.current = true;
        lastPointRef.current = pos;
    }, [saveHistory]);

    const draw = useCallback((event) => {
        if (!isDrawingRef.current || !lastPointRef.current) return;

        event.preventDefault();
        const pos = getPointerPos(event);
        if (!pos) return;

        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const maskCtx = maskCanvas?.getContext("2d");
        const overlayCtx = overlayCanvas?.getContext("2d");
        if (!maskCtx || !overlayCtx) return;

        const scaleFactor = scaleFactorRef.current;

        maskCtx.beginPath();
        maskCtx.moveTo(lastPointRef.current.x * scaleFactor, lastPointRef.current.y * scaleFactor);
        maskCtx.lineTo(pos.x * scaleFactor, pos.y * scaleFactor);
        maskCtx.strokeStyle = "rgba(255, 255, 255, 1)";
        maskCtx.lineWidth = brushSize * scaleFactor;
        maskCtx.lineCap = "round";
        maskCtx.lineJoin = "round";
        maskCtx.stroke();

        overlayCtx.beginPath();
        overlayCtx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        overlayCtx.lineTo(pos.x, pos.y);
        overlayCtx.strokeStyle = "rgba(255, 255, 255, 1)";
        overlayCtx.lineWidth = brushSize;
        overlayCtx.lineCap = "round";
        overlayCtx.lineJoin = "round";
        overlayCtx.stroke();

        lastPointRef.current = pos;
    }, [brushSize]);

    const stopDrawing = useCallback(() => {
        if (!isDrawingRef.current) return;

        isDrawingRef.current = false;
        lastPointRef.current = null;

        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
            onMaskChange(maskCanvas.toDataURL());
        }
    }, [onMaskChange]);

    const handleUndo = useCallback(() => {
        if (history.length === 0) return;

        const nextHistory = history.slice(0, -1);
        setHistory(nextHistory);

        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const maskCtx = maskCanvas?.getContext("2d");
        const overlayCtx = overlayCanvas?.getContext("2d");
        if (!maskCanvas || !overlayCanvas || !maskCtx || !overlayCtx) return;

        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        const previousMask = nextHistory[nextHistory.length - 1];
        if (!previousMask) {
            onMaskChange(null);
            return;
        }

        const previousImage = new Image();
        previousImage.src = previousMask;
        previousImage.onload = () => {
            maskCtx.drawImage(previousImage, 0, 0, maskCanvas.width, maskCanvas.height);
            overlayCtx.drawImage(previousImage, 0, 0, overlayCanvas.width, overlayCanvas.height);
            onMaskChange(maskCanvas.toDataURL());
        };
    }, [history, onMaskChange]);

    const handleClear = useCallback(() => {
        const maskCanvas = maskCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const maskCtx = maskCanvas?.getContext("2d");
        const overlayCtx = overlayCanvas?.getContext("2d");
        if (!maskCanvas || !overlayCanvas || !maskCtx || !overlayCtx) return;

        saveHistory();
        maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        onMaskChange(null);
    }, [onMaskChange, saveHistory]);

    useEffect(() => {
        onMaskUndoAvailabilityChange?.(history.length > 0);
    }, [history.length, onMaskUndoAvailabilityChange]);

    useImperativeHandle(ref, () => ({
        undoMaskStroke: handleUndo,
        clearMask: handleClear,
    }), [handleClear, handleUndo]);

    return (
        <div className="masking-canvas" ref={containerRef}>
            <canvas ref={maskCanvasRef} className="masking-canvas__mask" />

            <canvas ref={displayCanvasRef} className="masking-canvas__display" />

            <canvas
                ref={overlayCanvasRef}
                className="masking-canvas__overlay"
                width={canvasSize.width}
                height={canvasSize.height}
            />

            <canvas
                className="masking-canvas__interaction"
                width={canvasSize.width}
                height={canvasSize.height}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            />
        </div>
    );
});

export default MaskingCanvas;
