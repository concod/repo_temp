import SaveProjectModal from "../../../../components/SaveProjectModal/SaveProjectModal";
import { ImageEraserModal } from "../../ImageEraserModal";
import { VariationsModal } from "../../ai-variations/VariationsModal";
import type { EditorController } from "./types";

interface EditorModalsProps {
    controller: EditorController;
}

export function EditorModals({ controller }: EditorModalsProps) {
    const {
        isSaveModalOpen,
        isSavingAsset,
        isSaveProjectsLoading,
        saveProjectsError,
        saveError,
        saveProjectOptions,
        selectedProjectId,
        assetName,
        assetDescription,
        closeSaveModal,
        handleSaveAsset,
        setSelectedProjectId,
        setSaveError,
        setAssetName,
        setAssetDescription,
        isImageEraserModalOpen,
        activeSourceImageUrl,
        baseSourceImageUrl,
        brushSize,
        setBrushSize,
        setIsImageEraserModalOpen,
        handleSaveImageEraser,
        isVariationsModalOpen,
        setIsVariationsModalOpen,
        exportCanvasForVariations,
        captureSmartLayoutSnapshot,
        applySmartLayoutForRatio,
        restoreSmartLayoutSnapshot,
        beginHeroAdjustForVariation,
    } = controller;

    return (
        <>
            <SaveProjectModal
                isOpen={isSaveModalOpen}
                isSaving={isSavingAsset}
                isLoadingProjects={isSaveProjectsLoading}
                projectsError={saveProjectsError}
                saveError={saveError}
                projects={saveProjectOptions}
                selectedProjectId={selectedProjectId}
                assetName={assetName}
                assetDescription={assetDescription}
                onClose={closeSaveModal}
                onSubmit={handleSaveAsset}
                onProjectSelect={(projectId: string) => {
                    if (!projectId) return;
                    setSelectedProjectId(projectId);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                onAssetNameChange={(value: string) => {
                    setAssetName(value);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                onAssetDescriptionChange={(value: string) => {
                    setAssetDescription(value);
                    if (saveError) {
                        setSaveError("");
                    }
                }}
                title="Save to Project"
                subtitle="Choose a project and store this edited canvas as a new asset."
            />

            <ImageEraserModal
                isOpen={isImageEraserModalOpen}
                imageUrl={activeSourceImageUrl ?? baseSourceImageUrl}
                imageName="Product image"
                brushSize={brushSize}
                onBrushSizeChange={setBrushSize}
                onClose={() => setIsImageEraserModalOpen(false)}
                onSave={handleSaveImageEraser}
            />

            <VariationsModal
                isOpen={isVariationsModalOpen}
                onClose={() => setIsVariationsModalOpen(false)}
                sourceImage={activeSourceImageUrl}
                onExportCanvas={exportCanvasForVariations}
                captureSnapshot={captureSmartLayoutSnapshot}
                applySmartLayout={applySmartLayoutForRatio}
                restoreSnapshot={restoreSmartLayoutSnapshot}
                onEditSmartVariation={beginHeroAdjustForVariation}
            />
        </>
    );
}
