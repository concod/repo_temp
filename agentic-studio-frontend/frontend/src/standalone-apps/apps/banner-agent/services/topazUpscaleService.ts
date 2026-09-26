const TOPAZ_API_URL = "https://api.topazlabs.com/image/v1/enhance";
const TOPAZ_API_KEY = "cff645d7-2bf8-4849-871a-0dac103a19c8";

export interface TopazUpscaleOptions {
    outputWidth?: number;
    outputHeight?: number;
}

export const upscaleImage = async (
    imageBlob: Blob,
    options: TopazUpscaleOptions = {}
): Promise<Blob> => {
    let { outputWidth, outputHeight } = options;

    if (!outputWidth || !outputHeight) {
        const dimensions = await getImageDimensions(imageBlob);
        outputWidth = dimensions.width * 2;
        outputHeight = dimensions.height * 2;
    }

    const formData = new FormData();
    formData.append("image", imageBlob, "image.png");
    formData.append("output_width", String(outputWidth));
    formData.append("output_height", String(outputHeight));

    const response = await fetch(TOPAZ_API_URL, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "X-API-Key": TOPAZ_API_KEY,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Topaz API error: ${response.status} - ${errorText}`);
    }

    return response.blob();
};

const getImageDimensions = (blob: Blob): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({
                width: image.naturalWidth,
                height: image.naturalHeight,
            });
        };

        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("Failed to read image dimensions."));
        };

        image.src = objectUrl;
    });

export const fetchImageAsBlob = async (imageUrl: string): Promise<Blob> => {
    if (imageUrl.startsWith("data:")) {
        const [header, payload] = imageUrl.split(",");
        if (!payload) {
            throw new Error("Invalid data URL.");
        }

        const mimeType = header.match(/data:([^;]+);/)?.[1] || "image/png";
        const byteString = atob(payload);
        const bytes = new Uint8Array(byteString.length);

        for (let index = 0; index < byteString.length; index += 1) {
            bytes[index] = byteString.charCodeAt(index);
        }

        return new Blob([bytes], { type: mimeType });
    }

    const isRemoteUrl = imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
    const fetchCandidates = isRemoteUrl
        ? [imageUrl, `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`]
        : [imageUrl];

    let lastError: Error | null = null;

    for (const candidate of fetchCandidates) {
        try {
            const response = await fetch(candidate);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            return await response.blob();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error("Unknown image fetch error");
        }
    }

    throw lastError || new Error("Failed to fetch image.");
};