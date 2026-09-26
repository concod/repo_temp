import type { BackgroundScaleMode, CollageBackgroundSettings, PatternType, TransparentFillType } from "../../advancedEditorTypes";
import { getPatternPreview } from "../../advancedEditorUtils";
import type { EditorController } from "../types";

interface BackgroundPanelProps {
    controller: EditorController;
}

export function BackgroundPanel({ controller }: BackgroundPanelProps) {
    const {
        backgroundSettings,
        backgroundTool,
        brushSize,
        updateBackgroundSettings,
        setBackgroundTool,
        updateTransparentFill,
        handleBackgroundImageUpload,
        handleRemoveBackgroundImage,
        setBrushSize,
        saveSnapshot,
    } = controller;

    return (
        <>
            <p className="advanced-editor-panel__subtitle">
                Set the background for your entire collage canvas
            </p>

            <div className="advanced-editor-background-section">
                <span className="advanced-editor-background-label">Background Type</span>
                <div className="advanced-editor-segmented-tabs">
                    {[
                        { id: "transparent", label: "None" },
                        { id: "solid", label: "Solid" },
                        { id: "gradient", label: "Gradient" },
                        { id: "image", label: "Image" },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`advanced-editor-segmented-tabs__item ${backgroundSettings.backgroundType === item.id ? "is-active" : ""}`}
                            onClick={() => {
                                updateBackgroundSettings({
                                    backgroundType: item.id as CollageBackgroundSettings["backgroundType"],
                                });
                                if (item.id !== "image") {
                                    setBackgroundTool("brush");
                                }
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {backgroundSettings.backgroundType === "solid" && (
                <div className="advanced-editor-background-control-card">
                    <label className="advanced-editor-inline-field" htmlFor="bg-solid-color">
                        <input
                            id="bg-solid-color"
                            type="color"
                            value={backgroundSettings.backgroundColor}
                            onChange={(event) => updateBackgroundSettings({ backgroundColor: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                        />
                        <input
                            type="text"
                            value={backgroundSettings.backgroundColor}
                            onChange={(event) => updateBackgroundSettings({ backgroundColor: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                            aria-label="Solid background hex"
                        />
                        <span>100%</span>
                    </label>
                </div>
            )}

            {backgroundSettings.backgroundType === "gradient" && (
                <div className="advanced-editor-background-control-card advanced-editor-background-control-card--stack">
                    <label className="advanced-editor-background-label" htmlFor="bg-gradient-start">Start Color</label>
                    <div className="advanced-editor-inline-field">
                        <input
                            id="bg-gradient-start"
                            type="color"
                            value={backgroundSettings.backgroundGradientStart}
                            onChange={(event) => updateBackgroundSettings({ backgroundGradientStart: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                        />
                        <input
                            type="text"
                            value={backgroundSettings.backgroundGradientStart}
                            onChange={(event) => updateBackgroundSettings({ backgroundGradientStart: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                            aria-label="Gradient start hex"
                        />
                    </div>

                    <label className="advanced-editor-background-label" htmlFor="bg-gradient-end">End Color</label>
                    <div className="advanced-editor-inline-field">
                        <input
                            id="bg-gradient-end"
                            type="color"
                            value={backgroundSettings.backgroundGradientEnd}
                            onChange={(event) => updateBackgroundSettings({ backgroundGradientEnd: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                            aria-label="Gradient end hex"
                        />
                        <input
                            type="text"
                            value={backgroundSettings.backgroundGradientEnd}
                            onChange={(event) => updateBackgroundSettings({ backgroundGradientEnd: event.target.value }, false)}
                            onBlur={() => saveSnapshot()}
                            aria-label="Gradient end hex"
                        />
                    </div>

                    <label className="advanced-editor-background-label" htmlFor="bg-gradient-angle">
                        Angle: {backgroundSettings.backgroundGradientAngle}°
                    </label>
                    <input
                        id="bg-gradient-angle"
                        type="range"
                        min={0}
                        max={360}
                        step={1}
                        value={backgroundSettings.backgroundGradientAngle}
                        onChange={(event) => updateBackgroundSettings({ backgroundGradientAngle: Number(event.target.value) }, false)}
                        onPointerUp={() => saveSnapshot()}
                        onBlur={() => saveSnapshot()}
                    />

                    <div
                        className="advanced-editor-gradient-preview"
                        style={{
                            background: `linear-gradient(${backgroundSettings.backgroundGradientAngle}deg, ${backgroundSettings.backgroundGradientStart}, ${backgroundSettings.backgroundGradientEnd})`,
                        }}
                    />
                </div>
            )}

            {backgroundSettings.backgroundType === "image" && (
                <div className="advanced-editor-background-control-card advanced-editor-background-control-card--stack">
                    <label className="advanced-editor-background-label" htmlFor="bg-image-upload">
                        Background Image
                    </label>

                    <input
                        id="bg-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleBackgroundImageUpload}
                        className="advanced-editor-hidden-input"
                    />

                    {!backgroundSettings.backgroundImageUrl && (
                        <label htmlFor="bg-image-upload" className="advanced-editor-upload-btn">
                            Upload Background Image
                        </label>
                    )}

                    {backgroundSettings.backgroundImageUrl && (
                        <>
                            <div className="advanced-editor-background-thumb">
                                <img src={backgroundSettings.backgroundImageUrl} alt="Background" />
                            </div>

                            <div className="advanced-editor-image-actions">
                                <button
                                    type="button"
                                    className={`advanced-editor-image-action-btn ${backgroundTool === "eraser" ? "is-active" : ""}`}
                                    onClick={() => setBackgroundTool((prev) => (prev === "eraser" ? "brush" : "eraser"))}
                                >
                                    {backgroundTool === "eraser" ? "Erasing" : "Erase Parts"}
                                </button>
                                <button
                                    type="button"
                                    className="advanced-editor-image-action-btn is-danger"
                                    onClick={handleRemoveBackgroundImage}
                                >
                                    Remove
                                </button>
                            </div>

                            {backgroundTool === "eraser" && (
                                <>
                                    <label className="advanced-editor-background-label" htmlFor="bg-eraser-size">
                                        Eraser Size: {brushSize}px
                                    </label>
                                    <input
                                        id="bg-eraser-size"
                                        type="range"
                                        min={5}
                                        max={100}
                                        step={1}
                                        value={brushSize}
                                        onChange={(event) => setBrushSize(Number(event.target.value))}
                                    />
                                </>
                            )}

                            <label className="advanced-editor-background-label">Scale Mode</label>
                            <div className="advanced-editor-segmented-tabs advanced-editor-segmented-tabs--three">
                                {(["cover", "fill", "contain"] as BackgroundScaleMode[]).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        className={`advanced-editor-segmented-tabs__item ${backgroundSettings.backgroundScaleMode === mode ? "is-active" : ""}`}
                                        onClick={() => updateBackgroundSettings({ backgroundScaleMode: mode })}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>

                            <div className="advanced-editor-fill-toggle-row">
                                <div>
                                    <strong>Fill Transparent Areas</strong>
                                    <span>Enable color or pattern fill behind transparent pixels.</span>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={backgroundSettings.transparentFill.enabled}
                                    onChange={(event) => updateTransparentFill({ enabled: event.target.checked })}
                                    aria-label="Fill transparent areas"
                                />
                            </div>

                            {backgroundSettings.transparentFill.enabled && (
                                <div className="advanced-editor-transparent-fill">
                                    <div className="advanced-editor-segmented-tabs">
                                        {(["solid", "gradient", "blur", "pattern"] as TransparentFillType[]).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`advanced-editor-segmented-tabs__item ${backgroundSettings.transparentFill.type === type ? "is-active" : ""}`}
                                                onClick={() => updateTransparentFill({ type })}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>

                                    {backgroundSettings.transparentFill.type === "solid" && (
                                        <div className="advanced-editor-inline-field">
                                            <input
                                                type="color"
                                                value={backgroundSettings.transparentFill.color}
                                                onChange={(event) => updateTransparentFill({ color: event.target.value }, false)}
                                                onBlur={() => saveSnapshot()}
                                            />
                                            <input
                                                type="text"
                                                value={backgroundSettings.transparentFill.color}
                                                onChange={(event) => updateTransparentFill({ color: event.target.value }, false)}
                                                onBlur={() => saveSnapshot()}
                                                aria-label="Transparent fill solid color"
                                            />
                                        </div>
                                    )}

                                    {backgroundSettings.transparentFill.type === "gradient" && (
                                        <>
                                            <div className="advanced-editor-inline-field">
                                                <input
                                                    type="color"
                                                    value={backgroundSettings.transparentFill.gradientStart}
                                                    onChange={(event) => updateTransparentFill({ gradientStart: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                />
                                                <input
                                                    type="text"
                                                    value={backgroundSettings.transparentFill.gradientStart}
                                                    onChange={(event) => updateTransparentFill({ gradientStart: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                    aria-label="Transparent fill gradient start"
                                                />
                                            </div>
                                            <div className="advanced-editor-inline-field">
                                                <input
                                                    type="color"
                                                    value={backgroundSettings.transparentFill.gradientEnd}
                                                    onChange={(event) => updateTransparentFill({ gradientEnd: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                />
                                                <input
                                                    type="text"
                                                    value={backgroundSettings.transparentFill.gradientEnd}
                                                    onChange={(event) => updateTransparentFill({ gradientEnd: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                    aria-label="Transparent fill gradient end"
                                                />
                                            </div>
                                            <label className="advanced-editor-background-label" htmlFor="transparent-gradient-angle">
                                                Angle: {backgroundSettings.transparentFill.gradientAngle}°
                                            </label>
                                            <input
                                                id="transparent-gradient-angle"
                                                type="range"
                                                min={0}
                                                max={360}
                                                step={1}
                                                value={backgroundSettings.transparentFill.gradientAngle}
                                                onChange={(event) => updateTransparentFill({ gradientAngle: Number(event.target.value) }, false)}
                                                onPointerUp={() => saveSnapshot()}
                                                onBlur={() => saveSnapshot()}
                                            />
                                        </>
                                    )}

                                    {backgroundSettings.transparentFill.type === "blur" && (
                                        <>
                                            <label className="advanced-editor-background-label" htmlFor="transparent-blur-amount">
                                                Blur: {backgroundSettings.transparentFill.blurAmount}px
                                            </label>
                                            <input
                                                id="transparent-blur-amount"
                                                type="range"
                                                min={5}
                                                max={100}
                                                step={1}
                                                value={backgroundSettings.transparentFill.blurAmount}
                                                onChange={(event) => updateTransparentFill({ blurAmount: Number(event.target.value) }, false)}
                                                onPointerUp={() => saveSnapshot()}
                                                onBlur={() => saveSnapshot()}
                                            />
                                        </>
                                    )}

                                    {backgroundSettings.transparentFill.type === "pattern" && (
                                        <>
                                            <div className="advanced-editor-pattern-grid">
                                                {(["dots", "grid", "diagonal", "waves", "noise"] as PatternType[]).map((pattern) => (
                                                    <button
                                                        key={pattern}
                                                        type="button"
                                                        className={`advanced-editor-pattern-btn ${backgroundSettings.transparentFill.pattern === pattern ? "is-active" : ""}`}
                                                        onClick={() => updateTransparentFill({ pattern })}
                                                        style={{
                                                            backgroundImage: getPatternPreview(pattern, backgroundSettings.transparentFill.color),
                                                            backgroundSize: pattern === "noise" ? "8px 8px" : "20px 20px",
                                                        }}
                                                    >
                                                        <span>{pattern}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="advanced-editor-inline-field">
                                                <input
                                                    type="color"
                                                    value={backgroundSettings.transparentFill.color}
                                                    onChange={(event) => updateTransparentFill({ color: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                />
                                                <input
                                                    type="text"
                                                    value={backgroundSettings.transparentFill.color}
                                                    onChange={(event) => updateTransparentFill({ color: event.target.value }, false)}
                                                    onBlur={() => saveSnapshot()}
                                                    aria-label="Transparent fill pattern color"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );
}
