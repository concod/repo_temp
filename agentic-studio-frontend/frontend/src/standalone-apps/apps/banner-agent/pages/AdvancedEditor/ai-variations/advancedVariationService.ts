import { getAdvancedVariationPrompt } from "./advancedVariationPrompts";
import { InteractionEvent, trackInteraction } from "../../../services/activityLogService";

const BANNER_AGENT_AI_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";
const IMAGE_MODEL = "gemini-3-pro-image";

const LETTERBOX_RATIOS = new Set(["8.1:1", "7.8:1", "10.8:1", "4.8:1", "8.35:1", "19.2:1", "3.84:1"]);
const STANDARD_RATIOS = new Set(["21:9", "16:9", "4:3", "3:2", "1:1", "9:16", "3:4", "2:3", "5:4", "4:5"]);

const CONTAINER_RATIOS = [
    { label: "21:9", ratio: 21 / 9 },
    { label: "16:9", ratio: 16 / 9 },
    { label: "4:3", ratio: 4 / 3 },
    { label: "3:2", ratio: 3 / 2 },
    { label: "9:16", ratio: 9 / 16 },
    { label: "3:4", ratio: 3 / 4 },
    { label: "2:3", ratio: 2 / 3 },
    { label: "5:4", ratio: 5 / 4 },
    { label: "4:5", ratio: 4 / 5 },
    { label: "1:1", ratio: 1 / 1 },
] as const;

type PlaceholderRect = { x: number; y: number; w: number; h: number };

type ContainerRatio = {
    label: string;
    ratio: number;
};

interface BlankCanvasResult {
    base64: string;
    rect: PlaceholderRect;
    canvasWidth: number;
    canvasHeight: number;
}

export interface AdvancedVariationDebug {
    blankCanvas: string;
    rawOutput: string;
    containerRatio: string;
}

export interface GenerateAdvancedVariationResult {
    imageUrl: string;
    debug: AdvancedVariationDebug;
}

interface GenerateAdvancedVariationParams {
    sourceImageBase64: string;
    targetRatioLabel: string;
    requestedApiRatio: string;
    targetWidth: number;
    targetHeight: number;
}

interface InlineImagePart {
    data: string;
    mimeType: string;
}

function isLikelyUrl(value: string): boolean {
    return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:") || value.startsWith("/");
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to convert image blob to data URL."));
        reader.readAsDataURL(blob);
    });
}

function parseDataUrl(dataUrl: string): InlineImagePart {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match?.[2]) {
        throw new Error("Invalid source image data URL.");
    }

    return {
        mimeType: match[1] || "image/png",
        data: match[2],
    };
}

async function normalizeInlineImagePart(sourceImage: string): Promise<InlineImagePart> {
    if (sourceImage.startsWith("data:")) {
        return parseDataUrl(sourceImage);
    }

    if (isLikelyUrl(sourceImage)) {
        const resolvedUrl = sourceImage.startsWith("/")
            ? `${window.location.origin}${sourceImage}`
            : sourceImage;

        const response = await fetch(resolvedUrl);
        if (!response.ok) {
            throw new Error(`Unable to fetch source image for AI variation (${response.status}).`);
        }

        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        const parsed = parseDataUrl(dataUrl);
        return {
            mimeType: blob.type || parsed.mimeType || "image/png",
            data: parsed.data,
        };
    }

    return {
        data: sourceImage,
        mimeType: "image/png",
    };
}

