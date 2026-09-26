import type { EditorController } from "../types";

interface ReflectionPanelProps {
    controller: EditorController;
}

export function ReflectionPanel({ controller }: ReflectionPanelProps) {
    const { reflectionSettings, updateReflectionSettings } = controller;

    return (
        <div className="advanced-editor-shadow-panel">
            <div className="advanced-editor-shadow-panel__head">
                <span className="advanced-editor-shadow-panel__title">
                    <span aria-hidden="true">◫</span>
                    Reflection
                </span>
                <label className="advanced-editor-shadow-switch" htmlFor="reflection-enable-toggle">
                    <input
                        id="reflection-enable-toggle"
                        type="checkbox"
                        checked={reflectionSettings.enabled}
                        onChange={(event) => updateReflectionSettings({ enabled: event.target.checked })}
                    />
                    <span aria-hidden="true" />
                </label>
            </div>

            <div className={`advanced-editor-shadow-panel__controls ${!reflectionSettings.enabled ? "is-disabled" : ""}`}>
                <label className="advanced-editor-shadow-slider" htmlFor="reflection-opacity">
                    <div>
                        <span>Opacity</span>
                        <strong>{reflectionSettings.opacity}%</strong>
                    </div>
                    <input
                        id="reflection-opacity"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={reflectionSettings.opacity}
                        onChange={(event) => updateReflectionSettings({ opacity: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="reflection-distance">
                    <div>
                        <span>Distance</span>
                        <strong>{reflectionSettings.distance} px</strong>
                    </div>
                    <input
                        id="reflection-distance"
                        type="range"
                        min={0}
                        max={50}
                        step={1}
                        value={reflectionSettings.distance}
                        onChange={(event) => updateReflectionSettings({ distance: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="reflection-y-offset">
                    <div>
                        <span>Vertical Offset</span>
                        <strong>{reflectionSettings.yOffset} px</strong>
                    </div>
                    <input
                        id="reflection-y-offset"
                        type="range"
                        min={-200}
                        max={200}
                        step={1}
                        value={reflectionSettings.yOffset}
                        onChange={(event) => updateReflectionSettings({ yOffset: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="reflection-height">
                    <div>
                        <span>Height</span>
                        <strong>{reflectionSettings.height}%</strong>
                    </div>
                    <input
                        id="reflection-height"
                        type="range"
                        min={10}
                        max={100}
                        step={1}
                        value={reflectionSettings.height}
                        onChange={(event) => updateReflectionSettings({ height: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="reflection-blur">
                    <div>
                        <span>Blur</span>
                        <strong>{reflectionSettings.blur} px</strong>
                    </div>
                    <input
                        id="reflection-blur"
                        type="range"
                        min={0}
                        max={20}
                        step={1}
                        value={reflectionSettings.blur}
                        onChange={(event) => updateReflectionSettings({ blur: Number(event.target.value) })}
                    />
                </label>
            </div>
        </div>
    );
}
