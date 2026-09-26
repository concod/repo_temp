import type { CSSProperties } from "react";
import { ADJUST_CONTROLS } from "../../advancedEditorConstants";
import type { EditorController } from "../types";

interface AdjustPanelProps {
    controller: EditorController;
}

export function AdjustPanel({ controller }: AdjustPanelProps) {
    const {
        activeSourceImageUrl,
        imageAdjustFilterCss,
        adjustSettings,
        beginImageAdjust,
        handleImageAdjustCommit,
        updateAdjustSetting,
        resetAdjustSettings,
    } = controller;

    return (
        <div className="advanced-editor-adjust-panel">
            <div className="advanced-editor-adjust-panel__preview-wrap">
                {activeSourceImageUrl ? (
                    <img
                        src={activeSourceImageUrl}
                        alt="Selected product preview"
                        className="advanced-editor-adjust-panel__preview"
                        style={{ filter: imageAdjustFilterCss !== "none" ? imageAdjustFilterCss : undefined }}
                    />
                ) : (
                    <div className="advanced-editor-adjust-panel__preview-fallback">
                        Select a product image to preview adjustments.
                    </div>
                )}
            </div>

            <div className="advanced-editor-adjust-panel__controls">
                {ADJUST_CONTROLS.map((control) => {
                    const value = adjustSettings[control.key];
                    const fillPercentage = ((value - control.min) / (control.max - control.min)) * 100;

                    return (
                        <label
                            key={control.key}
                            className={`advanced-editor-adjust-slider ${control.disabled ? "is-disabled" : ""}`}
                        >
                            <div className="advanced-editor-adjust-slider__head">
                                <span className="advanced-editor-adjust-slider__label">{control.label}</span>
                                <strong className="advanced-editor-adjust-slider__value">{value}</strong>
                            </div>
                            <input
                                type="range"
                                min={control.min}
                                max={control.max}
                                step={1}
                                value={value}
                                style={{ "--slider-fill": `${fillPercentage}%` } as CSSProperties}
                                disabled={control.disabled}
                                onPointerDown={beginImageAdjust}
                                onPointerUp={handleImageAdjustCommit}
                                onBlur={handleImageAdjustCommit}
                                onChange={(event) => {
                                    updateAdjustSetting(control.key, Number(event.target.value));
                                }}
                                aria-label={control.label}
                            />
                        </label>
                    );
                })}
            </div>

            <button
                type="button"
                className="advanced-editor-adjust-panel__reset-btn"
                onClick={resetAdjustSettings}
            >
                Reset Settings
            </button>
        </div>
    );
}
