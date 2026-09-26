import type { CSSProperties } from "react";
import type { BrandingBorderSettings } from "../../../store/brandingStore";
import {
    DEFAULT_BACKGROUND_SETTINGS,
    DEFAULT_TRANSPARENT_FILL,
    MAX_IMAGE_SCALE,
    MIN_IMAGE_SCALE,
    SESSION_PRODUCT_IMAGES_KEY,
    SMART_EDITOR_BASE_URL,
} from "./advancedEditorConstants";
import type {
    AdjustSettings,
    BackgroundScaleMode,
    CanvasSize,
    CatalogueProductResult,
    CollageBackgroundSettings,
    CollageTemplate,
    FilterPresetId,
    PinnedProductLayer,
    PatternType,
    ShadowSettings,
    TextOverlay,
    BrandingRenderMetrics,
} from "./advancedEditorTypes";

export const isDefaultNewTemplate = (template: CollageTemplate): boolean => {
    const name = (template.name ?? "").trim().toLowerCase();
    const description = (template.description ?? "").trim().toLowerCase();
    return name === "new template" && description === "add description here";
};

export const parseRatio = (ratio: string): number => {
    const [rw, rh] = ratio.split(":").map(Number);
    if (!Number.isFinite(rw) || !Number.isFinite(rh) || rh === 0) {
        return 1;
    }
    return rw / rh;
};

export const getSafeHttpUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
    } catch {
        return null;
    }

    return null;
};

export const getSessionProductImageUrls = (): string[] => {
    if (typeof window === "undefined") {
        return [];
    }

    const raw = window.sessionStorage.getItem(SESSION_PRODUCT_IMAGES_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        const deduped = new Set<string>();
        parsed.forEach((item) => {
            if (typeof item !== "string") {
                return;
            }

            const safe = getSafeHttpUrl(item);
            if (safe) {
                deduped.add(safe);
            }
        });

        return Array.from(deduped);
    } catch {
        return [];
    }
};

export const createPinnedProductLayerId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `pinned-${Date.now()}-${Math.round(Math.random() * 10000)}`;
};

export const buildInitialPinnedProductLayers = (imageUrls: string[], canvas: CanvasSize): PinnedProductLayer[] => {
    if (!imageUrls.length) {
        return [];
    }

    const columns = Math.min(3, imageUrls.length);
    const rows = Math.max(1, Math.ceil(imageUrls.length / columns));
    const layerWidth = clamp(canvas.width * 0.2, 120, 260);
    const layerHeight = layerWidth;
    const horizontalGap = clamp(canvas.width * 0.018, 12, 26);
    const verticalGap = clamp(canvas.height * 0.03, 14, 30);
    const totalWidth = columns * layerWidth + (columns - 1) * horizontalGap;
    const startX = (canvas.width - totalWidth) * 0.5;
    const bottomInset = clamp(canvas.height * 0.12, 70, 140);
    const startY = canvas.height - bottomInset - (rows - 1) * (layerHeight + verticalGap);

    return imageUrls.map((imageUrl, index) => {
        const row = Math.floor(index / columns);
        const column = index % columns;

        return {
            id: createPinnedProductLayerId(),
            imageUrl,
            x: startX + column * (layerWidth + horizontalGap) + layerWidth / 2,
            y: startY + row * (layerHeight + verticalGap),
            width: layerWidth,
            height: layerHeight,
            objectFit: "contain",
        };
    });
};

export const getAvailableResizeViewportSize = (): CanvasSize => {
    const viewportPadding = 128;
    const availableWidth = Math.max(280, Math.floor(window.innerWidth - 400 - viewportPadding));
    const availableHeight = Math.max(220, Math.floor(window.innerHeight - 200 - viewportPadding));

    return {
        width: availableWidth,
        height: availableHeight,
    };
};

export const getDisplaySizeForRatio = (ratio: string): CanvasSize => {
    const ratioValue = parseRatio(ratio);
    const available = getAvailableResizeViewportSize();

    if (available.width / ratioValue <= available.height) {
        const width = available.width;
        return {
            width,
            height: Math.max(100, Math.floor(width / ratioValue)),
        };
    }

    const height = available.height;
    return {
        width: Math.max(100, Math.floor(height * ratioValue)),
        height,
    };
};

