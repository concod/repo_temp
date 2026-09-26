import {
    BG_REMOVAL_MAX_ATTEMPTS,
    BG_REMOVAL_RETRY_DELAY_MS,
} from "./advancedEditorConstants";
import type {
    CatalogueProductResult,
    CatalogueSearchResponse,
    CollageTemplate,
    ProcessProductResponse,
    TemplateConfig,
    UploadBannerResponse,
} from "./advancedEditorTypes";
import { toSmartEditorUrl } from "./advancedEditorUtils";
import { InteractionEvent, trackInteraction } from "../../../services/activityLogService";

let templatesCache: TemplateConfig | null = null;
let templatesRequest: Promise<TemplateConfig> | null = null;

const DEFAULT_BACKGROUND = { type: "transparent" as const, imageUrl: null as string | null, color: "#ffffff", gradientStart: "#ffffff", gradientEnd: "#000000", gradientAngle: 180 };
const DEFAULT_POSITIONING = { verticalAlignment: 50, horizontalAlignment: 50 };

function normalizeTemplateSettings(s: any): CollageTemplate["settings"] {
    const raw = s || {};
    return {
        background: { ...DEFAULT_BACKGROUND, ...(raw.background || {}) },
        positioning: { ...DEFAULT_POSITIONING, ...(raw.positioning || {}) },
        ...(raw.layout ? { layout: raw.layout } : {}),
        ...(raw.canvas ? { canvas: raw.canvas } : {}),
        ...(raw.canvasWidth ? { canvasWidth: raw.canvasWidth } : {}),
        ...(raw.canvasHeight ? { canvasHeight: raw.canvasHeight } : {}),
    };
}

function mapApiToTemplate(t: any): CollageTemplate {
    return {
        dbId: t.id,
        id: t.template_id,
        name: t.name,
        description: t.description ?? "",
        thumbnail: t.thumbnail ?? "/placeholder.svg",
        templateType: t.template_type ?? undefined,
        enableBehindTemplateLayering: t.enable_behind_template_layering ?? undefined,
        skipAIBackgroundRemoval: t.skip_ai_background_removal ?? undefined,
        defaultBrandingEnabled: t.default_branding_enabled ?? undefined,
        settings: normalizeTemplateSettings(t.settings),
    };
}

export const fetchImageBlobForProcessing = async (imageUrl: string): Promise<Blob> => {
    const candidateUrls = [
        imageUrl,
        toSmartEditorUrl(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`),
    ];

    let lastError: Error | null = null;

    for (const candidate of candidateUrls) {
        try {
            const response = await fetch(candidate);
            if (!response.ok) {
                lastError = new Error(`Image fetch failed (${response.status})`);
                continue;
            }

            const blob = await response.blob();
            if (!blob.size) {
                lastError = new Error("Empty image data returned");
                continue;
            }

            // Reject non-image responses (e.g. proxy returning HTML error page)
            if (blob.type && !blob.type.startsWith("image/")) {
                lastError = new Error(`Unexpected content type: ${blob.type}`);
                continue;
            }

            return blob;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error("Image fetch failed");
        }
    }

    throw lastError || new Error("Failed to load image for preprocessing");
};

export const removeImageBackground = (imageUrl: string): Promise<string> =>
    trackInteraction(
        InteractionEvent.ADV_EDITOR_BACKGROUND_REMOVAL,
        () => removeImageBackgroundInternal(imageUrl),
        { data: { source_url: imageUrl } }
    );

const removeImageBackgroundInternal = async (imageUrl: string): Promise<string> => {
    const blob = await fetchImageBlobForProcessing(imageUrl);

    // Derive a consistent extension and MIME type from the blob
    const mimeType = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
    const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const sourceFile = new File([blob], `advanced-editor-source.${extension}`, {
        type: mimeType,
    });

    const formData = new FormData();
    formData.append("image", sourceFile);

    const uploadResponse = await fetch(toSmartEditorUrl("/api/upload-banner-products"), {
        method: "POST",
        body: formData,
    });

    if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status})`);
    }

    const uploadData = (await uploadResponse.json()) as UploadBannerResponse;
    if (!uploadData?.url) {
        throw new Error("Upload response missing image url");
    }

    // Retry the processing step if the API doesn't return a bg-removed URL
    let lastProcessError: Error | null = null;
    for (let attempt = 0; attempt < BG_REMOVAL_MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, BG_REMOVAL_RETRY_DELAY_MS));
        }

        const processResponse = await fetch(toSmartEditorUrl("/api/process-product-images"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_urls: [uploadData.url] }),
        });

        if (!processResponse.ok) {
            lastProcessError = new Error(`Background removal failed (${processResponse.status})`);
            continue;
        }

        const processData = (await processResponse.json()) as ProcessProductResponse;
        const firstResult = processData?.results?.[0];
        const processedUrl = firstResult?.no_bg_url;

        if (processedUrl) {
            return toSmartEditorUrl(`/api/proxy-processed-image?url=${encodeURIComponent(processedUrl)}`);
        }

        lastProcessError = new Error("Background removal did not return a processed image");
    }

    // All attempts failed — fall back to the original upload URL so the editor
    // still has something to display, but log a warning for visibility.
    console.warn("Background removal: all attempts failed, using original image.", lastProcessError);
    return toSmartEditorUrl(`/api/proxy-processed-image?url=${encodeURIComponent(uploadData.url)}`);
};

export const uploadAndProcessDeviceImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const uploadResponse = await fetch(toSmartEditorUrl("/api/upload-banner-products"), {
        method: "POST",
        body: formData,
    });

    if (!uploadResponse.ok) {
        const bodyText = await uploadResponse.text().catch(() => "");
        const suffix = bodyText ? ` ${bodyText}` : "";
        throw new Error(`Upload failed (${uploadResponse.status}).${suffix}`);
    }

    const uploadData = (await uploadResponse.json()) as UploadBannerResponse;
    if (!uploadData?.url) {
        throw new Error("Upload response missing image url.");
    }

    const processResponse = await fetch(toSmartEditorUrl("/api/process-product-images"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_urls: [uploadData.url] }),
    });

    if (!processResponse.ok) {
        const bodyText = await processResponse.text().catch(() => "");
        const suffix = bodyText ? ` ${bodyText}` : "";
        throw new Error(`Processing failed (${processResponse.status}).${suffix}`);
    }

    const processData = (await processResponse.json()) as ProcessProductResponse;
    const firstResult = processData.results?.[0];
    const processedCandidateUrl = firstResult?.no_bg_url || firstResult?.path_url || uploadData.url;

    return toSmartEditorUrl(`/api/proxy-processed-image?url=${encodeURIComponent(processedCandidateUrl)}`);
};

export const searchCatalogueProducts = async (keyword: string): Promise<CatalogueProductResult[]> => {
    const response = await fetch(toSmartEditorUrl("/api/query-products"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
    });

    if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        const suffix = bodyText ? ` ${bodyText}` : "";
        throw new Error(`Search failed (${response.status}).${suffix}`);
    }

    const data = (await response.json()) as CatalogueSearchResponse;
    return Array.isArray(data.data) ? data.data : [];
};

export const getTemplatesData = async (): Promise<TemplateConfig> => {
    if (templatesCache) {
        return templatesCache;
    }

    if (!templatesRequest) {
        templatesRequest = fetch(toSmartEditorUrl("/api/banner_templates"))
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Unable to load templates (${response.status})`);
                }
                const data = await response.json();
                if (data.status !== "ok") {
                    throw new Error(data.error || "Failed to load templates");
                }
                const templates: CollageTemplate[] = (data.data as any[]).map(mapApiToTemplate);
                console.log("Templates loaded:", templates.length);
                return { templates } as TemplateConfig;
            })
            .then((config) => {
                templatesCache = config;
                return config;
            })
            .finally(() => {
                templatesRequest = null;
            });
    }

    return templatesRequest;
};
