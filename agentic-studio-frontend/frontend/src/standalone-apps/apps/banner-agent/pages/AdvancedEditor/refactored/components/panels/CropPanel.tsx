import { CROP_PRESET_GROUPS } from "../../advancedEditorConstants";
import type { EditorController } from "../types";

interface CropPanelProps {
    controller: EditorController;
}

export function CropPanel({ controller }: CropPanelProps) {
    const { appliedCropPresetId, applyCropPreset } = controller;

    return (
        <div className="advanced-editor-crop-panel">
            {CROP_PRESET_GROUPS.map((group) => (
                <div key={group.platform ?? "general"} className="advanced-editor-crop-panel__section">
                    {group.platform && <p className="advanced-editor-crop-panel__platform">{group.platform}</p>}
                    <div className="advanced-editor-crop-panel__grid">
                        {group.presets.map((preset) => {
                            const isActive = appliedCropPresetId === preset.id;
                            const previewStyle =
                                preset.ratio === null
                                    ? undefined
                                    : preset.ratio >= 1
                                        ? { width: `${Math.min(72, Math.max(26, preset.ratio * 26))}%`, height: "34%" }
                                        : { width: "34%", height: `${Math.min(72, Math.max(26, (1 / preset.ratio) * 26))}%` };

                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    className={`advanced-editor-crop-preset ${isActive ? "is-active" : ""}`}
                                    onClick={() => applyCropPreset(preset.id)}
                                >
                                    <span className="advanced-editor-crop-preset__preview" aria-hidden="true">
                                        <span
                                            className={`advanced-editor-crop-preset__shape ${preset.ratio === null ? "is-free" : ""}`}
                                            style={previewStyle}
                                        />
                                    </span>
                                    <span className="advanced-editor-crop-preset__label">{preset.label}</span>
                                    <small className="advanced-editor-crop-preset__ratio">{preset.ratioLabel}</small>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
