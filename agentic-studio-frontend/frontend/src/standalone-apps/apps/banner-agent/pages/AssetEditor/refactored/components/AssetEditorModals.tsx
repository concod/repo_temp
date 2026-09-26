import GenerationModal from "../../../../components/GenerationModal/GenerationModal.jsx";
import VideoGenerationModal from "../../../../components/VideoGenerationModal/VideoGenerationModal";
import VideoPlayerModal from "../../../../components/VideoPlayerModal/VideoPlayerModal";
import SaveProjectModal from "../../../../components/SaveProjectModal/SaveProjectModal";
import type { AssetEditorController } from "./types";

interface AssetEditorModalsProps {
    controller: AssetEditorController;
}

export function AssetEditorModals({ controller }: AssetEditorModalsProps) {
    const {
        generationModalOpen,
        setGenerationModalOpen,
        isGenerating,
        generationItems,
        imageHistory,
        setActiveFromHistoryIndex,
        commitHistoryImages,
        activeTool,
        downloadImage,
        handleAbortGeneration,
        isSaveModalOpen,
        isSavingAsset,
        isSaveProjectsLoading,
        saveProjectsError,
        saveError,
        setSaveError,
        saveProjectOptions,
        selectedProjectId,
        setSelectedProjectId,
        assetName,
        setAssetName,
        assetDescription,
        setAssetDescription,
        closeSaveModal,
        handleSaveVideoAsset,
        videoModalOpen,
        setVideoModalOpen,
        videoPlayerOpen,
        setVideoPlayerOpen,
        generatedVideoUrl,
        activeImageUrl,
        handleVideoGenerated,
        openSaveModal,
    } = controller;

    return (
        <>
            <GenerationModal
                isOpen={generationModalOpen}
                isGenerating={isGenerating}
                items={generationItems}
                canDownload={generationItems.some((item) => Boolean(item.imageUrl))}
                onUseImage={(imageUrl: string) => {
                    const existingIndex = imageHistory.findIndex((item) => item.imageUrl === imageUrl);
                    if (existingIndex >= 0) {
                        setActiveFromHistoryIndex(existingIndex);
                    } else {
                        commitHistoryImages([imageUrl], activeTool);
                    }
                    setGenerationModalOpen(false);
                }}
                onDownloadImage={(imageUrl: string, index: number) =>
                    void downloadImage(imageUrl, `banner-agent-variation-${index + 1}`)
                }
                onClose={() => setGenerationModalOpen(false)}
                onAbortGeneration={handleAbortGeneration}
            />

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
                onSubmit={handleSaveVideoAsset}
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
                subtitle="Choose a project and store this generated video as a new asset."
            />

            <VideoGenerationModal
                isOpen={videoModalOpen}
                imageUrl={activeImageUrl}
                onClose={() => setVideoModalOpen(false)}
                onVideoGenerated={handleVideoGenerated}
            />

            <VideoPlayerModal
                isOpen={videoPlayerOpen}
                videoUrl={generatedVideoUrl}
                onSave={openSaveModal}
                onClose={() => setVideoPlayerOpen(false)}
            />
        </>
    );
}