function getBannerAgentAiUrl(path: string): string {
    const base = BANNER_AGENT_AI_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

function getBestContainerRatio(width: number, height: number): ContainerRatio {
    const targetRatio = width / height;
    let best: ContainerRatio = CONTAINER_RATIOS[0];
    let maxEfficiency = -1;

    for (const candidate of CONTAINER_RATIOS) {
        const efficiency = Math.min(targetRatio, candidate.ratio) / Math.max(targetRatio, candidate.ratio);
        if (efficiency > maxEfficiency) {
            maxEfficiency = efficiency;
            best = candidate;
        }
    }

    return best;
}

async function generateBlankCanvasWithPlaceholder(
    targetWidth: number,
    targetHeight: number,
    container: ContainerRatio,
    targetRatioLabel: string
): Promise<BlankCanvasResult> {
    return new Promise((resolve) => {
        const CANVAS_BASE_SIZE = 1024;
        let canvasWidth = CANVAS_BASE_SIZE;
        let canvasHeight = CANVAS_BASE_SIZE;

        if (container.ratio >= 1) {
            canvasHeight = Math.round(CANVAS_BASE_SIZE / container.ratio);
        } else {
            canvasWidth = Math.round(CANVAS_BASE_SIZE * container.ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
            resolve({
                base64: "",
                rect: { x: 0, y: 0, w: 0, h: 0 },
                canvasWidth: 0,
                canvasHeight: 0,
            });
            return;
        }

        const isStandardRatio = STANDARD_RATIOS.has(targetRatioLabel);

        if (!isStandardRatio) {
            ctx.fillStyle = "#FF0000";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            ctx.strokeStyle = "#cc0000";
            ctx.lineWidth = 1;
            for (let x = 0; x < canvasWidth; x += 20) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvasHeight);
                ctx.stroke();
            }
            for (let y = 0; y < canvasHeight; y += 20) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvasWidth, y);
                ctx.stroke();
            }
        }

        const targetRatio = targetWidth / targetHeight;
        const blueAreaScale = isStandardRatio ? 1.0 : 0.85;

        let pw = 0;
        let ph = 0;
        let px = 0;
        let py = 0;

        if (targetRatio > container.ratio) {
            pw = canvasWidth * blueAreaScale;
            ph = pw / targetRatio;
            px = (canvasWidth - pw) / 2;
            py = (canvasHeight - ph) / 2;
        } else {
            ph = canvasHeight * blueAreaScale;
            pw = ph * targetRatio;
            px = (canvasWidth - pw) / 2;
            py = (canvasHeight - ph) / 2;
        }

        ctx.fillStyle = "#0000FF";
        ctx.fillRect(px, py, pw, ph);

        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.strokeRect(px, py, pw, ph);

        resolve({
            base64: canvas.toDataURL("image/png"),
            rect: { x: px, y: py, w: pw, h: ph },
            canvasWidth,
            canvasHeight,
        });
    });
}

async function cropPlaceholderToFinal(
    base64: string,
    placeholderRect: PlaceholderRect,
    originalCanvasWidth: number,
    originalCanvasHeight: number,
    targetWidth: number,
    targetHeight: number
): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(base64);
                return;
            }

            const scaleX = img.width / originalCanvasWidth;
            const scaleY = img.height / originalCanvasHeight;

            const inset = 0.5;
            const sx = placeholderRect.x * scaleX + inset;
            const sy = placeholderRect.y * scaleY + inset;
            let sw = placeholderRect.w * scaleX - inset * 2;
            let sh = placeholderRect.h * scaleY - inset * 2;

            const targetRatio = targetWidth / targetHeight;
            const croppedRatio = sw / sh;

            if (Math.abs(croppedRatio - targetRatio) > 0.001) {
                if (croppedRatio > targetRatio) {
                    sw = sh * targetRatio;
                } else {
                    sh = sw / targetRatio;
                }
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL("image/png"));
        };

        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

