import { InteractionEvent, trackInteraction } from "./activityLogService";

export interface EditImageOptions {
    prompt?: string;
    negativePrompt?: string;
    preserveMaxDetail?: boolean;
    objectRemovalMask?: string | null;
    addedObjectImages?: File[];
    addedObjectPrompt?: string;
    newProductImage?: File | null;
    replacementPrompt?: string;
    optimizeForPets?: boolean;
    preserveExistingToys?: boolean;
    customTexts?: Array<{
        content: string;
        prompt?: string;
    }>;
    removeAllText?: boolean;
}

export interface ExpandImageOptions {
    targetWidth: number;
    targetHeight: number;
    zoom: number;
    position: { x: number; y: number };
}

export interface GenerateEditedImageResult {
    finalImageUrl: string;
    finalPrompt: string;
    duration: number;
}

type InlinePart = {
    inlineData: {
        mimeType: string;
        data: string;
    };
};

type ImageFile = {
    base64: string;
    mimeType: string;
    width: number;
    height: number;
    dataUrl: string;
};

const BANNER_AGENT_AI_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";

function getBannerAgentAiUrl(path: string): string {
    const base = BANNER_AGENT_AI_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

function dataUrlToPart(dataUrl: string): InlinePart {
    const [meta, data] = dataUrl.split(",");
    const mimeMatch = meta?.match(/data:(.*?);base64/);
    if (!data || !mimeMatch?.[1]) {
        throw new Error("Invalid mask image format.");
    }

    return {
        inlineData: {
            mimeType: mimeMatch[1],
            data,
        },
    };
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    const objectUrl = URL.createObjectURL(file);

    try {
        return await new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({ width: image.width, height: image.height });
            image.onerror = () => reject(new Error("Failed to read source image dimensions."));
            image.src = objectUrl;
        });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

async function fileToPart(file: File): Promise<InlinePart> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read source image file."));
        reader.readAsDataURL(file);
    });

    const [meta, data] = dataUrl.split(",");
    const mimeMatch = meta?.match(/data:(.*?);base64/);
    if (!data || !mimeMatch?.[1]) {
        throw new Error("Invalid source image format.");
    }

    return {
        inlineData: {
            mimeType: mimeMatch[1],
            data,
        },
    };
}

function inlineDataToDataUrl(part: any): string {
    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

// Resizes the source image while preserving aspect ratio, fitting within maxDimension.
// This mirrors the reference flow: the source image is downscaled to MAX_DIMENSION
// while added objects are kept at native size. Sending a full-resolution source can
// cause the model to ignore the (relatively tiny) added-object parts.
async function resizeImagePreserveAspectRatio(file: File, maxDimension: number, preserveMaxDetail = false): Promise<File> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read source image file."));
        reader.readAsDataURL(file);
    });

    return await new Promise<File>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const aspectRatio = image.width / image.height;

            // Already within bounds: no need to resize.
            if (image.width <= maxDimension && image.height <= maxDimension) {
                resolve(file);
                return;
            }

            let newWidth: number;
            let newHeight: number;
            if (image.width > image.height) {
                newWidth = Math.min(image.width, maxDimension);
                newHeight = newWidth / aspectRatio;
            } else {
                newHeight = Math.min(image.height, maxDimension);
                newWidth = newHeight * aspectRatio;
            }

            const canvas = document.createElement("canvas");
            canvas.width = Math.round(newWidth);
            canvas.height = Math.round(newHeight);

            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
            if (!context) {
                reject(new Error("Could not get canvas context for source resize."));
                return;
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            const mimeType = preserveMaxDetail ? "image/png" : "image/jpeg";
            const quality = preserveMaxDetail ? undefined : 0.99;

            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error("Canvas to Blob conversion failed during source resize."));
                    return;
                }
                resolve(new File([blob], file.name, { type: mimeType, lastModified: Date.now() }));
            }, mimeType, quality);
        };
        image.onerror = () => reject(new Error("Failed to load source image for resize."));
        image.src = dataUrl;
    });
}

