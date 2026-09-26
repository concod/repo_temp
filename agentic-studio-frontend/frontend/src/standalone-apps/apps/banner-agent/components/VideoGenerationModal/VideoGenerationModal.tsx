import { useEffect, useState } from "react";
import { generateVideoFromImage } from "../../services/videoService";
import "./VideoGenerationModal.scss";

type VideoGenerationModalProps = {
    isOpen: boolean;
    imageUrl: string;
    onClose: () => void;
    onVideoGenerated: (videoUrl: string) => void;
};

export default function VideoGenerationModal({
    isOpen,
    imageUrl,
    onClose,
    onVideoGenerated,
}: VideoGenerationModalProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setPrompt("");
            setError(null);
            setIsGenerating(false);
        }
    }, [isOpen]);

    const handleConvert = async () => {
        if (!imageUrl || isGenerating) {
            return;
        }

        setIsGenerating(true);
        setError(null);

        const result = await generateVideoFromImage(imageUrl, prompt);

        if (result.success && result.videoUrl) {
            onVideoGenerated(result.videoUrl);
            onClose();
            return;
        }

        setError(result.error || "Unable to generate video.");
        setIsGenerating(false);
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="video-generation-modal" role="dialog" aria-modal="true" aria-label="Convert to video">
            <div className="video-generation-modal__card">
                <div className="video-generation-modal__header">
                    <h2>Convert to Video</h2>
                </div>

                <label htmlFor="video-prompt">Describe the motion you want (Optional)</label>
                <textarea
                    id="video-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ex: Subtle camera dolly-in and gentle breeze moving the trees"
                    disabled={isGenerating}
                />

                <p className="video-generation-modal__hint">Text in the image will remain static.</p>

                {error ? <p className="video-generation-modal__error">{error}</p> : null}

                <div className="video-generation-modal__actions">
                    <button type="button" className="video-generation-modal__button video-generation-modal__button--light" onClick={onClose} disabled={isGenerating}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="video-generation-modal__button video-generation-modal__button--gradient"
                        onClick={handleConvert}
                        disabled={isGenerating || !imageUrl}
                    >
                        {isGenerating ? "Converting..." : "Convert"}
                    </button>
                </div>
            </div>
        </div>
    );
}
