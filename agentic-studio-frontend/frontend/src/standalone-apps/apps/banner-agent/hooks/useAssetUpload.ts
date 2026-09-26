import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensurePublicImageUrl } from "../services/publicUploadService";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const ACCEPT_STRING = ".png,.jpg,.jpeg,.webp";

type UploadState = "idle" | "uploading" | "error";

type UseAssetUploadReturn = {
    uploadState: UploadState;
    error: string | null;
    triggerUpload: () => void;
};

export function useAssetUpload(): UseAssetUploadReturn {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>("idle");
    const [error, setError] = useState<string | null>(null);

    const handleFileSelected = useCallback(
        async (file: File) => {
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                setError("Unsupported format. Please upload a PNG, JPG, or WebP image.");
                setUploadState("error");
                return;
            }

            setUploadState("uploading");
            setError(null);

            try {
                const publicUrl = await ensurePublicImageUrl(file);
                const params = new URLSearchParams();
                params.set("img", publicUrl);

                const currentParams = new URLSearchParams(window.location.search);
                const sessionId = (currentParams.get("session_id") ?? "").trim();
                if (sessionId) {
                    params.set("session_id", sessionId);
                }

                navigate(`../asset-editor?${params.toString()}`, { relative: "path" });
                setUploadState("idle");
            } catch (err) {
                const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
                setError(message);
                setUploadState("error");
            }
        },
        [navigate],
    );

    const triggerUpload = useCallback(() => {
        // Clean up previous input if exists
        if (inputRef.current) {
            inputRef.current.remove();
            inputRef.current = null;
        }

        const input = document.createElement("input");
        input.type = "file";
        input.accept = ACCEPT_STRING;
        input.multiple = false;
        input.style.display = "none";

        input.addEventListener("change", () => {
            const file = input.files?.[0];
            if (file) {
                handleFileSelected(file);
            }
            input.remove();
            inputRef.current = null;
        });

        // Handle cancel (no file picked)
        input.addEventListener("cancel", () => {
            input.remove();
            inputRef.current = null;
        });

        document.body.appendChild(input);
        inputRef.current = input;
        input.click();
    }, [handleFileSelected]);

    return { uploadState, error, triggerUpload };
}