export const areAdjustSettingsEqual = (left: AdjustSettings, right: AdjustSettings): boolean => {
    return (
        left.brightness === right.brightness &&
        left.contrast === right.contrast &&
        left.saturation === right.saturation &&
        left.hue === right.hue &&
        left.temperature === right.temperature &&
        left.highlights === right.highlights
    );
};

export const buildAdjustFilterCss = (settings: AdjustSettings): string => {
    const brightness = clamp(settings.brightness - 20, -100, 100);
    const contrast = clamp(settings.contrast - 20, -100, 100);
    const saturation = clamp(settings.saturation - 20, -100, 100);
    const hue = clamp((settings.hue - 20) * 2, -180, 180);
    const temperature = clamp(settings.temperature - 20, -100, 100);
    const highlights = clamp(settings.highlights - 20, -100, 100);

    const filters: string[] = [];

    if (brightness !== 0) {
        filters.push(`brightness(${100 + brightness}%)`);
    }

    if (contrast !== 0) {
        filters.push(`contrast(${100 + contrast}%)`);
    }

    if (saturation !== 0) {
        filters.push(`saturate(${100 + saturation}%)`);
    }

    if (hue !== 0) {
        filters.push(`hue-rotate(${hue}deg)`);
    }

    if (temperature !== 0) {
        filters.push(`sepia(${Math.abs(temperature) * 0.35}%)`);
        if (temperature > 0) {
            filters.push(`hue-rotate(${-temperature * 0.1}deg)`);
        } else {
            filters.push(`hue-rotate(${Math.abs(temperature) * 0.1}deg)`);
        }
    }

    if (highlights !== 0) {
        filters.push(`brightness(${100 + highlights * 0.35}%)`);
    }

    return filters.length > 0 ? filters.join(" ") : "none";
};

export const toSmartEditorUrl = (path: string): string => {
    const base = SMART_EDITOR_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
};

export const resolveTemplateAssetUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) {
        return url;
    }
    return toSmartEditorUrl(url);
};

export const loadImageSize = (imageUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = imageUrl;
    });
};

export const clamp = (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max);
};

export const toPositiveNumber = (value: unknown): number | null => {
    if (typeof value !== "number") {
        return null;
    }

    if (!Number.isFinite(value) || value <= 0) {
        return null;
    }

    return value;
};

export const getTemplateCanvasSizeFromApi = (template: CollageTemplate): CanvasSize | null => {
    const candidates: Array<{ width: unknown; height: unknown }> = [
        { width: template.canvasWidth, height: template.canvasHeight },
        { width: template.canvas?.width, height: template.canvas?.height },
        { width: template.settings.canvasWidth, height: template.settings.canvasHeight },
        { width: template.settings.canvas?.width, height: template.settings.canvas?.height },
    ];

    const rawTemplate = template as Record<string, unknown>;
    const rawSettings = (template.settings ?? {}) as Record<string, unknown>;
    const rootCanvas = rawTemplate.canvas as Record<string, unknown> | undefined;
    const settingsCanvas = rawSettings.canvas as Record<string, unknown> | undefined;

    candidates.push(
        { width: rawTemplate.width, height: rawTemplate.height },
        { width: rootCanvas?.width, height: rootCanvas?.height },
        { width: rawSettings.width, height: rawSettings.height },
        { width: settingsCanvas?.width, height: settingsCanvas?.height }
    );

    for (const candidate of candidates) {
        const width = toPositiveNumber(candidate.width);
        const height = toPositiveNumber(candidate.height);

        if (width && height) {
            return {
                width: Math.round(width),
                height: Math.round(height),
            };
        }
    }

    return null;
};

