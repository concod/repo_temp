import type { BrandingBorderSettings } from "../../../store/brandingStore";
import { CROP_PRESET_GROUPS } from "./assetEditorConstants";
import type {
    BrandingRenderMetrics,
    CanvasSize,
    EditorToolKey,
    HistoryEntry,
    TextElement,
} from "./assetEditorTypes";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized[0] + normalized[0], 16),
            g: Number.parseInt(normalized[1] + normalized[1], 16),
            b: Number.parseInt(normalized[2] + normalized[2], 16),
        };
    }

    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized.slice(0, 2), 16),
            g: Number.parseInt(normalized.slice(2, 4), 16),
            b: Number.parseInt(normalized.slice(4, 6), 16),
        };
    }

    return null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
    const normalize = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
    return `#${normalize(r)}${normalize(g)}${normalize(b)}`;
};

export const getLuminance = (color: string): number => {
    const rgb = hexToRgb(color);
    if (!rgb) {
        return 255;
    }
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

export const getBestContrastColor = (backgroundColor: string): string =>
    getLuminance(backgroundColor) > 140 ? "#111827" : "#ffffff";

export const sampleEdgeColorFromImage = (imageUrl: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            const sampleWidth = 64;
            const sampleHeight = 64;
            canvas.width = sampleWidth;
            canvas.height = sampleHeight;

            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("Canvas context unavailable"));
                return;
            }

            context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
            let imageData: ImageData;
            try {
                imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
            } catch {
                reject(new Error("Image data unavailable"));
                return;
            }

            const data = imageData.data;
            let sumR = 0;
            let sumG = 0;
            let sumB = 0;
            let count = 0;

            const pushPixel = (x: number, y: number) => {
                const index = (y * sampleWidth + x) * 4;
                const alpha = data[index + 3];
                if (alpha === 0) {
                    return;
                }
                sumR += data[index];
                sumG += data[index + 1];
                sumB += data[index + 2];
                count += 1;
            };

            for (let x = 0; x < sampleWidth; x += 1) {
                pushPixel(x, 0);
                pushPixel(x, sampleHeight - 1);
            }
            for (let y = 1; y < sampleHeight - 1; y += 1) {
                pushPixel(0, y);
                pushPixel(sampleWidth - 1, y);
            }

            if (!count) {
                reject(new Error("No sample pixels"));
                return;
            }

            const averageHex = rgbToHex(sumR / count, sumG / count, sumB / count);
            resolve(getBestContrastColor(averageHex));
        };
        image.onerror = () => reject(new Error("Failed to load image"));
        image.src = imageUrl;
    });

export const recolorLightPixelsInLogo = (logoUrl: string, colorHex: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const context = canvas.getContext("2d");
            if (!context) {
                reject(new Error("Canvas context unavailable"));
                return;
            }
            context.drawImage(image, 0, 0);
            let imageData: ImageData;
            try {
                imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            } catch {
                reject(new Error("Image data unavailable"));
                return;
            }
            const rgb = hexToRgb(colorHex);
            if (!rgb) {
                reject(new Error("Invalid color"));
                return;
            }
            const data = imageData.data;
            for (let index = 0; index < data.length; index += 4) {
                const alpha = data[index + 3];
                if (alpha === 0) continue;
                const avg = (data[index] + data[index + 1] + data[index + 2]) / 3;
                if (avg > 190) {
                    data[index] = rgb.r;
                    data[index + 1] = rgb.g;
                    data[index + 2] = rgb.b;
                }
            }
            context.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("Failed to load logo"));
        image.src = logoUrl;
    });

