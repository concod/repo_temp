import type { EditorController } from "../types";

interface ShadowPanelProps {
    controller: EditorController;
}

export function ShadowPanel({ controller }: ShadowPanelProps) {
    const { shadowSettings, updateShadowSettings } = controller;

    return (
        <div className="advanced-editor-shadow-panel">
            <div className="advanced-editor-shadow-panel__head">
                <span className="advanced-editor-shadow-panel__title">
                    <span aria-hidden="true">◈</span>
                    Shadow
                </span>
                <label className="advanced-editor-shadow-switch" htmlFor="shadow-enable-toggle">
                    <input
                        id="shadow-enable-toggle"
                        type="checkbox"
                        checked={shadowSettings.enabled}
                        onChange={(event) => updateShadowSettings({ enabled: event.target.checked })}
                    />
                    <span aria-hidden="true" />
                </label>
            </div>

            <div className={`advanced-editor-shadow-panel__controls ${!shadowSettings.enabled ? "is-disabled" : ""}`}>
                <label className="advanced-editor-shadow-slider" htmlFor="shadow-angle">
                    <div>
                        <span>Angle</span>
                        <strong>{shadowSettings.angle}°</strong>
                    </div>
                    <input
                        id="shadow-angle"
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={shadowSettings.angle}
                        onChange={(event) => updateShadowSettings({ angle: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="shadow-distance">
                    <div>
                        <span>Distance</span>
                        <strong>{shadowSettings.distance} px</strong>
                    </div>
                    <input
                        id="shadow-distance"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={shadowSettings.distance}
                        onChange={(event) => updateShadowSettings({ distance: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="shadow-blur">
                    <div>
                        <span>Blur</span>
                        <strong>{shadowSettings.blur} px</strong>
                    </div>
                    <input
                        id="shadow-blur"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={shadowSettings.blur}
                        onChange={(event) => updateShadowSettings({ blur: Number(event.target.value) })}
                    />
                </label>

                <label className="advanced-editor-shadow-slider" htmlFor="shadow-opacity">
                    <div>
                        <span>Opacity</span>
                        <strong>{shadowSettings.opacity}%</strong>
                    </div>
                    <input
                        id="shadow-opacity"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={shadowSettings.opacity}
                        onChange={(event) => updateShadowSettings({ opacity: Number(event.target.value) })}
                    />
                </label>

                <div className="advanced-editor-inline-field advanced-editor-inline-field--shadow">
                    <input
                        type="color"
                        value={shadowSettings.color}
                        onChange={(event) => updateShadowSettings({ color: event.target.value })}
                        aria-label="Shadow color"
                    />
                    <input
                        type="text"
                        value={shadowSettings.color}
                        onChange={(event) => updateShadowSettings({ color: event.target.value })}
                        aria-label="Shadow hex"
                    />
                    <span>{shadowSettings.opacity}%</span>
                </div>
            </div>
        </div>
    );
}
