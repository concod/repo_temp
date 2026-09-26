import { FILTER_PRESETS } from "../../advancedEditorConstants";
import { getCssFilterFromPreset } from "../../advancedEditorUtils";
import type { EditorController } from "../types";

interface FiltersPanelProps {
    controller: EditorController;
}

export function FiltersPanel({ controller }: FiltersPanelProps) {
    const {
        filterState,
        activeSourceImageUrl,
        currentBackgroundStyle,
        saveSnapshot,
        setFilterState,
        beginFilterIntensityAdjust,
        handleFilterIntensityCommit,
    } = controller;

    return (
        <>
            <p className="advanced-editor-panel__subtitle">
                Filter will be applied to all assets and the background
            </p>

            <div className="advanced-editor-filter-grid" role="list">
                {FILTER_PRESETS.map((preset) => {
                    const isSelected = preset.id === filterState.preset;
                    const previewFilter = getCssFilterFromPreset(
                        preset.id,
                        isSelected ? filterState.intensity : 80
                    );

                    return (
                        <button
                            key={preset.name}
                            type="button"
                            className={`advanced-editor-filter-card ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                                if (isSelected) {
                                    return;
                                }
                                saveSnapshot();
                                setFilterState((prev) => ({ ...prev, preset: preset.id }));
                            }}
                        >
                            <span className="advanced-editor-filter-card__preview" style={currentBackgroundStyle}>
                                {activeSourceImageUrl ? (
                                    <img
                                        src={activeSourceImageUrl}
                                        alt=""
                                        aria-hidden="true"
                                        style={{ filter: previewFilter }}
                                    />
                                ) : (
                                    <span
                                        className="advanced-editor-filter-card__preview-fallback"
                                        style={{ filter: previewFilter }}
                                    />
                                )}
                            </span>
                            <span className="advanced-editor-filter-card__name">{preset.name}</span>
                            {isSelected && <span className="advanced-editor-filter-card__check">✓</span>}
                        </button>
                    );
                })}
            </div>

            {filterState.preset && (
                <div className="advanced-editor-filter-slider-wrap">
                    <div className="advanced-editor-filter-slider-head">
                        <span>Intensity</span>
                        <strong>{filterState.intensity}%</strong>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={filterState.intensity}
                        onPointerDown={beginFilterIntensityAdjust}
                        onPointerUp={handleFilterIntensityCommit}
                        onBlur={handleFilterIntensityCommit}
                        onChange={(event) => {
                            const value = Number(event.target.value);
                            setFilterState((prev) => ({ ...prev, intensity: value }));
                        }}
                        aria-label="Filter intensity"
                    />
                </div>
            )}
        </>
    );
}
