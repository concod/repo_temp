import { useMemo, useState } from "react";
import { fetchImageAsBlob, upscaleImage } from "../../services/topazUpscaleService";
import "./DownloadOptionsModal.scss";

type DownloadOptionsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    filename?: string;
};

export default function DownloadOptionsModal({
    isOpen,
    onClose,
    imageUrl,
    filename = "banner-agent-image",
}: DownloadOptionsModalProps) {
    const [isUpscaling, setIsUpscaling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState("");

    const canDownload = useMemo(() => Boolean(imageUrl), [imageUrl]);

    if (!isOpen) {
        return null;
    }

    const triggerBlobDownload = (blob: Blob, nextFilename: string) => {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = nextFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 150);
    };

    const handleNormalDownload = async () => {
        if (!canDownload) return;

        try {
            setError(null);
            setProgress("Preparing your download...");
            const blob = await fetchImageAsBlob(imageUrl);
            triggerBlobDownload(blob, `${filename}-${Date.now()}.png`);
            setProgress("");
            onClose();
        } catch {
            setProgress("");
            setError("Failed to download image. Please try again.");
        }
    };

    const handleEnhancedDownload = async () => {
        if (!canDownload || isUpscaling) return;

        try {
            setError(null);
            setIsUpscaling(true);
            setProgress("Loading image for enhancement...");
            const blob = await fetchImageAsBlob(imageUrl);
            setProgress("Enhancing with AI (2x upscale)...");
            const enhancedBlob = await upscaleImage(blob);
            setProgress("Preparing enhanced download...");
            triggerBlobDownload(enhancedBlob, `${filename}-enhanced-${Date.now()}.png`);
            setProgress("");
            onClose();
        } catch {
            setProgress("");
            setError("Failed to enhance image. Please try normal download or try again later.");
        } finally {
            setIsUpscaling(false);
        }
    };

    return (
        <div className="ba-download-modal" role="dialog" aria-modal="true" aria-label="Download options">
            <div className="ba-download-modal__backdrop" onClick={!isUpscaling ? onClose : undefined} />

            <div className="ba-download-modal__content">
                <header className="ba-download-modal__header">
                    <h3>Download Options</h3>
                    <button type="button" onClick={onClose} disabled={isUpscaling} aria-label="Close download options">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </button>
                </header>

                {error ? <p className="ba-download-modal__error">{error}</p> : null}
                {progress ? <p className="ba-download-modal__progress">{progress}</p> : null}

                <div className="ba-download-modal__preview">
                    {imageUrl ? <img src={imageUrl} alt="Download preview" /> : <div className="ba-download-modal__preview-empty" />}
                </div>

                <div className="ba-download-modal__actions">
                    <button type="button" onClick={handleNormalDownload} disabled={!canDownload || isUpscaling}>
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Normal Download</span>
                    </button>

                    <button
                        type="button"
                        className="enhanced"
                        onClick={handleEnhancedDownload}
                        disabled={!canDownload || isUpscaling}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M13 3L4 14h7v7l9-11h-7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{isUpscaling ? "Enhancing..." : "Enhanced Download"}</span>
                        {!isUpscaling ? <em>AI Upscaled</em> : null}
                    </button>
                </div>
            </div>
        </div>
    );
}