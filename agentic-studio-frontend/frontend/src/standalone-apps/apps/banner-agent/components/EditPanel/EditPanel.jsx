import { useRef } from "react";
import "./EditPanel.scss";

import assetPanelIcon from "../../assets/asset-editor-icons/asset-panel.svg";
import cropPanelIcon from "../../assets/asset-editor-icons/crop-panel.svg";
import erasePanelIcon from "../../assets/asset-editor-icons/erase-panel.svg";
import expandPanelIcon from "../../assets/asset-editor-icons/expand-panel.svg";
import modifyPanelIcon from "../../assets/asset-editor-icons/modify-panel.svg";
import textPanelIcon from "../../assets/asset-editor-icons/text-panel.svg";

export default function EditPanel({
    activeTool,
    prompt,
    negativePrompt,
    variations,
    brushSize,
    onPromptChange,
    onNegativePromptChange,
    onVariationsChange,
    onBrushSizeChange,
    onGenerate,
    isGenerating,
    isGenerateDisabled,
    textElements,
    removeExistingTexts,
    onTextElementAdd,
    onTextElementRemove,
    onTextElementChange,
    onRemoveExistingTextsChange,
    expandWidth,
    expandHeight,
    expandZoom,
    expandPreset,
    onExpandWidthChange,
    onExpandHeightChange,
    onExpandZoomChange,
    onExpandPresetSelect,
    addedObjectImages,
    onAddObjectFiles,
    onRemoveAddedObject,
    addedObjectPrompt,
    onAddedObjectPromptChange,
    optimizeForPets,
    onOptimizeForPetsChange,
    showOptimizeForPets,
    cropPresetGroups,
    selectedCropPreset,
    onCropPresetSelect,
    onApplyCrop,
    isApplyingCrop,
    isApplyCropDisabled,
}) {
    const addObjectInputRef = useRef(null);

    const isTextTab = activeTool === "text";
    const isEraseTab = activeTool === "erase";
    const panelTitleByTool = {
        modify: "Modify",
        asset: "Asset",
        text: "Text",
        erase: "Erase",
        crop: "Crop",
        expand: "Expand",
    };
    const panelIconByTool = {
        modify: modifyPanelIcon,
        asset: assetPanelIcon,
        text: textPanelIcon,
        erase: erasePanelIcon,
        crop: cropPanelIcon,
        expand: expandPanelIcon,
    };

    const title = panelTitleByTool[activeTool] || (isTextTab ? "Text" : isEraseTab ? "Erase" : "Modify");
    const panelIcon = panelIconByTool[activeTool] || modifyPanelIcon;
    const isExpandTab = activeTool === "expand";
    const isAssetTab = activeTool === "asset";
    const isCropTab = activeTool === "crop";

    const renderModifyPanel = () => (
        <>
            <div className="edit-panel__section">
                <label htmlFor="asset-editor-description">Describe Your Edits</label>
                <textarea
                    id="asset-editor-description"
                    placeholder="Ex: Change the background to a futuristic city at night."
                    rows={4}
                    value={prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                />
            </div>

            <div className="edit-panel__section">
                <label htmlFor="asset-editor-avoid">What to avoid in the output</label>
                <textarea
                    id="asset-editor-avoid"
                    placeholder="Ex: blurry, distorted, text, watermarks"
                    rows={4}
                    value={negativePrompt}
                    onChange={(event) => onNegativePromptChange(event.target.value)}
                />
            </div>

            <div className="edit-panel__section edit-panel__section--slider">
                <div className="edit-panel__slider-label">
                    <span>Variations</span>
                    <span>{variations}/5</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={5}
                    value={variations}
                    onChange={(event) => onVariationsChange(Number(event.target.value))}
                />
            </div>
        </>
    );

    const renderTextPanel = () => (
        <>
            <div className="edit-panel__text-list">
                {textElements.map((item, index) => (
                    <article className="edit-panel__text-card" key={item.id}>
                        <header>
                            <span>Text Element #{index + 1}</span>
                            <button
                                type="button"
                                className="edit-panel__text-delete"
                                onClick={() => onTextElementRemove(item.id)}
                                aria-label={`Delete text element ${index + 1}`}
                                disabled={textElements.length <= 1}
                            >
                                🗑
                            </button>
                        </header>

                        <input
                            type="text"
                            placeholder="Enter the text to display"
                            value={item.content}
                            onChange={(event) => onTextElementChange(item.id, "content", event.target.value)}
                        />

                        <textarea
                            rows={3}
                            placeholder="Describe placement & Style (eg: bottom left, large, white etc)"
                            value={item.prompt}
                            onChange={(event) => onTextElementChange(item.id, "prompt", event.target.value)}
                        />
                    </article>
                ))}
            </div>

            <button
                type="button"
                className="edit-panel__add-text"
                onClick={onTextElementAdd}
            >
                + Add More Text
            </button>

            <label className="edit-panel__checkbox">
                <input
                    type="checkbox"
                    checked={removeExistingTexts}
                    onChange={(event) => onRemoveExistingTextsChange(event.target.checked)}
                />
                <span>Remove Existing Texts</span>
            </label>
        </>
    );

    const renderErasePanel = () => (
        <>
            <div className="edit-panel__erase-headline">Object Removal</div>

            <div className="edit-panel__section edit-panel__section--slider">
                <div className="edit-panel__slider-label">
                    <span>Brush Size</span>
                    <span>{brushSize}px</span>
                </div>
                <input
                    type="range"
                    min={8}
                    max={120}
                    value={brushSize}
                    onChange={(event) => onBrushSizeChange(Number(event.target.value))}
                    aria-label="Brush size"
                />
            </div>

            <p className="edit-panel__erase-copy">
                Paint over the object you want to remove in the canvas. Use Undo and Clear for quick fixes, then click Generate.
            </p>
        </>
    );

    const expandPresets = [
        { id: "1080x1080", label: "1080 x 1080", ratio: "1:1", width: 1080, height: 1080 },
        { id: "1080x1350", label: "1080 x 1350", ratio: "4:5", width: 1080, height: 1350 },
        { id: "1080x1920", label: "1080 x 1920", ratio: "9:16", width: 1080, height: 1920 },
        { id: "1200x630", label: "1200 x 630", ratio: "1.91:1", width: 1200, height: 630 },
    ];

    const renderExpandPanel = () => (
        <>
            <div className="edit-panel__dimension-grid">
                <div className="edit-panel__dimension-field">
                    <label htmlFor="expand-width">Width (px)</label>
                    <input
                        id="expand-width"
                        type="number"
                        min={1}
                        value={expandWidth}
                        onChange={(event) => onExpandWidthChange(Number(event.target.value) || 0)}
                    />
                </div>
                <div className="edit-panel__dimension-field">
                    <label htmlFor="expand-height">Height (px)</label>
                    <input
                        id="expand-height"
                        type="number"
                        min={1}
                        value={expandHeight}
                        onChange={(event) => onExpandHeightChange(Number(event.target.value) || 0)}
                    />
                </div>
            </div>

            <div className="edit-panel__expand-presets">
                <h4>Social Media</h4>
                <div className="edit-panel__expand-preset-grid">
                    {expandPresets.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className={`edit-panel__expand-preset${expandPreset === preset.id ? " active" : ""}`}
                            onClick={() => onExpandPresetSelect(preset.id, preset.width, preset.height)}
                        >
                            <span>{preset.label}</span>
                            <small>{preset.ratio}</small>
                        </button>
                    ))}
                </div>
            </div>

            <div className="edit-panel__section edit-panel__section--slider">
                <div className="edit-panel__slider-label">
                    <span>Zoom</span>
                    <span>{Math.round(expandZoom * 100)}%</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={expandZoom}
                    onChange={(event) => onExpandZoomChange(Number(event.target.value))}
                    aria-label="Expand zoom"
                />
            </div>
        </>
    );

    const renderAssetUploader = ({ imageUrl, inputRef, onSelect, onClear, multiple = false }) => (
        <div className={`edit-panel__asset-uploader${imageUrl ? " edit-panel__asset-uploader--filled" : ""}`}>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple={multiple}
                hidden
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    onSelect?.(multiple ? files : files[0] || null);
                    event.target.value = "";
                }}
            />

            {imageUrl ? (
                <>
                    <img src={imageUrl} alt="Uploaded asset" className="edit-panel__asset-preview-image" />
                    {onClear ? (
                        <button type="button" className="edit-panel__asset-clear" onClick={onClear} aria-label="Clear uploaded asset">
                            x
                        </button>
                    ) : null}
                </>
            ) : (
                <button type="button" className="edit-panel__asset-upload-trigger" onClick={() => inputRef.current?.click()}>
                    <span className="edit-panel__asset-upload-icon">↑</span>
                    <strong>Upload Asset</strong>
                    {/* <small>Drag & drop here</small> */}
                    <span>Browse Assets</span>
                </button>
            )}
        </div>
    );

    const renderAssetPanel = () => {
        const firstAddedImage = addedObjectImages?.[0]?.previewUrl || "";

        return (
            <>
                <div className="edit-panel__asset-copy">
                    <h3>Add Objects</h3>
                    <p>Add multiple objects at once. AI places them with realistic lighting and shadows.</p>
                </div>

                {renderAssetUploader({
                    imageUrl: firstAddedImage,
                    inputRef: addObjectInputRef,
                    multiple: true,
                    onSelect: (files) => {
                        if (!files?.length) return;
                        onAddObjectFiles?.(files);
                    },
                    onClear: firstAddedImage
                        ? () => onRemoveAddedObject?.(addedObjectImages[0]?.id)
                        : undefined,
                })}

                {addedObjectImages?.length > 1 ? (
                    <div className="edit-panel__asset-count">{addedObjectImages.length} assets selected</div>
                ) : null}

                <button
                    type="button"
                    className="edit-panel__asset-add-more"
                    onClick={() => addObjectInputRef.current?.click()}
                >
                    + Add More Assets
                </button>

                <div className="edit-panel__section">
                    <label htmlFor="asset-add-prompt">Placement Instructions (required)</label>
                    <textarea
                        id="asset-add-prompt"
                        placeholder="Example: place them naturally near the lower-right side."
                        rows={3}
                        value={addedObjectPrompt}
                        onChange={(event) => onAddedObjectPromptChange?.(event.target.value)}
                        required
                    />
                </div>

                {showOptimizeForPets ? (
                    <label className="edit-panel__checkbox">
                        <input
                            type="checkbox"
                            checked={optimizeForPets}
                            onChange={(event) => onOptimizeForPetsChange?.(event.target.checked)}
                        />
                        <span>Optimize For Pet Interaction</span>
                    </label>
                ) : null}
            </>
        );
    };

    const renderCropPanel = () => (
        <>
            <div className="edit-panel__crop-intro">
                <h3>Image Cropping</h3>
                <p>Select a preset or free form mode, adjust the crop on canvas, then apply.</p>
            </div>

            <div className="edit-panel__crop-scroll">
                {(cropPresetGroups || []).map((group) => (
                    <section className="edit-panel__crop-group" key={group.label}>
                        {group.label !== "Quick" ? <h4>{group.label}</h4> : null}
                        <div className="edit-panel__crop-grid">
                            {group.presets.map((preset) => {
                                const isActive = selectedCropPreset === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        className={`edit-panel__crop-preset${isActive ? " active" : ""}`}
                                        onClick={() => onCropPresetSelect?.(preset.id)}
                                    >
                                        <span>{preset.label}</span>
                                        <small>{preset.ratio || "Any"}</small>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </>
    );

    return (
        <aside className="edit-panel" aria-label={`${title} panel`}>
            <div className={`edit-panel__card${isCropTab ? " edit-panel__card--crop" : ""}`}>
                <header className="edit-panel__header">
                    <h2>
                        <img src={panelIcon} alt="" aria-hidden="true" />
                        <span>{title}</span>
                    </h2>
                    {/* <button type="button" className="edit-panel__close" aria-label="Close modify panel">
                        ×
                    </button> */}
                </header>

                <div className={`edit-panel__body${isCropTab ? " edit-panel__body--crop" : ""}`}>
                    {isTextTab
                        ? renderTextPanel()
                        : isEraseTab
                            ? renderErasePanel()
                            : isExpandTab
                                ? renderExpandPanel()
                                : isAssetTab
                                    ? renderAssetPanel()
                                    : isCropTab
                                        ? renderCropPanel()
                                        : renderModifyPanel()}
                </div>

                <footer className="edit-panel__footer">
                    {isCropTab ? (
                        <button
                            type="button"
                            className="edit-panel__crop-apply"
                            disabled={isApplyCropDisabled || isApplyingCrop}
                            onClick={onApplyCrop}
                        >
                            {isApplyingCrop ? "Applying..." : "Apply Crop"}
                        </button>
                    ) : (
                        <button type="button" disabled={isGenerateDisabled || isGenerating} onClick={onGenerate}>
                            {isGenerating ? (isExpandTab ? "Expanding..." : "Generating...") : isExpandTab ? "Expand" : isAssetTab ? "Add Object" : "Generate"}
                        </button>
                    )}
                </footer>
            </div>
        </aside>
    );
}
