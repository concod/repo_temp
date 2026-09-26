import { useEffect, useMemo, useState } from "react";
import "./GenerationModal.scss";
import chatDog from "../../assets/chat-dog.svg";
import deleteIcon from "../../assets/asset-editor-icons/delete.svg";

export default function GenerationModal({
    isOpen,
    isGenerating,
    items,
    onUseImage,
    onDownloadImage,
    onClose,
    onAbortGeneration,
    canDownload = true,
}) {
    const [confirmType, setConfirmType] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const hasResults = useMemo(
        () => items.some((item) => Boolean(item.imageUrl)),
        [items]
    );

    useEffect(() => {
        if (!isOpen) {
            setConfirmType(null);
            setPreviewUrl(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!previewUrl) {
            return undefined;
        }

        const handleKeydown = (event) => {
            if (event.key === "Escape") {
                setPreviewUrl(null);
            }
        };

        document.addEventListener("keydown", handleKeydown);
        return () => {
            document.removeEventListener("keydown", handleKeydown);
        };
    }, [previewUrl]);

    if (!isOpen) {
        return null;
    }

    const handleCloseIntent = () => {
        if (isGenerating) {
            setConfirmType("abort");
            return;
        }

        if (hasResults) {
            setConfirmType("discard");
            return;
        }

        onClose?.();
    };

    const handleAbortConfirm = () => {
        setConfirmType(null);
        onAbortGeneration?.();
    };

    const handleDiscardConfirm = () => {
        setConfirmType(null);
        onClose?.();
    };

    return (
        <div className="generation-modal" role="dialog" aria-modal="true" aria-label="Generating images">
            <div className="generation-modal__backdrop" />

            <div className="generation-modal__content">
                <header className="generation-modal__header">
                    <h3>
                        <img src={chatDog} alt="" aria-hidden="true" />
                        Generating Images
                    </h3>
                </header>

                <div className="generation-modal__grid">
                    {items.map((item, index) => (
                        <article className="generation-modal__card" key={index}>
                            {item.imageUrl ? (
                                <>
                                    <img src={item.imageUrl} alt={`Generated variation ${index + 1}`} />
                                    <div className="generation-modal__overlay">
                                        <span className="generation-modal__badge">Variation {index + 1}</span>
                                        <div className="generation-modal__actions">
                                            <button
                                                type="button"
                                                className="preview"
                                                onClick={() => setPreviewUrl(item.imageUrl)}
                                                aria-label={`Preview variation ${index + 1}`}
                                                title="Preview"
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="download"
                                                onClick={() => onDownloadImage?.(item.imageUrl, index)}
                                                aria-label={`Download variation ${index + 1}`}
                                                disabled={!canDownload}
                                                title={canDownload ? "Download" : "Download unavailable"}
                                            >
                                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                                    <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className="edit"
                                                onClick={() => onUseImage?.(item.imageUrl)}
                                                aria-label={`Edit variation ${index + 1}`}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="generation-modal__placeholder" aria-label={`Generating variation ${index + 1}`}>
                                    <div className="generation-modal__placeholder-content" role="status" aria-live="polite">
                                        <span className="generation-modal__spinner" aria-hidden="true" />
                                        <span>Generating...</span>
                                    </div>
                                </div>
                            )}
                        </article>
                    ))}
                </div>

                <footer className="generation-modal__footer">
                    <button type="button" onClick={handleCloseIntent}>
                        {isGenerating ? "Cancel" : "Close"}
                    </button>
                </footer>
            </div>

            {previewUrl ? (
                <div
                    className="generation-modal__preview"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Image preview"
                    onClick={() => setPreviewUrl(null)}
                >
                    <button
                        type="button"
                        className="generation-modal__preview-close"
                        onClick={() => setPreviewUrl(null)}
                        aria-label="Close preview"
                    >
                        ×
                    </button>
                    <img
                        src={previewUrl}
                        alt="Generated variation preview"
                        onClick={(event) => event.stopPropagation()}
                    />
                </div>
            ) : null}

            {confirmType ? (
                <div className="generation-modal__confirm" role="dialog" aria-modal="true" aria-label="Generation cancellation confirmation">
                    <div className="generation-modal__confirm-card">
                        <div className="generation-modal__confirm-icon" aria-hidden="true">
                            <img src={deleteIcon} alt="" />
                        </div>

                        {confirmType === "abort" ? (
                            <>
                                <h4>Abort Asset Creation?</h4>
                                <p>You are about to cancel the assets that is being created</p>
                                <div className="generation-modal__confirm-actions">
                                    <button type="button" className="danger" onClick={handleAbortConfirm}>Abort</button>
                                    <button type="button" className="ghost" onClick={() => setConfirmType(null)}>Cancel</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h4>You will lose the created Assets</h4>
                                <p>You are about to lose the assets that is created if not saved manually</p>
                                <div className="generation-modal__confirm-actions">
                                    <button type="button" className="danger" onClick={handleDiscardConfirm}>Confirm</button>
                                    <button type="button" className="ghost" onClick={() => setConfirmType(null)}>Cancel</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