export const fitCanvasToViewport = (
    ratio: number,
    preferredWidth: number,
    preferredHeight: number
): CanvasSize => {
    const horizontalPadding = 300;
    const verticalPadding = 250;
    const availableWidth = window.innerWidth - horizontalPadding;
    const availableHeight = window.innerHeight - verticalPadding;

    const maxWidth = Math.max(400, Math.min(availableWidth, 1400));
    const maxHeight = Math.max(400, Math.min(availableHeight, 900));
    const minDimension = 400;

    let targetWidth: number;
    let targetHeight: number;

    if (ratio >= 1) {
        targetWidth = Math.min(maxWidth, preferredWidth);
        targetHeight = Math.round(targetWidth / ratio);

        if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = Math.round(targetHeight * ratio);
        }
    } else {
        targetHeight = Math.min(maxHeight, preferredHeight);
        targetWidth = Math.round(targetHeight * ratio);

        if (targetWidth > maxWidth) {
            targetWidth = maxWidth;
            targetHeight = Math.round(targetWidth / ratio);
        }
    }

    if (targetWidth < minDimension) {
        targetWidth = minDimension;
        targetHeight = Math.round(targetWidth / ratio);
    }

    if (targetHeight < minDimension) {
        targetHeight = minDimension;
        targetWidth = Math.round(targetHeight * ratio);
    }

    return {
        width: Math.round(targetWidth),
        height: Math.round(targetHeight),
    };
};

export const resizeDataUrlToTarget = (dataUrl: string, targetWidth: number, targetHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(dataUrl);
                return;
            }

            ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL("image/png", 1));
        };
        image.onerror = () => reject(new Error("Failed to resize exported variation"));
        image.src = dataUrl;
    });
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

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const normalized = hex.trim().replace(/^#/, "");

    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        const r = Number.parseInt(normalized[0] + normalized[0], 16);
        const g = Number.parseInt(normalized[1] + normalized[1], 16);
        const b = Number.parseInt(normalized[2] + normalized[2], 16);
        return { r, g, b };
    }

    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        const r = Number.parseInt(normalized.slice(0, 2), 16);
        const g = Number.parseInt(normalized.slice(2, 4), 16);
        const b = Number.parseInt(normalized.slice(4, 6), 16);
        return { r, g, b };
    }

    return null;
};

export const buildShadowFilterCss = (settings: ShadowSettings): string => {
    if (!settings.enabled) {
        return "none";
    }

    const angleRad = (settings.angle * Math.PI) / 180;
    const offsetX = Math.cos(angleRad) * settings.distance;
    const offsetY = Math.sin(angleRad) * settings.distance;
    const blur = Math.max(0, settings.blur);
    const alpha = clamp(settings.opacity, 0, 100) / 100;
    const rgb = hexToRgb(settings.color);

    if (!rgb) {
        return "none";
    }

    return `drop-shadow(${offsetX.toFixed(2)}px ${offsetY.toFixed(2)}px ${blur.toFixed(2)}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)}))`;
};

export const getPatternPreview = (pattern: PatternType, color = "rgba(47, 171, 98, 0.35)"): string => {
    switch (pattern) {
        case "dots":
            return `radial-gradient(circle, ${color} 2px, transparent 2px)`;
        case "grid":
            return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
        case "diagonal":
            return `repeating-linear-gradient(45deg, ${color}, ${color} 8px, transparent 8px, transparent 16px)`;
        case "waves":
            return `repeating-linear-gradient(0deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 12px)`;
        case "noise":
            return `radial-gradient(circle at 2px 2px, ${color} 1px, transparent 1px)`;
        default:
            return "none";
    }
};

export const buildBackgroundSettingsFromTemplate = (template: CollageTemplate | null): CollageBackgroundSettings => {
    if (!template) {
        return { ...DEFAULT_BACKGROUND_SETTINGS, transparentFill: { ...DEFAULT_TRANSPARENT_FILL } };
    }

    const background = template.settings.background;
    return {
        backgroundType: background.type,
        backgroundColor: background.color || DEFAULT_BACKGROUND_SETTINGS.backgroundColor,
        backgroundGradientStart: background.gradientStart || DEFAULT_BACKGROUND_SETTINGS.backgroundGradientStart,
        backgroundGradientEnd: background.gradientEnd || DEFAULT_BACKGROUND_SETTINGS.backgroundGradientEnd,
        backgroundGradientAngle: Number.isFinite(background.gradientAngle)
            ? background.gradientAngle
            : DEFAULT_BACKGROUND_SETTINGS.backgroundGradientAngle,
        backgroundImageUrl: resolveTemplateAssetUrl(background.imageUrl),
        backgroundScaleMode: "cover",
        transparentFill: { ...DEFAULT_TRANSPARENT_FILL },
    };
};