async function dataUrlToImageFile(dataUrl: string): Promise<ImageFile> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const [meta, base64] = dataUrl.split(",");
            const mimeMatch = meta?.match(/data:(.*?);base64/);
            if (!base64 || !mimeMatch?.[1]) {
                reject(new Error("Invalid image data URL."));
                return;
            }

            resolve({
                base64,
                mimeType: mimeMatch[1],
                width: image.naturalWidth,
                height: image.naturalHeight,
                dataUrl,
            });
        };
        image.onerror = () => reject(new Error("Failed to decode image."));
        image.src = dataUrl;
    });
}

function calculateScaledDimensions(
    originalWidth: number,
    originalHeight: number,
    targetWidth: number,
    targetHeight: number,
    maxDimension: number
) {
    const largestTarget = Math.max(targetWidth, targetHeight);
    if (largestTarget <= maxDimension) {
        return {
            canvasWidth: targetWidth,
            canvasHeight: targetHeight,
            imageWidth: originalWidth,
            imageHeight: originalHeight,
        };
    }

    const scaleFactor = maxDimension / largestTarget;
    return {
        canvasWidth: Math.round(targetWidth * scaleFactor),
        canvasHeight: Math.round(targetHeight * scaleFactor),
        imageWidth: Math.round(originalWidth * scaleFactor),
        imageHeight: Math.round(originalHeight * scaleFactor),
    };
}

async function composeImageOnCanvas(
    original: ImageFile,
    canvasWidth: number,
    canvasHeight: number,
    imageDrawWidth: number,
    imageDrawHeight: number,
    zoom: number,
    position: { x: number; y: number }
): Promise<ImageFile> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
            if (!context) {
                reject(new Error("Failed to initialize canvas context."));
                return;
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";

            // Green area indicates fill region for expansion.
            context.fillStyle = "#00FF00";
            context.fillRect(0, 0, canvasWidth, canvasHeight);

            const zoomedWidth = imageDrawWidth * zoom;
            const zoomedHeight = imageDrawHeight * zoom;
            const drawX = (canvasWidth - zoomedWidth) / 2 + position.x;
            const drawY = (canvasHeight - zoomedHeight) / 2 + position.y;

            context.drawImage(image, drawX, drawY, zoomedWidth, zoomedHeight);

            const dataUrl = canvas.toDataURL("image/png", 1);
            const [meta, base64] = dataUrl.split(",");
            const mimeMatch = meta?.match(/data:(.*?);base64/);
            if (!base64 || !mimeMatch?.[1]) {
                reject(new Error("Failed to export composed image."));
                return;
            }

            resolve({
                base64,
                mimeType: mimeMatch[1],
                width: canvasWidth,
                height: canvasHeight,
                dataUrl,
            });
        };
        image.onerror = () => reject(new Error("Failed to load source for composition."));
        image.src = original.dataUrl;
    });
}

async function scaleToTargetDimensions(base64Image: string, targetWidth: number, targetHeight: number): Promise<string> {
    return await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const context = canvas.getContext("2d", { alpha: true, willReadFrequently: false });

            if (!context) {
                reject(new Error("Failed to initialize scaling canvas."));
                return;
            }

            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
            context.drawImage(image, 0, 0, targetWidth, targetHeight);

            const dataUrl = canvas.toDataURL("image/png", 1);
            const [, scaledBase64] = dataUrl.split(",");
            if (!scaledBase64) {
                reject(new Error("Failed to scale AI output."));
                return;
            }

            resolve(scaledBase64);
        };
        image.onerror = () => reject(new Error("Failed to load AI output for scaling."));
        image.src = `data:image/png;base64,${base64Image}`;
    });
}

export function generateExpandedImage(
    sourceImage: File,
    options: ExpandImageOptions,
    signal?: AbortSignal
): Promise<GenerateEditedImageResult> {
    return trackInteraction(
        InteractionEvent.ASSET_EDITOR_EXPAND,
        () => generateExpandedImageInternal(sourceImage, options, signal),
        {
            data: {
                source_name: sourceImage.name,
                source_size_bytes: sourceImage.size,
                target_width: options.targetWidth,
                target_height: options.targetHeight,
                zoom: options.zoom,
            },
        }
    );
}