async function generateGradientLetterbox(base64: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(base64);
                return;
            }

            const imgRatio = img.width / img.height;
            const drawHeight = targetHeight;
            const drawWidth = targetHeight * imgRatio;
            const drawX = (targetWidth - drawWidth) / 2;

            const samplerCanvas = document.createElement("canvas");
            samplerCanvas.width = img.width;
            samplerCanvas.height = img.height;
            const samplerCtx = samplerCanvas.getContext("2d");

            if (!samplerCtx) {
                resolve(base64);
                return;
            }

            samplerCtx.drawImage(img, 0, 0);

            const getPixelColor = (x: number, y: number): string => {
                const safeX = Math.max(0, Math.min(img.width - 1, x));
                const safeY = Math.max(0, Math.min(img.height - 1, y));
                const pixel = samplerCtx.getImageData(safeX, safeY, 1, 1).data;
                return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
            };

            const leftColor = getPixelColor(0, Math.floor(img.height / 2));
            const rightColor = getPixelColor(img.width - 1, Math.floor(img.height / 2));
            const topColor = getPixelColor(Math.floor(img.width / 2), 0);
            const bottomColor = getPixelColor(Math.floor(img.width / 2), img.height - 1);

            const palette = [
                leftColor,
                rightColor,
                topColor,
                bottomColor,
                getPixelColor(Math.floor(img.width / 4), Math.floor(img.height / 4)),
                getPixelColor(Math.floor((img.width * 3) / 4), Math.floor((img.height * 3) / 4)),
            ];

            const blendWidth = 40;

            const drawDecorations = (x: number, y: number, width: number, height: number, color1: string, color2: string): void => {
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, y, width, height);
                ctx.clip();

                const gradient = Math.random() > 0.5
                    ? ctx.createLinearGradient(x, y, x + width, y + height)
                    : ctx.createLinearGradient(x + width, y, x, y + height);

                gradient.addColorStop(0, color1);
                gradient.addColorStop(1, color2);
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, width, height);

                const count = 10 + Math.floor(Math.random() * 10);
                for (let index = 0; index < count; index += 1) {
                    ctx.globalAlpha = 0.05 + Math.random() * 0.15;
                    const designColor = palette[Math.floor(Math.random() * palette.length)];
                    ctx.fillStyle = designColor;
                    ctx.strokeStyle = designColor;

                    const typeRoll = Math.random();
                    if (typeRoll < 0.4) {
                        const radius = Math.random() * (height / 1.5);
                        ctx.beginPath();
                        ctx.arc(x + Math.random() * width, y + Math.random() * height, radius, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (typeRoll < 0.7) {
                        ctx.lineWidth = 1 + Math.random() * 5;
                        ctx.beginPath();
                        const xStart = x + Math.random() * width;
                        ctx.moveTo(xStart, y - 50);
                        ctx.lineTo(xStart + (Math.random() - 0.5) * 300, y + height + 50);
                        ctx.stroke();
                    } else {
                        const size = Math.random() * (height / 2);
                        ctx.save();
                        ctx.translate(x + Math.random() * width, y + Math.random() * height);
                        ctx.rotate(Math.random() * Math.PI);
                        if (Math.random() > 0.5) {
                            ctx.fillRect(-size / 2, -size / 2, size, size);
                        } else {
                            ctx.lineWidth = size / 4;
                            ctx.strokeRect(-size / 2, -size / 2, size, size);
                        }
                        ctx.restore();
                    }
                }

                ctx.restore();
            };

            drawDecorations(0, 0, drawX + blendWidth, targetHeight, leftColor, topColor);
            drawDecorations(drawX + drawWidth - blendWidth, 0, targetWidth - (drawX + drawWidth) + blendWidth, targetHeight, rightColor, bottomColor);

            const offscreen = document.createElement("canvas");
            offscreen.width = drawWidth;
            offscreen.height = drawHeight;
            const offscreenCtx = offscreen.getContext("2d");

            if (offscreenCtx) {
                const inset = 2;
                offscreenCtx.drawImage(img, inset, inset, img.width - inset * 2, img.height - inset * 2, 0, 0, drawWidth, drawHeight);

                offscreenCtx.globalCompositeOperation = "destination-in";
                const maskGradient = offscreenCtx.createLinearGradient(0, 0, drawWidth, 0);
                const featherStop = Math.min(0.2, blendWidth / drawWidth);
                maskGradient.addColorStop(0, "rgba(0,0,0,0)");
                maskGradient.addColorStop(featherStop, "rgba(0,0,0,1)");
                maskGradient.addColorStop(1 - featherStop, "rgba(0,0,0,1)");
                maskGradient.addColorStop(1, "rgba(0,0,0,0)");
                offscreenCtx.fillStyle = maskGradient;
                offscreenCtx.fillRect(0, 0, drawWidth, drawHeight);

                ctx.drawImage(offscreen, drawX, 0);
            } else {
                ctx.drawImage(img, 2, 2, img.width - 4, img.height - 4, drawX, 0, drawWidth, drawHeight);
            }

            resolve(canvas.toDataURL("image/png"));
        };

        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

