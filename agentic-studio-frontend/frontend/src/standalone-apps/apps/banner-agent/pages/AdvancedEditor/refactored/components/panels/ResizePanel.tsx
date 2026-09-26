import { RESIZE_CANVAS_PRESETS } from "../../advancedEditorConstants";
import type { EditorController } from "../types";

interface ResizePanelProps {
    controller: EditorController;
}

export function ResizePanel({ controller }: ResizePanelProps) {
    const {
        resizeCanvasWidth,
        resizeCanvasHeight,
        lockResizeAspectRatio,
        selectedResizePreset,
        showResizeAdvanced,
        updateResizeWidth,
        updateResizeHeight,
        toggleResizeAspectRatio,
        resetResizeCanvas,
        applyResizePreset,
        setShowResizeAdvanced,
    } = controller;

    return (
        <>
            <p className="advanced-editor-panel__subtitle">
                Set canvas ratio for editing.
            </p>

            <div className="advanced-editor-resize-row">
                <label className="advanced-editor-resize-field">
                    <span>Width (px)</span>
                    <input
                        type="number"
                        min={100}
                        max={5000}
                        value={resizeCanvasWidth}
                        onChange={(event) => updateResizeWidth(Number(event.target.value))}
                    />
                </label>
                <label className="advanced-editor-resize-field">
                    <span>Height (px)</span>
                    <input
                        type="number"
                        min={100}
                        max={5000}
                        value={resizeCanvasHeight}
                        onChange={(event) => updateResizeHeight(Number(event.target.value))}
                    />
                </label>
            </div>

            <div className="advanced-editor-resize-actions">
                <button type="button" onClick={toggleResizeAspectRatio}>
                    {lockResizeAspectRatio ? "Unlock Ratio" : "Lock Ratio"}
                </button>
                <button type="button" onClick={resetResizeCanvas}>Reset</button>
            </div>

            <div className="advanced-editor-resize-presets-wrap">
                <h3>Aspect Ratios</h3>
                <div className="advanced-editor-resize-presets-grid">
                    {RESIZE_CANVAS_PRESETS.map((preset) => {
                        const isActive = selectedResizePreset === preset.ratio;
                        return (
                            <button
                                key={preset.ratio}
                                type="button"
                                className={`advanced-editor-resize-preset ${isActive ? "is-active" : ""}`}
                                onClick={() => applyResizePreset(preset)}
                            >
                                <span>{preset.name}</span>
                                <small>{preset.ratio}</small>
                            </button>
                        );
                    })}
                </div>
            </div>

            <button
                type="button"
                className="advanced-editor-resize-advanced-toggle"
                onClick={() => setShowResizeAdvanced((prev: boolean) => !prev)}
            >
                {showResizeAdvanced ? "Hide" : "Show"} Editor Canvas Size (Advanced)
            </button>

            {showResizeAdvanced && (
                <div className="advanced-editor-resize-advanced">
                    <label htmlFor="resize-width-slider">
                        Canvas Width: {resizeCanvasWidth}px
                    </label>
                    <input
                        id="resize-width-slider"
                        type="range"
                        min={100}
                        max={5000}
                        step={10}
                        value={resizeCanvasWidth}
                        onChange={(event) => updateResizeWidth(Number(event.target.value))}
                    />

                    <label htmlFor="resize-height-slider">
                        Canvas Height: {resizeCanvasHeight}px
                    </label>
                    <input
                        id="resize-height-slider"
                        type="range"
                        min={100}
                        max={5000}
                        step={10}
                        value={resizeCanvasHeight}
                        onChange={(event) => updateResizeHeight(Number(event.target.value))}
                    />
                </div>
            )}
        </>
    );
}