async function generateExpandedImageInternal(
    sourceImage: File,
    options: ExpandImageOptions,
    signal?: AbortSignal
): Promise<GenerateEditedImageResult> {
    const startedAt = Date.now();
    const sourcePart = await fileToPart(sourceImage);
    const sourceDataUrl = inlineDataToDataUrl({ inlineData: sourcePart.inlineData });
    const sourceImageFile = await dataUrlToImageFile(sourceDataUrl);

    const MAX_DIMENSION = 2048;
    const { canvasWidth, canvasHeight, imageWidth, imageHeight } = calculateScaledDimensions(
        sourceImageFile.width,
        sourceImageFile.height,
        options.targetWidth,
        options.targetHeight,
        MAX_DIMENSION
    );

    const composedImage = await composeImageOnCanvas(
        sourceImageFile,
        canvasWidth,
        canvasHeight,
        imageWidth,
        imageHeight,
        options.zoom,
        options.position
    );

    const scaledOutput = await resizeImageWithAI(
        composedImage.base64,
        composedImage.mimeType,
        options.targetWidth,
        options.targetHeight,
        signal
    );

    const finalImageUrl = `data:image/png;base64,${scaledOutput}`;

    return {
        finalImageUrl,
        finalPrompt: "Resize/extend via green-mask composition",
        duration: Date.now() - startedAt,
    };
}