async function extractGeneratedImageDataUrl(payload: any): Promise<string | null> {
    const imagePart = payload?.candidates?.[0]?.content?.parts?.find((part: any) => part?.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
        return null;
    }

    const mimeType = imagePart.inlineData.mimeType || "image/png";
    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

export function generateAdvancedVariation(
    params: GenerateAdvancedVariationParams
): Promise<GenerateAdvancedVariationResult> {
    return trackInteraction(
        InteractionEvent.AI_VARIATION_GENERATE,
        () => generateAdvancedVariationInternal(params),
        {
            data: {
                target_ratio: params.targetRatioLabel,
                requested_api_ratio: params.requestedApiRatio,
                target_width: params.targetWidth,
                target_height: params.targetHeight,
            },
            resultData: (result) => ({ container_ratio: result.debug.containerRatio }),
        }
    );
}

async function generateAdvancedVariationInternal({
    sourceImageBase64,
    targetRatioLabel,
    requestedApiRatio: _requestedApiRatio,
    targetWidth,
    targetHeight,
}: GenerateAdvancedVariationParams): Promise<GenerateAdvancedVariationResult> {
    if (!targetWidth || !targetHeight) {
        throw new Error("Target dimensions are required.");
    }

    const isLetterboxRatio = LETTERBOX_RATIOS.has(targetRatioLabel);
    const bestContainer = isLetterboxRatio
        ? { label: "16:9", ratio: 16 / 9 }
        : getBestContainerRatio(targetWidth, targetHeight);

    const blankCanvas = await generateBlankCanvasWithPlaceholder(
        isLetterboxRatio ? 1600 : targetWidth,
        isLetterboxRatio ? 900 : targetHeight,
        bestContainer,
        targetRatioLabel
    );

    const sourcePart = await normalizeInlineImagePart(sourceImageBase64);
    const blankBase64Clean = blankCanvas.base64.split(",")[1] || blankCanvas.base64;
    const prompt = getAdvancedVariationPrompt(targetRatioLabel);

    const response = await fetch(getBannerAgentAiUrl("/api/ai/generate-content"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: IMAGE_MODEL,
            contents: {
                parts: [
                    { inlineData: { data: sourcePart.data, mimeType: sourcePart.mimeType } },
                    { inlineData: { data: blankBase64Clean, mimeType: "image/png" } },
                    { text: prompt },
                ],
            },
            config: {
                imageConfig: {
                    aspectRatio: bestContainer.label,
                    imageSize: "1K",
                },
            },
        }),
    });

    if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const message = errorPayload?.error || `Variation generation failed (${response.status})`;
        throw new Error(message);
    }

    const payload = await response.json();
    const rawImageUrl = await extractGeneratedImageDataUrl(payload);

    if (!rawImageUrl) {
        throw new Error("No image was returned from the model.");
    }

    const finalImageUrl = isLetterboxRatio
        ? await generateGradientLetterbox(rawImageUrl, targetWidth, targetHeight)
        : await cropPlaceholderToFinal(rawImageUrl, blankCanvas.rect, blankCanvas.canvasWidth, blankCanvas.canvasHeight, targetWidth, targetHeight);

    return {
        imageUrl: finalImageUrl,
        debug: {
            blankCanvas: blankCanvas.base64,
            rawOutput: rawImageUrl,
            containerRatio: bestContainer.label,
        },
    };
}

export async function resizeAndCropToExact(base64: string, targetWidth: number, targetHeight: number): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(base64);
                return;
            }

            const targetRatio = targetWidth / targetHeight;
            const sourceRatio = img.width / img.height;

            let sx = 0;
            let sy = 0;
            let sw = img.width;
            let sh = img.height;

            if (sourceRatio > targetRatio) {
                sh = img.height;
                sw = sh * targetRatio;
                sx = (img.width - sw) / 2;
            } else {
                sw = img.width;
                sh = sw / targetRatio;
                sy = (img.height - sh) / 2;
            }

            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL("image/png"));
        };

        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}