export const drawImageToRect = (
    ctx: CanvasRenderingContext2D,
    image: CanvasImageSource,
    destWidth: number,
    destHeight: number,
    scaleMode: BackgroundScaleMode
): void => {
    if (scaleMode === "fill") {
        ctx.drawImage(image, 0, 0, destWidth, destHeight);
        return;
    }

    const drawable = image as HTMLImageElement;
    const iw = drawable.naturalWidth || drawable.width;
    const ih = drawable.naturalHeight || drawable.height;
    if (!iw || !ih) {
        return;
    }

    const imageRatio = iw / ih;
    const canvasRatio = destWidth / destHeight;

    let drawWidth = destWidth;
    let drawHeight = destHeight;

    if (scaleMode === "contain") {
        if (imageRatio > canvasRatio) {
            drawWidth = destWidth;
            drawHeight = drawWidth / imageRatio;
        } else {
            drawHeight = destHeight;
            drawWidth = drawHeight * imageRatio;
        }
    } else {
        if (imageRatio > canvasRatio) {
            drawHeight = destHeight;
            drawWidth = drawHeight * imageRatio;
        } else {
            drawWidth = destWidth;
            drawHeight = drawWidth / imageRatio;
        }
    }

    const offsetX = (destWidth - drawWidth) / 2;
    const offsetY = (destHeight - drawHeight) / 2;
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
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

export const getBestContrastColor = (backgroundColor: string): string => {
    return getLuminance(backgroundColor) > 140 ? "#111827" : "#ffffff";
};

export const blendHexColors = (first: string, second: string, ratio = 0.5): string => {
    const one = hexToRgb(first);
    const two = hexToRgb(second);
    if (!one || !two) {
        return one ? first : second;
    }
    const normalizedRatio = clamp(ratio, 0, 1);
    return rgbToHex(
        one.r + (two.r - one.r) * normalizedRatio,
        one.g + (two.g - one.g) * normalizedRatio,
        one.b + (two.b - one.b) * normalizedRatio
    );
};

export const sampleEdgeColorFromImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
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
        image.onerror = () => reject(new Error("Failed to load background image"));
        image.src = imageUrl;
    });
};

