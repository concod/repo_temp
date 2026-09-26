import { useEffect, useMemo, useState } from "react";
import { toEditorPreviewUrl } from "../utils/imageUtils";

type PreviewPanelProps = {
    imageUrl: string;
    isOpen: boolean;
    onClose: () => void;
};

export default function PreviewPanel({ imageUrl, isOpen, onClose }: PreviewPanelProps) {
    const [isLoading, setIsLoading] = useState(false);

    const src = useMemo(() => {
        if (!isOpen || !imageUrl) return "";
        return toEditorPreviewUrl(imageUrl);
    }, [imageUrl, isOpen]);

    useEffect(() => {
        if (src) {
            setIsLoading(true);
        }
    }, [src]);

    return (
        <aside className={`ba-chatbot__preview ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
            <header className="ba-chatbot__preview-header">
                <h3>
                    <i className="fas fa-image" aria-hidden="true" />
                    Smart-Agent Studio&apos;s AI Editor
                </h3>
                <button type="button" aria-label="Close preview" onClick={onClose}>
                    <i className="fas fa-times" aria-hidden="true" />
                </button>
            </header>
            <div className="ba-chatbot__preview-frame-wrap">
                {isLoading ? (
                    <div className="ba-chatbot__preview-loader" aria-label="Loading preview">
                        <span />
                    </div>
                ) : null}
                <iframe
                    title="Generated banner preview"
                    loading="lazy"
                    src={src}
                    onLoad={() => setIsLoading(false)}
                    onError={() => setIsLoading(false)}
                />
            </div>
        </aside>
    );
}
