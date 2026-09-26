import Topbar from "../../../../components/Topbar/Topbar.jsx";
import ToolSidebar from "../../../../components/ToolSidebar/ToolSidebar.jsx";
import EditPanel from "../../../../components/EditPanel/EditPanel.jsx";
import CanvasArea from "../../../../components/CanvasArea/CanvasArea.jsx";
import { CROP_PRESET_GROUPS } from "../assetEditorConstants";
import type { AssetEditorController } from "./types";
import { AssetEditorModals } from "./AssetEditorModals";

interface AssetEditorViewProps {
    controller: AssetEditorController;
}

export function AssetEditorView({ controller }: AssetEditorViewProps) {
    const {
        isCreateAdEnabledInAssetEditor,
        brandingSettings,
        setBrandingEnabled,
        activeTool,
        handleToolSelect,
        prompt,
        setPrompt,
        negativePrompt,
        setNegativePrompt,
        variations,
        setVariations,
        brushSize,
        setBrushSize,
        isGenerating,
        isGenerateDisabled,
        handleGenerate,
        activeImageUrl,
        originalImageUrl,
        imageHistory,
        activeHistoryIndex,
        setActiveFromHistoryIndex,
        canUndo,
        canRedo,
        handleUndo,
        handleRedo,
        isHistoryOpen,
        setIsHistoryOpen,
        textElements,
        removeExistingTexts,
        setRemoveExistingTexts,
        handleTextElementAdd,
        handleTextElementRemove,
        handleTextElementChange,
        addedObjectImages,
        handleAddObjectFiles,
        handleRemoveAddedObject,
        addedObjectPrompt,
        setAddedObjectPrompt,
        optimizeForPets,
        setOptimizeForPets,
        isPetOptimizationVisible,
        objectRemovalMask,
        setObjectRemovalMask,
        expandWidth,
        setExpandWidth,
        expandHeight,
        setExpandHeight,
        expandZoom,
        setExpandZoom,
        expandPosition,
        setExpandPosition,
        expandPreset,
        setExpandPreset,
        selectedCropPreset,
        handleCropPresetSelect,
        selectedCropPresetConfig,
        isCropOverlayVisible,
        cropSelection,
        setCropSelection,
        setCropPixelSelection,
        setCropImageElement,
        isApplyingCrop,
        isApplyCropDisabled,
        handleApplyCrop,
        cropToastVersion,
        downloadImage,
        handleCreateAd,
        handleOpenVideoModal,
    } = controller;

    return (
        <section className="asset-editor-page">
            <Topbar
                onCreateAd={handleCreateAd}
                onConvertToVideo={handleOpenVideoModal}
                canConvertToVideo={!!activeImageUrl && !isGenerating}
                canCreateAd={isCreateAdEnabledInAssetEditor}
                brandingEnabled={brandingSettings.enabled}
                onBrandingToggle={setBrandingEnabled}
            />

            <div className="asset-editor-page__content">
                <ToolSidebar activeItem={activeTool} onSelect={handleToolSelect} />
                <EditPanel
                    activeTool={activeTool}
                    prompt={prompt}
                    negativePrompt={negativePrompt}
                    variations={variations}
                    brushSize={brushSize}
                    onPromptChange={setPrompt}
                    onNegativePromptChange={setNegativePrompt}
                    onVariationsChange={setVariations}
                    onBrushSizeChange={setBrushSize}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                    isGenerateDisabled={isGenerateDisabled}
                    textElements={textElements}
                    removeExistingTexts={removeExistingTexts}
                    onTextElementAdd={handleTextElementAdd}
                    onTextElementRemove={handleTextElementRemove}
                    onTextElementChange={handleTextElementChange}
                    onRemoveExistingTextsChange={setRemoveExistingTexts}
                    expandWidth={expandWidth}
                    expandHeight={expandHeight}
                    expandZoom={expandZoom}
                    expandPreset={expandPreset}
                    onExpandWidthChange={(value: number) => {
                        setExpandWidth(value);
                        setExpandPreset(null);
                    }}
                    onExpandHeightChange={(value: number) => {
                        setExpandHeight(value);
                        setExpandPreset(null);
                    }}
                    onExpandZoomChange={setExpandZoom}
                    onExpandPresetSelect={(preset: string, width: number, height: number) => {
                        setExpandPreset(preset);
                        setExpandWidth(width);
                        setExpandHeight(height);
                    }}
                    addedObjectImages={addedObjectImages}
                    onAddObjectFiles={handleAddObjectFiles}
                    onRemoveAddedObject={handleRemoveAddedObject}
                    addedObjectPrompt={addedObjectPrompt}
                    onAddedObjectPromptChange={setAddedObjectPrompt}
                    optimizeForPets={optimizeForPets}
                    onOptimizeForPetsChange={setOptimizeForPets}
                    showOptimizeForPets={isPetOptimizationVisible}
                    cropPresetGroups={CROP_PRESET_GROUPS}
                    selectedCropPreset={selectedCropPreset}
                    onCropPresetSelect={handleCropPresetSelect}
                    onApplyCrop={handleApplyCrop}
                    isApplyingCrop={isApplyingCrop}
                    isApplyCropDisabled={isApplyCropDisabled || !isCropOverlayVisible}
                />
                <CanvasArea
                    activeTool={activeTool}
                    imageUrl={activeImageUrl}
                    onDownloadImage={() => {
                        void downloadImage(activeImageUrl, "banner-agent-current-edit");
                    }}
                    canDownload={Boolean(activeImageUrl)}
                    brandingSettings={brandingSettings}
                    isGenerating={isGenerating && (activeTool === "text" || activeTool === "erase" || activeTool === "expand")}
                    brushSize={brushSize}
                    onMaskChange={setObjectRemovalMask}
                    initialMaskDataUrl={objectRemovalMask}
                    expandWidth={expandWidth}
                    expandHeight={expandHeight}
                    expandZoom={expandZoom}
                    expandPosition={expandPosition}
                    onExpandPositionChange={setExpandPosition}
                    cropSelection={cropSelection}
                    onCropSelectionChange={setCropSelection}
                    onCropCompleteChange={setCropPixelSelection}
                    selectedCropPresetId={selectedCropPreset}
                    selectedCropPresetAspect={selectedCropPresetConfig.aspectRatio > 0 ? selectedCropPresetConfig.aspectRatio : undefined}
                    isCropOverlayVisible={isCropOverlayVisible}
                    onCropImageReady={setCropImageElement}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    isHistoryOpen={isHistoryOpen}
                    onHistoryToggle={() => setIsHistoryOpen((prev) => !prev)}
                    onHistoryClose={() => setIsHistoryOpen(false)}
                    historyItems={imageHistory}
                    originalImageUrl={originalImageUrl || null}
                    activeHistoryIndex={activeHistoryIndex}
                    onHistorySelect={setActiveFromHistoryIndex}
                    cropToastVersion={cropToastVersion}
                    onCropToastUndo={handleUndo}
                />
            </div>

            <AssetEditorModals controller={controller} />
        </section>
    );
}