export const recolorLightPixelsInLogo = (logoUrl: string, colorHex: string): Promise<string> => {
    return new Promise((resolve, reject) => {
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
                if (alpha === 0) {
                    continue;
                }
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
};

export const getBrandingMetrics = (canvasSize: CanvasSize, settings: BrandingBorderSettings): BrandingRenderMetrics => {
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

export const getBrandingLogoStyle = (
    settings: BrandingBorderSettings,
    metrics: BrandingRenderMetrics
): CSSProperties => {
    const { distance, logoPadding, logoSize } = metrics;

    const style: CSSProperties = {
        width: logoSize,
        height: logoSize,
    };

    if (settings.logoPosition === "top-left") {
        style.left = distance + logoPadding + settings.logoOffsetX;
        style.top = distance + logoPadding + settings.logoOffsetY;
    } else if (settings.logoPosition === "top-right") {
        style.right = distance + logoPadding - settings.logoOffsetX;
        style.top = distance + logoPadding + settings.logoOffsetY;
    } else if (settings.logoPosition === "bottom-left") {
        style.left = distance + logoPadding + settings.logoOffsetX;
        style.bottom = distance + logoPadding - settings.logoOffsetY;
    } else {
        style.right = distance + logoPadding - settings.logoOffsetX;
        style.bottom = distance + logoPadding - settings.logoOffsetY;
    }

    return style;
};

export const getTextOverlayById = (textOverlays: TextOverlay[], textId: string | null): TextOverlay | null => {
    if (!textId) {
        return null;
    }
    return textOverlays.find((overlay) => overlay.id === textId) ?? null;
};

export const cloneTextOverlays = (textOverlays: TextOverlay[]): TextOverlay[] => {
    return textOverlays.map((overlay) => ({ ...overlay }));
};

export const createTextOverlay = (size: CanvasSize, preset?: Partial<TextOverlay>): TextOverlay => {
    const generatedId = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `txt-${Date.now()}-${Math.round(Math.random() * 10000)}`;

    return {
        id: generatedId,
        text: "New text",
        fontFamily: "Arial",
        fontSize: 66,
        width: 240,
        color: "#000000",
        opacity: 100,
        x: clamp(size.width * 0.12, 24, Math.max(24, size.width - 200)),
        y: clamp(size.height * 0.2, 24, Math.max(24, size.height - 80)),
        bold: false,
        italic: false,
        underline: false,
        alignment: "left",
        ...preset,
    };
};

export const getCssFilterFromPreset = (preset: FilterPresetId, intensity: number): string => {
    if (!preset) {
        return "none";
    }

    const t = clamp(intensity, 0, 100) / 100;

    switch (preset) {
        case "grayscale":
            return `grayscale(${t})`;
        case "sepia":
            return `sepia(${t})`;
        case "vintage":
            return `sepia(${Math.min(1, 0.55 + t * 0.45)}) saturate(${Math.max(0.6, 1 - t * 0.25)}) contrast(${1 + t * 0.1})`;
        case "vivid":
            return `saturate(${1 + t * 1.1}) contrast(${1 + t * 0.2}) brightness(${1 + t * 0.06})`;
        case "cool":
            return `hue-rotate(${-10 * t}deg) saturate(${1 + t * 0.2}) brightness(${1 + t * 0.05})`;
        case "warm":
            return `sepia(${t * 0.35}) saturate(${1 + t * 0.3}) hue-rotate(${-8 * t}deg)`;
        case "dramatic":
            return `contrast(${1 + t * 0.65}) saturate(${1 + t * 0.45}) brightness(${1 - t * 0.08})`;
        case "fade":
            return `saturate(${1 - t * 0.4}) contrast(${1 - t * 0.18}) brightness(${1 + t * 0.15})`;
        default:
            return "none";
    }
};

export const getCatalogueProductIdentifier = (product: CatalogueProductResult): string => {
    return String(product.product_code ?? product.upc ?? product.product_name);
};

export const buildPlacementRect = (template: CollageTemplate | null, size: CanvasSize) => {
    if (!template) {
        const width = size.width * 0.36;
        const height = size.height * 0.7;
        return {
            x: (size.width - width) / 2,
            y: (size.height - height) / 2,
            width,
            height,
        };
    }

    const horizontalAlignment = template.settings.positioning.horizontalAlignment ?? 72;
    const verticalAlignment = template.settings.positioning.verticalAlignment ?? 52;
    const widthPct = template.settings.layout?.placementWidthPct ?? 42;
    const heightPct = template.settings.layout?.placementHeightPct ?? 74;

    const width = (size.width * widthPct) / 100;
    const height = (size.height * heightPct) / 100;
    const centerX = (size.width * horizontalAlignment) / 100;
    const centerY = (size.height * verticalAlignment) / 100;

    return {
        x: clamp(centerX - width / 2, 0, size.width - width),
        y: clamp(centerY - height / 2, 0, size.height - height),
        width,
        height,
    };
};

export const fitImageToPlacement = (
    template: CollageTemplate | null,
    size: CanvasSize,
    natural: { width: number; height: number }
) => {
    const safeWidth = Math.max(1, natural.width);
    const safeHeight = Math.max(1, natural.height);
    const placement = buildPlacementRect(template, size);
    const scaleToFit = Math.min(placement.width / safeWidth, placement.height / safeHeight);
    const scaleBoost = template?.settings.layout?.productScalePercent
        ? template.settings.layout.productScalePercent / 100
        : 1;

    return {
        x: placement.x + placement.width / 2,
        y: placement.y + placement.height / 2,
        scale: clamp(scaleToFit * scaleBoost, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE),
    };
};
