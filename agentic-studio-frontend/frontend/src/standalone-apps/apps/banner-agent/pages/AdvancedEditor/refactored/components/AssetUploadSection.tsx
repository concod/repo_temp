import { useRef } from "react";
import type { EditorController } from "./types";

interface AssetUploadSectionProps {
    controller: EditorController;
}

export function AssetUploadSection({ controller }: AssetUploadSectionProps) {
    const {
        isAssetUploadModalOpen,
        assetUploadItems,
        isAssetUploadProcessing,
        assetUploadProcessingMessage,
        assetUploadError,
        closeAssetUploadModal,
        handleAssetFilesSelected,
        removeAssetUploadItem,
        handleAssetUploadConfirm,
    } = controller;

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    if (!isAssetUploadModalOpen) {
        return null;
    }

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const hasItems = assetUploadItems.length > 0;

    return (
        <>
            <div
                className="advanced-editor-catalogue-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Upload assets from device"
            >
                <div className="advanced-editor-catalogue-modal__card">
                    <header className="advanced-editor-catalogue-modal__header">
                        <div>
                            <h3>Upload Assets from Device</h3>
                            <p>Select one or more images from your device and add them directly to canvas.</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeAssetUploadModal}
                            aria-label="Close asset upload"
                            disabled={isAssetUploadProcessing}
                        >
                            ×
                        </button>
                    </header>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(event) => {
                            handleAssetFilesSelected(event.target.files);
                            event.target.value = "";
                        }}
                    />

                    <button
                        type="button"
                        className="advanced-editor-asset-upload__dropzone"
                        onClick={openFilePicker}
                        disabled={isAssetUploadProcessing}
                    >
                        <span className="advanced-editor-asset-upload__dropzone-icon" aria-hidden="true">+</span>
                        <span>Click to select images</span>
                        <small>PNG, JPG or WEBP — you can pick multiple files</small>
                    </button>

                    <div className="advanced-editor-catalogue-modal__results">
                        {hasItems ? (
                            <div className="advanced-editor-asset-upload__grid">
                                {assetUploadItems.map((item) => (
                                    <article key={item.id} className="advanced-editor-asset-upload__item">
                                        <div className="advanced-editor-asset-upload__thumb">
                                            <img src={item.previewUrl} alt={item.file.name} loading="lazy" />
                                        </div>
                                        <button
                                            type="button"
                                            className="advanced-editor-asset-upload__remove"
                                            onClick={() => removeAssetUploadItem(item.id)}
                                            aria-label={`Remove ${item.file.name}`}
                                            disabled={isAssetUploadProcessing}
                                        >
                                            ×
                                        </button>
                                        <p title={item.file.name}>{item.file.name}</p>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="advanced-editor-catalogue-modal__state">
                                <p>
                                    {assetUploadError
                                        ? assetUploadError
                                        : "No assets selected yet. Choose images from your device to get started."}
                                </p>
                            </div>
                        )}
                    </div>

                    {hasItems && assetUploadError && (
                        <p className="advanced-editor-asset-upload__error">{assetUploadError}</p>
                    )}

                    <footer className="advanced-editor-asset-upload__footer">
                        <button
                            type="button"
                            className="advanced-editor-asset-upload__secondary"
                            onClick={openFilePicker}
                            disabled={isAssetUploadProcessing}
                        >
                            Add more
                        </button>
                        <button
                            type="button"
                            className="advanced-editor-asset-upload__confirm"
                            onClick={() => {
                                void handleAssetUploadConfirm();
                            }}
                            disabled={!hasItems || isAssetUploadProcessing}
                        >
                            {isAssetUploadProcessing
                                ? "Adding..."
                                : `Add ${assetUploadItems.length} to canvas`}
                        </button>
                    </footer>
                </div>
            </div>

            {isAssetUploadProcessing && (
                <div className="advanced-editor-catalogue-processing" role="status" aria-live="polite">
                    <div className="advanced-editor-catalogue-processing__card">
                        <div className="advanced-editor-catalogue-modal__spinner" aria-hidden="true" />
                        <h3>Processing, Please Wait...</h3>
                        <p>{assetUploadProcessingMessage || "Uploading your selected assets..."}</p>
                    </div>
                </div>
            )}
        </>
    );
}