export const getBrandingMetrics = (
    canvasSize: CanvasSize,
    settings: BrandingBorderSettings
): BrandingRenderMetrics => {
    const minDim = Math.max(1, Math.min(canvasSize.width, canvasSize.height));
    const strokeWidth = clamp(settings.weight, 1, minDim * 0.025);
    const distance = Math.max(strokeWidth / 2, Math.min(settings.distance, minDim * 0.1));
    const logoPadding = Math.min(12, Math.max(4, minDim * 0.03));
    const rawLogoSize = Math.max(16, settings.logoSize);

    const availableSpace = Math.max(0, minDim - (distance + logoPadding) * 2);
    const aspectRatio = canvasSize.width / Math.max(1, canvasSize.height);
    const heightConstraintRatio =
        aspectRatio > 7 ? 0.15 : aspectRatio > 3 ? 0.2 : aspectRatio > 1.5 ? 0.25 : 0.3;
    const heightConstraint = canvasSize.height * heightConstraintRatio;
    const widthConstraint = canvasSize.width * 0.08;
    const minLogoSize = Math.max(20, minDim * 0.03);

    const logoSize = Math.max(
        minLogoSize,
        Math.min(rawLogoSize, availableSpace * 0.35, heightConstraint, widthConstraint)
    );

    return {
        strokeWidth,
        distance,
        logoPadding,
        logoSize,
    };
};

export const getBrandingLogoPlacement = (
    canvasSize: CanvasSize,
    settings: BrandingBorderSettings,
    metrics: BrandingRenderMetrics
) => {
    const { distance, logoPadding, logoSize } = metrics;

    const left = distance + logoPadding + settings.logoOffsetX;
    const right = canvasSize.width - (distance + logoPadding - settings.logoOffsetX) - logoSize;
    const top = distance + logoPadding + settings.logoOffsetY;
    const bottom = canvasSize.height - (distance + logoPadding - settings.logoOffsetY) - logoSize;

    if (settings.logoPosition === "top-left") {
        return { x: left, y: top, size: logoSize };
    }
    if (settings.logoPosition === "top-right") {
        return { x: right, y: top, size: logoSize };
    }
    if (settings.logoPosition === "bottom-left") {
        return { x: left, y: bottom, size: logoSize };
    }

    return { x: right, y: bottom, size: logoSize };
};

export const loadImageFromBlob = (
    blob: Blob
): Promise<{ image: HTMLImageElement; objectUrl: string }> =>
    new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            resolve({ image, objectUrl });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to load image for download."));
        };

        image.src = objectUrl;
    });

export const findCropPreset = (id: string) => {
    for (const group of CROP_PRESET_GROUPS) {
        const preset = group.presets.find((item) => item.id === id);
        if (preset) {
            return preset;
        }
    }
    return CROP_PRESET_GROUPS[0].presets[0];
};

export const createTextElement = (): TextElement => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: "",
    prompt: "",
});

export const createHistoryEntry = (imageUrl: string, label: string): HistoryEntry => ({
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    imageUrl,
    label,
});

export const getHistoryLabel = (tool: EditorToolKey, variantIndex: number, total: number): string => {
    const baseLabelMap: Record<EditorToolKey, string> = {
        modify: "Modify",
        text: "Text",
        asset: "Asset",
        erase: "Erase",
        crop: "Crop",
        expand: "Expand",
    };
    const base = baseLabelMap[tool] || "Edit";
    if (total <= 1) {
        return base;
    }
    return `${base} ${variantIndex + 1}`;
};

export const toSafeString = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const getAssetCountLabel = (value?: number | string | null): string => {
    const parsed = typeof value === "number"
        ? value
        : typeof value === "string"
            ? Number.parseInt(value, 10)
            : 0;
    const count = Number.isFinite(parsed) ? parsed : 0;
    return `${count} ${count === 1 ? "asset" : "assets"}`;
};

export const loadVideoDimensions = (
    videoUrl: string
): Promise<{ width: number; height: number } | null> =>
    new Promise((resolve) => {
        if (!videoUrl) {
            resolve(null);
            return;
        }

        const video = document.createElement("video");
        video.preload = "metadata";
        video.crossOrigin = "anonymous";

        const cleanup = () => {
            video.removeAttribute("src");
            video.load();
        };

        video.onloadedmetadata = () => {
            resolve({
                width: video.videoWidth || 0,
                height: video.videoHeight || 0,
            });
            cleanup();
        };

        video.onerror = () => {
            resolve(null);
            cleanup();
        };

        video.src = videoUrl;
    });

export const isTypingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
};