export const resizeImageWithAI = async (
    base64Image: string,
    mimeType: string,
    targetWidth?: number,
    targetHeight?: number,
    signal?: AbortSignal
): Promise<string> => {

    const prompt = `This is a CRITICAL image inpainting task requiring PIXEL-PERFECT detail preservation. You are provided with an image containing a photograph and solid lime green (#00FF00) masked areas.

**YOUR GOAL:** Transform this into ONE seamless, naturally captured photograph where no one can detect which parts were extended. The result must look exactly like a real photograph taken by a camera.

**ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:**

1. **COMPLETELY ELIMINATE ALL GREEN (#00FF00) PIXELS**
   - There must be ZERO green pixels remaining in the final output
   - Every single pixel of green MUST be replaced with photorealistic content
   - Scan the entire image and ensure no green areas are left unfilled

2. **PRESERVE ORIGINAL PHOTOGRAPH WITH 100% FIDELITY**
   - CRITICAL: The non-green areas contain the ORIGINAL photograph that MUST remain COMPLETELY UNTOUCHED
   - DO NOT modify, alter, regenerate, blur, smooth, soften, simplify, or degrade ANY single pixel of the original photograph
   - The original photo areas must be passed through with ZERO modification - treat them as read-only
   - Keep ALL existing details at FULL RESOLUTION with ZERO quality loss
   - Preserve EVERY microscopic detail: pores, wrinkles, fabric threads, hair strands, scratches, texture bumps, surface imperfections
   - Maintain the EXACT color values, saturation levels, brightness, contrast, and hue of every pixel
   - Preserve the original's grain structure, noise pattern, compression artifacts, and film characteristics EXACTLY
   - Keep all edge sharpness, line definition, and boundary clarity at the ORIGINAL level
   - Maintain the PRECISE level of focus, depth of field, and lens characteristics from the original
   - Only work on green-masked areas - the rest is SACRED and MUST NOT be touched
   
   - **CRITICAL: DO NOT DUPLICATE OR REPEAT TEXT/GRAPHICS:**
     * If text, logos, or branding appear in the original photograph, DO NOT repeat them in extended areas
     * Extended areas should contain appropriate background/environment, NOT duplicated text elements
     * Text and graphics are one-time elements in a photograph - they don't repeat in extension areas
     * Example: If "PET SUPPLIES PLUS" appears in original, don't add it again in extended areas
     * Only background elements (walls, floors, ceilings, environment) should be extended

3. **NATURAL SCENE EXTENSION - CREATE A REALISTIC SINGLE PHOTOGRAPH**
   
   - **CRITICAL: STUDY THE EDGES MICROSCOPICALLY**
     * Before generating anything, ZOOM IN on the exact pixels where the photograph meets each green area
     * Top edge: What textures, colors, objects, patterns are visible in the last few rows of pixels?
     * Bottom edge: What's visible in the bottommost pixels? Floor? Table edge? Surface?
     * Left/Right edges: What surfaces, textures, or elements appear at the side boundaries?
     * Look for PARTIAL elements: Is there a hint of a lamp? Part of a ceiling tile? Edge of furniture?
     * These edge clues are YOUR GUIDE - they tell you exactly what to extend
   
   - **UNDERSTAND THE COMPLETE SCENE:**
     * Analyze the entire visible photograph: What type of scene is it?
     * Indoor/outdoor? Office/home/studio? Modern/traditional/industrial style?
     * What's the architectural style? Lighting style? Decor aesthetic?
     * What's the composition? What's the mood and atmosphere?
     * Where are the green areas? Top/bottom/left/right?
   
   - **INTELLIGENT EXTENSION APPROACH:**
     * The edges are your BLUEPRINT - extend based on what's actually there, not assumptions
     * If you see 2 pixels of a ceiling tile edge -> extend that specific ceiling tile system
     * If you see wood grain texture -> continue that exact wood pattern and tone
     * If you see a lamp partially visible -> complete that lamp naturally, don't add a different one
     * Think like a photographer: If this lens captured more, what would be revealed?
     * Match the architectural and design style visible in the original
     
   - **CONTEXTUAL REALISM - USE YOUR JUDGMENT:**
     * For a room scene: Consider appropriate elements like floor continuation, ceiling fixtures, furniture edges, architectural details
     * For outdoor scenes: Sky, landscape, natural elements that fit the environment  
     * For studio shots: Background continuation with appropriate lighting falloff
     * For product photos: Table surfaces, background elements that enhance the composition
     * Make it look NATURAL and BELIEVABLE for that specific type of photograph

**OUTPUT FORMAT & QUALITY REQUIREMENTS:**
   - Generate the output in PNG format for LOSSLESS quality preservation
   - Use ZERO compression - maximum quality settings only
   - NEVER apply lossy compression, JPEG compression, or quality-reducing algorithms

The green mask is ONLY an instruction guide showing where to extend. Replace it with intelligent, contextually appropriate background/environment content (walls, floors, ceilings, natural elements) that makes the entire image look like one unified, naturally captured photograph. DO NOT repeat text or graphics from the original.`;

    try {
        const apiResponse = await fetch(getBannerAgentAiUrl('/api/ai/resize-image'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                base64Image,
                mimeType,
                prompt,
                targetWidth,
                targetHeight,
            }),
            signal,
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `API request failed: ${apiResponse.status}`);
        }

        const result = await apiResponse.json();

        if (result.success && result.data) {
            if (targetWidth && targetHeight) {
                const scaledImage = await scaleToTargetDimensions(
                    result.data,
                    targetWidth,
                    targetHeight
                );
                return scaledImage;
            }

            return result.data;
        }

        throw new Error(result.error || "No image data found in the API response. The model may have been unable to process the request.");

    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to resize image: ${error.message}`);
        }
        throw new Error("An unknown error occurred while resizing the image.");
    }
};

export function generateEditedImage(
    sourceImage: File,
    options: EditImageOptions,
    signal?: AbortSignal
): Promise<GenerateEditedImageResult> {
    return trackInteraction(
        InteractionEvent.ASSET_EDITOR_EDIT,
        () => generateEditedImageInternal(sourceImage, options, signal),
        {
            data: {
                source_name: sourceImage.name,
                source_size_bytes: sourceImage.size,
                has_prompt: Boolean(options.prompt?.trim()),
                has_object_removal_mask: Boolean(options.objectRemovalMask),
                added_object_count: options.addedObjectImages?.length ?? 0,
                has_replacement_product: Boolean(options.newProductImage),
                remove_all_text: Boolean(options.removeAllText),
                custom_text_count: (options.customTexts ?? []).filter((item) => item.content?.trim()).length,
                preserve_max_detail: Boolean(options.preserveMaxDetail),
            },
        }
    );
}

async function generateEditedImageInternal(
    sourceImage: File,
    options: EditImageOptions,
    signal?: AbortSignal
): Promise<GenerateEditedImageResult> {
    const startedAt = Date.now();
    // Resize the source to fit within MAX_DIMENSION (objects are kept at native size).
    // A full-resolution source can dominate the model input and cause added-object
    // parts to be ignored, so this mirrors the reference flow.
    const MAX_DIMENSION = options.preserveMaxDetail ? 4096 : 2048;
    const resizedSourceImage = await resizeImagePreserveAspectRatio(sourceImage, MAX_DIMENSION, options.preserveMaxDetail);
    const sourcePart = await fileToPart(resizedSourceImage);
    const maskPart = options.objectRemovalMask ? dataUrlToPart(options.objectRemovalMask) : null;
    const addedObjectParts = await Promise.all((options.addedObjectImages || []).map((file) => fileToPart(file)));
    const replacementObjectPart = options.newProductImage ? await fileToPart(options.newProductImage) : null;
    const { width, height } = await getImageDimensions(sourceImage);
    const aspectRatio = width / height;
    const parts: Array<InlinePart | { text: string }> = [sourcePart];
    const promptSegments: string[] = [];
    const mandatoryTaskList: string[] = [];
    const assetCatalog: string[] = ["- **Image 1:** The source image to be edited."];
    let imageCounter = 1;

    if (maskPart) {
        parts.push(maskPart);
        imageCounter += 1;
        assetCatalog.push(`- **Image ${imageCounter}: Object Removal Mask.** The white area indicates the object to be removed.`);
    }

    if (addedObjectParts.length > 0) {
        addedObjectParts.forEach((part, index) => {
            parts.push(part);
            imageCounter += 1;
            assetCatalog.push(`- **Image ${imageCounter}: New Object ${index + 1} to Add (original dimensions preserved).**`);
        });
    }

    if (replacementObjectPart) {
        parts.push(replacementObjectPart);
        imageCounter += 1;
        assetCatalog.push(`- **Image ${imageCounter}: Replacement Object (original dimensions preserved).**`);
    }

    const qualityNegatives = "blurry, low quality, low resolution, pixelated, compression artifacts, distorted, stretched, poor quality, grainy, noisy, artifacts, detail loss, soft focus, out of focus, muddy textures, loss of sharpness, degraded quality, washed out details, smudged features, cropped text, cut-off text, covered text, overlapped text, occluded signage, misaligned text, warped typography";
    const userNegatives = options.negativePrompt ? `, ${options.negativePrompt}` : "";
    const textToAdd = (options.customTexts || []).filter((item) => item.content?.trim());

    if (maskPart) {
        const maskImageIndex = assetCatalog.findIndex((entry) => entry.includes("Object Removal Mask")) + 1;
        mandatoryTaskList.push(`Remove the object indicated by the provided mask (Image ${maskImageIndex}).`);
    }

    if (maskPart && replacementObjectPart) {
        const replacementImageIndex = assetCatalog.findIndex((entry) => entry.includes("Replacement Object")) + 1;
        mandatoryTaskList.push(`Perform an object replacement: remove the masked object in Image 1 and replace it with the object from Image ${replacementImageIndex}.`);
    }

    if (addedObjectParts.length > 0) {
        addedObjectParts.forEach((_, index) => {
            const objectImageIndex = assetCatalog.findIndex((entry) => entry.includes(`New Object ${index + 1} to Add`)) + 1;
            mandatoryTaskList.push(`Integrate New Object ${index + 1} (Image ${objectImageIndex}) into the scene.`);
        });
    }

    if (options.removeAllText) {
        mandatoryTaskList.push("Remove ALL existing text from the source image.");
    }

    if (textToAdd.length > 0) {
        textToAdd.forEach((item) => mandatoryTaskList.push(`Add the text \"${item.content.trim()}\".`));
    }

    if (options.prompt?.trim()) {
        mandatoryTaskList.push(`Apply the user's primary edit: \"${options.prompt.trim()}\".`);
    }

    const hasNoEditTasks = mandatoryTaskList.length === 0;

    promptSegments.push("**Role:** You are an expert AI photo editor. Your task is to perform precise edits on an image based on a mandatory task list.");

    if (mandatoryTaskList.length > 0) {
        promptSegments.push(
            `**Mandatory Task List**\nYou MUST perform ALL of the following tasks in order. This is not optional.\n${mandatoryTaskList.map((task, index) => `${index + 1}. ${task}`).join("\n")}`
        );
    }

    if (hasNoEditTasks) {
        promptSegments.push(`**Mandatory: No Edit Requested - Keep Hero & Products Constant**
- No specific edit instruction was provided. Generate a fresh, natural variation of the source image (Image 1) while keeping the hero subject and products locked.
- **Hero subject (the pet/person/main subject):** Keep it as the EXACT same individual in the SAME position, scale, pose, and orientation. Do NOT add, remove, or duplicate subjects, and do NOT change the count.
- **Products (toys, accessories, branded items):** Keep every product identical in shape, color, texture, branding, and position. Do NOT swap, recolor, reshape, add, or remove any product.
- **Allowed variation:** You MAY creatively vary the background scene/setting, lighting mood, and subtle, natural interactions or micro-expressions of the hero (e.g. slight head tilt, gaze, minor limb adjustment) to make each variation feel distinct and lively.
- The result must remain photorealistic and on-brand; changes should feel like a different photo from the same shoot, not a different scene or different subject/products.`);
    }

    promptSegments.push(`**Asset Catalog:**\n${assetCatalog.join("\n")}`);

    promptSegments.push(`\n**Core Directive: Flawless Realism and ABSOLUTE Detail Preservation**
- **CRITICAL: Preserve Exact Aspect Ratio:** The output image MUST have the exact same aspect ratio (${aspectRatio.toFixed(3)}) as the source image (Image 1). The source image is ${aspectRatio > 1 ? "landscape" : aspectRatio < 1 ? "portrait" : "square"} format. Your output MUST match this format exactly. DO NOT make the output square if the input is not square. DO NOT stretch or distort the image.

- **HIGHEST PRIORITY: 100% Detail Fidelity of Unedited Areas:** 
  - CRITICAL: Any part of the source image NOT directly specified for editing MUST remain at 100% original fidelity
  - You MUST NOT modify, blur, smooth, soften, simplify, or degrade ANY detail in unedited areas
  - Preserve EVERY microscopic detail: individual pores, fabric threads, hair strands, texture bumps, surface imperfections, fine scratches
  - Maintain the EXACT pixel values, colors, saturation, brightness, contrast, sharpness, and grain structure
  - Keep ALL fine details, textures, patterns, and intricate elements at FULL ORIGINAL RESOLUTION
  - The unedited background, objects, and areas must remain PIXEL-PERFECT identical to the source
  - Think "read-only" for unedited areas - pass them through untouched with ZERO modification

- **Hyper-Realistic Integration:** Any new element (object, text, logo) added to the scene MUST be integrated with flawless, indistinguishable realism. It must perfectly match the scene's lighting, perspective, shadows, grain, scale, and DETAIL DENSITY. Obey the laws of physics.

- **MANDATORY: Ultra High Quality Output with Maximum Detail Preservation:**
  - Generate at the HIGHEST possible resolution with MAXIMUM detail density and sharpness
  - The final output MUST be a professional-grade, ultra-realistic, high-resolution photograph
  - CRITICALLY IMPORTANT: Preserve ALL microscopic details, fine textures, and intricate elements from the source image at 100% fidelity
  - Maintain RAZOR-SHARP focus and CRYSTAL-CLEAR definition throughout the ENTIRE image
  - Preserve every tiny detail: pores, wrinkles, fabric weave, hair strands, surface grain, fine lines, edge sharpness
  - Keep the original's grain/noise structure, compression characteristics, and film qualities EXACTLY as they are
  - Match the source image's detail complexity and textural richness in any new/edited areas
  - STRICTLY AVOID: any blurriness, pixelation, compression artifacts, low resolution, quality degradation, detail loss, smoothing, softening, over-simplification, detail averaging, or reduced clarity
  - The result should maintain or EXCEED the input image quality - never reduce it`);

    promptSegments.push(`**Framing & Canvas (Mandatory)**
- Do NOT change the framing or canvas size beyond matching the original aspect ratio; never convert a landscape image to square.
- Keep all edges and margins intact (especially top margin). Do not crop, zoom, or reframe the source content.
- Treat all edges as protected areas; no content loss at the top/bottom/left/right.`);

    promptSegments.push(`**Aspect Ratio Preservation (Mandatory)**
- The final output canvas MUST match the source image aspect ratio exactly.
- All integrated assets (objects/replacements) MUST keep their original aspect ratio. Only uniform scaling is allowed. No stretching, squashing, warping, or cropping to square.`);

    if (!options.removeAllText) {
        promptSegments.push(`**Typography Preservation (Mandatory)**
- Preserve ALL existing text exactly: content, font, size, weight, color, tracking/kerning, leading/line-height, alignment, and position.
- Do NOT remove, distort, warp, crop, blur, or partially cut off any existing text.
- New elements must NOT overlap or obscure existing text; adjust placement/scale of new elements to keep all text fully visible and legible.
- Maintain original alignment and positioning relative to nearby visual anchors (labels, boxes, margins, signs).
- Ensure lighting/contrast keeps all existing text clearly readable.`);
    }

    if (maskPart) {
        const maskImageIndex = assetCatalog.findIndex((entry) => entry.includes("Object Removal Mask")) + 1;
        promptSegments.push(`**Task Details: Object Removal via Mask (Mandatory)**
- You have been given an 'Object Removal Mask' (Image ${maskImageIndex}).
- Your task is to locate the object in the source image (Image 1) that corresponds to the white area in the mask.
- You MUST completely remove this object.
- After removing it, you MUST realistically reconstruct the background that was obscured. The final result should look natural, as if the object was never present.`);
    }

    if (addedObjectParts.length > 0) {
        for (let i = 0; i < addedObjectParts.length; i += 1) {
            const objectImageIndex = assetCatalog.findIndex((entry) => entry.includes(`New Object ${i + 1} to Add`)) + 1;
            let instruction = `**Task Details: New Object ${i + 1} Integration (Mandatory)**
- You MUST seamlessly integrate New Object ${i + 1} (Image ${objectImageIndex}) into the scene.
- Adhere strictly to the Core Directive (respecting scale, lighting, shadows, and perspective).`;
            if (options.addedObjectPrompt?.trim()) {
                instruction += `\n- Follow this specific user instruction for placement: \"${options.addedObjectPrompt.trim()}\"`;
            }
            if (!options.removeAllText) {
                instruction += "\n- Do NOT overlap or obscure any existing text. Reposition/scale the new object as needed to keep all existing text fully visible and legible.";
            }
            instruction += "\n- Preserve the object's original aspect ratio. Use uniform scaling only (no stretching or squashing).";
            instruction += "\n- Match scene lighting (direction, intensity, color temperature) and cast accurate contact shadows.\n- Respect perspective and camera lens; align vanishing lines and horizon.\n- Match depth of field and focus blur; apply subtle blur if background is out of focus.\n- Match scene grain/noise and compression level.\n- Position this object thoughtfully to create a natural, balanced composition with other objects in the scene.\n- Add subtle supporting elements if needed for realism (e.g., soft shadows, reflections on nearby surfaces, slight ground interaction). Keep them minimal and photorealistic.";
            promptSegments.push(instruction);
        }
    }

    if (maskPart && replacementObjectPart) {
        const maskImageIndex = assetCatalog.findIndex((entry) => entry.includes("Object Removal Mask")) + 1;
        const replacementImageIndex = assetCatalog.findIndex((entry) => entry.includes("Replacement Object")) + 1;
        let replacementTaskPrompt = `**Task Details: Object Replacement (Mandatory)**
- Your most critical task is to perform an object replacement inside the masked region. Follow these steps precisely.
- **Step 1: Identify.** Use the Object Removal Mask (Image ${maskImageIndex}) to locate the object in the source image (Image 1) that must be replaced.
- **Step 2: Remove & Reconstruct.** Seamlessly remove the identified object and intelligently reconstruct the background behind it. The area should look natural, as if the object was never there.
- **Step 3: Integrate.** Place the 'Replacement Object' (Image ${replacementImageIndex}) into the scene where the old object was. The integration must be photorealistic, perfectly matching lighting, perspective, scale, and shadows.`;

        if (options.replacementPrompt?.trim()) {
            replacementTaskPrompt += `\n- When integrating, pay close attention to this user instruction: \"${options.replacementPrompt.trim()}\"`;
        }
        if (!options.removeAllText) {
            replacementTaskPrompt += "\n- Do NOT cover or partially cover any existing text. If necessary, make minimal, realistic adjustments so all text remains clear and unobstructed.";
        }
        replacementTaskPrompt += "\n- Preserve the replacement object's original aspect ratio. Use uniform scaling only; do not warp or squash to fit.";
        promptSegments.push(replacementTaskPrompt);
    }

    if (options.removeAllText) {
        promptSegments.push("**Task Details: Text Removal (Mandatory)**\n- You MUST remove ALL existing text, logos, and typography from the source image before applying any other changes. This is a critical, non-negotiable step.");
    }

    if (textToAdd.length > 0) {
        const textToAddPrompts = textToAdd.map((text) => {
            let instruction = `- Add the exact text: \"${text.content.trim()}\".`;
            if (text.prompt?.trim()) {
                instruction += ` Follow this specific instruction for placement and style: \"${text.prompt.trim()}\".`;
            } else {
                instruction += " Place this text in a visually appropriate and aesthetically pleasing location.";
            }
            instruction += " The text must be seamlessly integrated, matching the scene's lighting, perspective, and style.";
            return instruction;
        }).join("\n");

        promptSegments.push(`**Task Details: Text Addition (Mandatory)**\nYou MUST add the following text elements to the image. This is a crucial part of the request. Adhere to the Core Directive for realism.\n${textToAddPrompts}`);
    }

    if (options.prompt?.trim()) {
        promptSegments.push(`**Task Details: Primary User Edit**\n- Your primary creative task is to apply this edit: \"${options.prompt.trim()}\"`);
    }

    promptSegments.push(`**Negative Prompt (Things to AVOID):**\nYou MUST AVOID generating any of the following: ${qualityNegatives}${userNegatives}`);

    if (options.preserveExistingToys) {
        promptSegments.push(`**Mandatory: Preserve Existing Toys & Accessories**
- Do NOT modify, replace, recolor, reshape, resize, move, add, or remove ANY existing toys or accessories present in the scene.
- Every toy and accessory MUST remain pixel-perfect identical to the source image in shape, color, texture, position, and detail.
- Treat all existing toys and accessories as strictly read-only; pass them through completely untouched.`);
    }

    if (options.optimizeForPets) {
        promptSegments.push("**Special Instruction for Pets:** If a pet is present, its interaction and expression should be updated to realistically react to any changes.");
    }

    promptSegments.push(`**Final Output Instructions - MAXIMUM DETAIL PRESERVATION:**
- The final result must be a single, edited image of the HIGHEST possible quality with PERFECT detail preservation
- Generate at MAXIMUM resolution with FULL detail density, sharpness, and professional quality
- ABSOLUTELY CRITICAL: Preserve EVERY microscopic detail, fine texture, and intricate element from the source image at 100% fidelity
  - Every pore, wrinkle, fabric thread, hair strand, surface bump, fine line, and tiny imperfection MUST remain visible
  - Maintain the EXACT same level of detail complexity as the source - never simplify or reduce
  - Keep all grain structure, noise patterns, and compression characteristics IDENTICAL
  - Unedited areas must be PIXEL-PERFECT replicas of the source with ZERO modification
- Ensure RAZOR-SHARP edges and CRYSTAL-CLEAR definition throughout the ENTIRE image
- Match or EXCEED the source image's detail density in any edited/new areas
- The output should ONLY be the modified scene image - no text, explanation, or other content
- The final image must be crisp, clear, suitable for professional use with ABSOLUTE ZERO quality degradation
- Success = Unedited areas look IDENTICAL (not similar) to source with all microscopic details intact`);

    const finalPrompt = promptSegments.join("\n\n");
    parts.push({ text: finalPrompt });

    const response = await fetch(getBannerAgentAiUrl("/api/ai/generate-content"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: {
                parts,
            },
            config: {
                responseModalities: ["IMAGE", "TEXT"],
            },
            editor: "image-editor",
        }),
        signal,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown generation error" }));
        throw new Error(errorData.error || `Generation failed (${response.status})`);
    }

    const payload = await response.json();
    const imagePart = payload?.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);

    if (!imagePart?.inlineData?.data || !imagePart?.inlineData?.mimeType) {
        const fallbackText = payload?.text?.trim ? payload.text.trim() : "Model did not return an image.";
        throw new Error(`The AI model did not return an image. ${fallbackText}`);
    }

    const finalImageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

    return {
        finalImageUrl,
        finalPrompt,
        duration: Date.now() - startedAt,
    };
}
