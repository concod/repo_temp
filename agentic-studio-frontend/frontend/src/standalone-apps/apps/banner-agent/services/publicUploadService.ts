export async function dataUrlToFile(dataUrl: string, filenameHint = "image"): Promise<File> {
    const [header, base64] = dataUrl.split(",");
    if (!header || !base64) {
        throw new Error("Invalid data URL.");
    }

    const mimeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeMatch?.[1] || "application/octet-stream";
    const extension = mimeType.split("/")[1] || "bin";

    const byteString = atob(base64);
    const bytes = new Uint8Array(byteString.length);
    for (let index = 0; index < byteString.length; index += 1) {
        bytes[index] = byteString.charCodeAt(index);
    }

    return new File([bytes], `${filenameHint}.${extension}`, { type: mimeType });
}

const BANNER_AGENT_AI_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";

function getBannerAgentAiUrl(path: string): string {
    const base = BANNER_AGENT_AI_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.readAsDataURL(file);
    });
}

async function blobUrlToFile(blobUrl: string, filenameHint = "image"): Promise<File> {
    const response = await fetch(blobUrl);
    if (!response.ok) {
        throw new Error(`Unable to read local blob image (${response.status}).`);
    }

    const blob = await response.blob();
    const mimeType = blob.type || "application/octet-stream";
    const extension = mimeType.split("/")[1] || "bin";
    return new File([blob], `${filenameHint}.${extension}`, { type: mimeType });
}

async function uploadDataUrlLocally(dataUrl: string, filenameHint = "image"): Promise<string> {
    const response = await fetch(getBannerAgentAiUrl("/api/upload-image"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataUrl, filenameHint }),
    });

    if (!response.ok) {
        throw new Error(`Image upload failed (${response.status}).`);
    }

    const payload = await response.json() as { url?: string };
    if (!payload.url) {
        throw new Error("Upload response did not include image URL.");
    }

    return payload.url;
}

export async function ensurePublicImageUrl(input: string | File): Promise<string> {
    if (typeof input !== "string") {
        const dataUrl = await fileToDataUrl(input);
        const fileName = input.name.replace(/\.[^.]+$/, "") || "image";
        return uploadDataUrlLocally(dataUrl, fileName);
    }

    if (input.startsWith("http://") || input.startsWith("https://") || input.startsWith("/uploads/")) {
        return input;
    }

    if (input.startsWith("data:")) {
        const file = await dataUrlToFile(input);
        const dataUrl = await fileToDataUrl(file);
        return uploadDataUrlLocally(dataUrl, "image");
    }

    if (input.startsWith("blob:")) {
        const file = await blobUrlToFile(input);
        const dataUrl = await fileToDataUrl(file);
        return uploadDataUrlLocally(dataUrl, "image");
    }

    throw new Error("Unsupported image format for video generation.");
}
