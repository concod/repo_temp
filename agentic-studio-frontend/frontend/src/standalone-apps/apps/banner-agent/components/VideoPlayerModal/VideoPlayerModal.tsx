import "./VideoPlayerModal.scss";

type VideoPlayerModalProps = {
    isOpen: boolean;
    videoUrl: string;
    onClose: () => void;
    onSave?: () => void;
};

export default function VideoPlayerModal({ isOpen, videoUrl, onClose, onSave }: VideoPlayerModalProps) {
    const handleDownload = async () => {
        if (!videoUrl) {
            return;
        }

        try {
            const response = await fetch(videoUrl, { credentials: "omit" });
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = blobUrl;
            anchor.download = `asset-editor-video-${Date.now()}.mp4`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        } catch {
            const anchor = document.createElement("a");
            anchor.href = videoUrl;
            anchor.target = "_blank";
            anchor.rel = "noopener";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="video-player-modal" role="dialog" aria-modal="true" aria-label="Generated video preview">
            <div className="video-player-modal__card">
                <div className="video-player-modal__header">
                    <h3>Generated Video</h3>
                    <div className="video-player-modal__actions">
                        {onSave ? (
                            <button type="button" onClick={onSave} disabled={!videoUrl}>Save to Project</button>
                        ) : null}
                        <button type="button" onClick={handleDownload}>Download</button>
                        <button type="button" onClick={onClose}>Close</button>
                    </div>
                </div>

                <div className="video-player-modal__content">
                    <video src={videoUrl} controls autoPlay playsInline className="video-player-modal__video" />
                </div>
            </div>
        </div>
    );
}
