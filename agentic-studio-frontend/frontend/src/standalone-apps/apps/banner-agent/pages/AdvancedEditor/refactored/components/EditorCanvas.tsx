import { MIN_ZOOM, MAX_ZOOM, TEXT_FONT_FAMILIES } from "../advancedEditorConstants";
import { clamp } from "../advancedEditorUtils";
import type { EditorController } from "./types";
import { HistoryActionIcon } from "./HistoryActionIcon";

interface EditorCanvasProps {
    controller: EditorController;
}

export function EditorCanvas({ controller }: EditorCanvasProps) {
    const {
        canvasSize,
        imageTransform,
        isImageSelected,
        zoomPercent,
        historyPast,
        historyFuture,
        textOverlays,
        selectedTextId,
        editingTextId,
        backgroundSettings,
        backgroundTool,
        brushSize,
        eraserCursorPos,
        pinnedProductLayers,
        heroAdjustTargetRatio,
        isHeroAdjustDownloading,
        isBackgroundRemoving,
        isHeroAdjustMode,
        isImageToolPanelRequested,
        selectedTextOverlay,
        appliedCropPreset,
        canvasRef,
        backgroundCanvasRef,
        zoomScale,
        canvasFilterCss,
        imageAdjustFilterCss,
        imageCompositeFilterCss,
        brandingBorderStyle,
        brandingLogoStyle,
        brandingSettings,
        processedBrandLogoUrl,
        activeSourceImageUrl,
        sourceOriginalUrl,
        currentBackgroundStyle,
        imageRenderSize,
        reflectionRenderStyle,
        reflectionSettings,
        transparentFillLayerStyle,
        setIsImageSelected,
        setSelectedTextId,
        setEditingTextId,
        handleCanvasPointerDown,
        handleCanvasPointerMove,
        handleCanvasPointerUp,
        handleCanvasPointerLeave,
        handlePinnedLayerSelect,
        startDragging,
        handleSourceImageLoad,
        startResize,
        startTextDrag,
        startTextResize,
        handleUndo,
        handleRedo,
        handleZoomOut,
        handleZoomIn,
        setZoomPercent,
        updateText,
        deleteText,
        saveSnapshot,
        downloadHeroAdjustedVariation,
        exitHeroAdjustMode,
    } = controller;

    return (
        <main
            className={`advanced-editor-stage ${isHeroAdjustMode ? "is-hero-adjust-modal" : ""}`}
            onClick={() => {
                setIsImageSelected(false);
                setSelectedTextId(null);
                setEditingTextId(null);
            }}
        >
            {isHeroAdjustMode && heroAdjustTargetRatio && (
                <div className="advanced-editor-hero-adjust-modal__header batch-edit-modal__header">
                    <div className="batch-edit-modal__title-wrap advanced-editor-hero-adjust-modal__title-wrap">
                        <h3>Edit Variation</h3>
                    </div>
                    <p>
                        {heroAdjustTargetRatio.label} • {heroAdjustTargetRatio.ratio} • Drag to move • Corner handle to resize the hero
                    </p>
                    <div className="advanced-editor-hero-adjust-modal__actions batch-edit-modal__actions">
                        <button type="button" onClick={() => { void downloadHeroAdjustedVariation(); }} disabled={isHeroAdjustDownloading}>
                            {isHeroAdjustDownloading ? "Downloading..." : "Download"}
                        </button>
                        <button
                            type="button"
                            className="batch-edit-modal__close"
                            onClick={exitHeroAdjustMode}
                            aria-label="Close hero edit"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {isImageToolPanelRequested && !isImageSelected && (
                <div className="advanced-editor-tool-hint" role="status" aria-live="polite">
                    Select the product image on canvas to enable the tools.
                </div>
            )}

            {selectedTextOverlay && (
                <div
                    className="advanced-editor-text-toolbar"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                >
                    <select
                        value={selectedTextOverlay.fontFamily}
                        onChange={(event) => updateText(selectedTextOverlay.id, { fontFamily: event.target.value })}
                        aria-label="Font family"
                    >
                        {TEXT_FONT_FAMILIES.map((font) => (
                            <option key={font} value={font}>{font}</option>
                        ))}
                    </select>

                    <div className="advanced-editor-text-toolbar__divider" />

                    <button
                        type="button"
                        onClick={() => updateText(selectedTextOverlay.id, { fontSize: clamp(selectedTextOverlay.fontSize - 2, 14, 180) })}
                        aria-label="Decrease font size"
                    >
                        -
                    </button>
                    <strong>{selectedTextOverlay.fontSize}</strong>
                    <button
                        type="button"
                        onClick={() => updateText(selectedTextOverlay.id, { fontSize: clamp(selectedTextOverlay.fontSize + 2, 14, 180) })}
                        aria-label="Increase font size"
                    >
                        +
                    </button>

                    <div className="advanced-editor-text-toolbar__divider" />

                    <input
                        type="color"
                        value={selectedTextOverlay.color}
                        onChange={(event) => updateText(selectedTextOverlay.id, { color: event.target.value })}
                        aria-label="Text color"
                    />

                    <button
                        type="button"
                        className={selectedTextOverlay.underline ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { underline: !selectedTextOverlay.underline })}
                    >
                        U
                    </button>
                    <button
                        type="button"
                        className={selectedTextOverlay.bold ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { bold: !selectedTextOverlay.bold })}
                    >
                        B
                    </button>
                    <button
                        type="button"
                        className={selectedTextOverlay.italic ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { italic: !selectedTextOverlay.italic })}
                    >
                        I
                    </button>

                    <div className="advanced-editor-text-toolbar__divider" />

                    <button
                        type="button"
                        className={selectedTextOverlay.alignment === "left" ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { alignment: "left" })}
                        aria-label="Align left"
                    >
                        ≡
                    </button>
                    <button
                        type="button"
                        className={selectedTextOverlay.alignment === "center" ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { alignment: "center" })}
                        aria-label="Align center"
                    >
                        ☰
                    </button>
                    <button
                        type="button"
                        className={selectedTextOverlay.alignment === "right" ? "is-active" : ""}
                        onClick={() => updateText(selectedTextOverlay.id, { alignment: "right" })}
                        aria-label="Align right"
                    >
                        ☷
                    </button>

                    <div className="advanced-editor-text-toolbar__divider" />

                    <button type="button" className="is-danger" onClick={() => deleteText(selectedTextOverlay.id)} aria-label="Delete text">
                        🗑
                    </button>
                </div>
            )}

            {!isHeroAdjustMode && (
                <div className="advanced-editor-history-actions">
                    <button type="button" onClick={handleUndo} disabled={historyPast.length === 0} aria-label="Undo">
                        <HistoryActionIcon type="undo" />
                    </button>
                    <button type="button" onClick={handleRedo} disabled={historyFuture.length === 0} aria-label="Redo">
                        <HistoryActionIcon type="redo" />
                    </button>
                </div>
            )}

            <div className="advanced-editor-canvas-viewport">
                <div
                    className="advanced-editor-canvas"
                    style={{
                        width: canvasSize.width,
                        height: canvasSize.height,
                        ...currentBackgroundStyle,
                        transform: `scale(${zoomScale})`,
                        filter: canvasFilterCss,
                    }}
                    ref={canvasRef}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerLeave}
                >
                    {transparentFillLayerStyle && (
                        <div
                            className="advanced-editor-background-fill-layer"
                            style={transparentFillLayerStyle}
                        />
                    )}

                    {backgroundSettings.backgroundType === "image" && backgroundSettings.backgroundImageUrl && (
                        <canvas
                            ref={backgroundCanvasRef}
                            className="advanced-editor-background-erase-layer"
                            width={canvasSize.width}
                            height={canvasSize.height}
                        />
                    )}

                    {pinnedProductLayers.map((layer) => (
                        <div
                            key={layer.id}
                            className="advanced-editor-product advanced-editor-product--pinned"
                            style={{
                                left: layer.x,
                                top: layer.y,
                                width: layer.width,
                                height: layer.height,
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                                handlePinnedLayerSelect(layer.id);
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <img
                                className="advanced-editor-product__main-image"
                                src={layer.imageUrl}
                                alt="Product"
                                style={{
                                    filter: layer.filter,
                                    objectFit: layer.objectFit,
                                }}
                            />
                        </div>
                    ))}

                    {activeSourceImageUrl && (
                        <div
                            className={`advanced-editor-product ${isImageSelected ? "is-selected" : ""}`}
                            style={{
                                left: imageTransform.x,
                                top: imageTransform.y,
                                width: imageRenderSize.width,
                                height: imageRenderSize.height,
                            }}
                            onPointerDown={startDragging}
                            onClick={(event) => {
                                event.stopPropagation();
                                setIsImageSelected(true);
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            {reflectionSettings.enabled && (
                                <div
                                    className="advanced-editor-product__reflection"
                                    style={reflectionRenderStyle}
                                    aria-hidden="true"
                                >
                                    <img
                                        key={sourceOriginalUrl}
                                        src={activeSourceImageUrl}
                                        alt=""
                                        style={{
                                            filter: imageAdjustFilterCss !== "none" ? imageAdjustFilterCss : undefined,
                                            objectFit: appliedCropPreset.ratio === null ? "contain" : "cover",
                                        }}
                                    />
                                </div>
                            )}

                            <img
                                key={sourceOriginalUrl}
                                className="advanced-editor-product__main-image"
                                src={activeSourceImageUrl}
                                alt="Product"
                                style={{
                                    filter: imageCompositeFilterCss,
                                    objectFit: appliedCropPreset.ratio === null ? "contain" : "cover",
                                }}
                                onLoad={handleSourceImageLoad}
                            />
                            {isImageSelected && (
                                <button
                                    type="button"
                                    className="advanced-editor-product__resize-handle"
                                    onPointerDown={startResize}
                                    aria-label="Resize product"
                                />
                            )}
                        </div>
                    )}

                    {textOverlays.map((overlay) => {
                        const isSelected = selectedTextId === overlay.id;
                        const isEditing = editingTextId === overlay.id;
                        return (
                            <div
                                key={overlay.id}
                                className={`advanced-editor-text-layer-canvas ${isSelected ? "is-selected" : ""}`}
                                style={{
                                    left: overlay.x,
                                    top: overlay.y,
                                    width: overlay.width,
                                }}
                                onPointerDown={(event) => {
                                    if (isHeroAdjustMode) {
                                        return;
                                    }
                                    startTextDrag(event, overlay);
                                }}
                                onClick={(event) => {
                                    if (isHeroAdjustMode) {
                                        return;
                                    }
                                    event.stopPropagation();
                                    setSelectedTextId(overlay.id);
                                    setEditingTextId(null);
                                    setIsImageSelected(false);
                                }}
                                onDoubleClick={(event) => {
                                    if (isHeroAdjustMode) {
                                        return;
                                    }
                                    event.stopPropagation();
                                    setSelectedTextId(overlay.id);
                                    setEditingTextId(overlay.id);
                                    setIsImageSelected(false);
                                    saveSnapshot();
                                }}
                                role="button"
                                tabIndex={0}
                            >
                                {isEditing ? (
                                    <textarea
                                        className="advanced-editor-text-layer-canvas__editor"
                                        value={overlay.text}
                                        onChange={(event) => {
                                            updateText(overlay.id, { text: event.target.value }, false);
                                        }}
                                        onBlur={() => {
                                            setEditingTextId(null);
                                        }}
                                        readOnly={isHeroAdjustMode}
                                        autoFocus
                                        style={{
                                            color: overlay.color,
                                            fontFamily: overlay.fontFamily,
                                            fontSize: overlay.fontSize,
                                            fontWeight: overlay.bold ? 700 : 500,
                                            fontStyle: overlay.italic ? "italic" : "normal",
                                            textDecoration: overlay.underline ? "underline" : "none",
                                            textAlign: overlay.alignment,
                                            opacity: clamp(overlay.opacity, 0, 100) / 100,
                                        }}
                                    />
                                ) : (
                                    <span
                                        className="advanced-editor-text-layer-canvas__content"
                                        style={{
                                            color: overlay.color,
                                            fontFamily: overlay.fontFamily,
                                            fontSize: overlay.fontSize,
                                            fontWeight: overlay.bold ? 700 : 500,
                                            fontStyle: overlay.italic ? "italic" : "normal",
                                            textDecoration: overlay.underline ? "underline" : "none",
                                            textAlign: overlay.alignment,
                                            opacity: clamp(overlay.opacity, 0, 100) / 100,
                                        }}
                                    >
                                        {overlay.text}
                                    </span>
                                )}

                                {isSelected && !isEditing && (
                                    <button
                                        type="button"
                                        className="advanced-editor-text-layer-canvas__resize"
                                        onPointerDown={(event) => {
                                            if (isHeroAdjustMode) {
                                                return;
                                            }
                                            startTextResize(event, overlay);
                                        }}
                                        aria-label="Resize text"
                                    />
                                )}
                            </div>
                        );
                    })}

                    {brandingSettings.enabled && (
                        <>
                            <div
                                className="advanced-editor-branding-border-layer"
                                style={brandingBorderStyle}
                            />
                            {brandingSettings.logoEnabled && processedBrandLogoUrl && (
                                <img
                                    src={processedBrandLogoUrl}
                                    alt="Brand logo"
                                    className="advanced-editor-branding-logo-layer"
                                    style={brandingLogoStyle}
                                />
                            )}
                        </>
                    )}

                    {isBackgroundRemoving && (
                        <div className="advanced-editor-processing-indicator" role="status" aria-live="polite">
                            Removing image background...
                        </div>
                    )}

                    {backgroundTool === "eraser" && eraserCursorPos && backgroundSettings.backgroundType === "image" && (
                        <div
                            className="advanced-editor-eraser-cursor"
                            style={{
                                left: eraserCursorPos.x,
                                top: eraserCursorPos.y,
                                width: brushSize,
                                height: brushSize,
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="advanced-editor-zoom-chip">
                <button type="button" onClick={handleZoomOut} aria-label="Zoom out">-</button>
                <input
                    type="range"
                    min={MIN_ZOOM}
                    max={MAX_ZOOM}
                    value={zoomPercent}
                    onChange={(event) => setZoomPercent(Number(event.target.value))}
                    aria-label="Canvas zoom"
                />
                <button type="button" onClick={handleZoomIn} aria-label="Zoom in">+</button>
                <strong>{zoomPercent}%</strong>
            </div>
        </main>
    );
}
