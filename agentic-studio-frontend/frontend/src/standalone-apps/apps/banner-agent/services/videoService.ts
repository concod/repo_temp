import { ensurePublicImageUrl } from "./publicUploadService";

const BANNER_AGENT_AI_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";

function getBannerAgentAiUrl(path: string): string {
    const base = BANNER_AGENT_AI_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

export const DEFAULT_VIDEO_PROMPT = "Animate this image into a realistic video, keeping the aspect ratio unchanged. Ensure all text remains static while only the non-text elements are brought to life.";

export type GenerateVideoResult = {
    success: boolean;
    videoUrl?: string;
    error?: string;
};

function getVideoUrlFromPayload(payload: any): string | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    if (typeof payload.video_url === "string" && payload.video_url) {
        return payload.video_url;
    }

    if (typeof payload.videoUrl === "string" && payload.videoUrl) {
        return payload.videoUrl;
    }

    if (payload.data && typeof payload.data.video_url === "string" && payload.data.video_url) {
        return payload.data.video_url;
    }

    return null;
}

export async function generateVideoFromImage(imageInput: string | File, prompt?: string): Promise<GenerateVideoResult> {
    try {
        const imagePath = await ensurePublicImageUrl(imageInput);

        const response = await fetch(getBannerAgentAiUrl("/api/img-to-video"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: prompt?.trim() || DEFAULT_VIDEO_PROMPT,
                image_path: imagePath,
            }),
        });

        if (!response.ok) {
            const reason = await response.text();
            return {
                success: false,
                error: reason || `Video generation failed (${response.status}).`,
            };
        }

        const payload = await response.json();
        const videoUrl = getVideoUrlFromPayload(payload);

        if (!videoUrl) {
            return {
                success: false,
                error: "Video generation succeeded but no video URL was returned.",
            };
        }

        return {
            success: true,
            videoUrl,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate video.",
        };
    }
}
