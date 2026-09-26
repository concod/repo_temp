const GROUP_1_PROMPT = `Fit the image into the blue area using scale-to-cover while preserving the original aspect ratio.
Never stretch or distort any objects, pets, or text.
Crop only if required.
The blue area must be fully covered, and nothing may extend outside the black border. The exact same background, objects, texts, pets, borders, logos, etc should be preserved.`;

const GROUP_2_PROMPT = `${GROUP_1_PROMPT} And try to avoid cropping of any objects or pets, etc`;

const GROUP_3_PROMPT = `${GROUP_2_PROMPT}

Important Notes:

1. Every objects, texts, borders, logos, etc should be within the blue area and should not be cropped or stretched. Follow the exact same background of source image in the blue area.

2. Model should not touch the red coloured area. It has permission only to replace blue area till it's boundary region.`;

const GROUP_4_PROMPT = `Scale the image to fully cover the existing blue area while preserving the original aspect ratio.
Do not stretch, distort, or resize the blue region; fill only inside it.
Crop only if absolutely necessary, and avoid cropping any objects, text, pets, logos, or borders.
The blue area must be completely replaced and should not be visible in the final image.
Do not touch or modify the red area; only the blue region may be changed.
Preserve the original background and all content exactly.
GOLDEN RULE: Do not touch, modify or extend the contents into the red area. The size of blue area should be exactly same as the source image.`;

const GROUP_5_PROMPT = `Scale the image to fully cover the existing blue area while preserving the original aspect ratio.
Do not stretch, distort, or resize the blue region; fill only inside it.
Crop only if absolutely necessary, and avoid cropping any objects, text, pets, logos, or borders.
The blue area must be completely replaced and should not be visible in the final image.
Do not touch or modify the red area; only the blue region may be changed.
Preserve the original background and all content exactly.
GOLDEN RULES:

1. Do not touch, modify or extend the contents into the red area. The size of blue area should be exactly same as the source image.
2. The result must satisfy:
- Blue rectangle position: unchanged from input
- Blue rectangle dimensions: unchanged from input
- Blue pixels: zero (completely replaced)
- Content outside blue rectangle: completely unchanged (especially red area)
- No content extending beyond the original blue rectangle edges on any side (left, right, top, or bottom)`;

const GROUP_6_PROMPT = `Fill the blue rectangle with the scaled image using these precise steps:

STEP 1 - MEASURE:
- Identify the exact pixel boundaries of the blue rectangle (left, top, right, bottom edges)
- Calculate blue rectangle dimensions: width and height in pixels
- The blue rectangle borders (black lines) are NOT part of the fillable area

STEP 2 - SCALE:
- Scale the source image proportionally (maintain aspect ratio) until it's large enough to completely cover the blue rectangle
- Scale based on whichever dimension requires MORE scaling to cover the area

STEP 3 - CROP TO FIT:
- After scaling, crop the image to match the exact blue rectangle dimensions
- The cropped result must be EXACTLY the same width and height as the blue rectangle
- Center the crop on important subjects (pets, faces, logos) to keep them visible
- Discard any portions that extend beyond the blue rectangle boundaries

STEP 4 - REPLACE:
- Replace ONLY the blue pixels with the cropped image
- The result must be pixel-perfect aligned with the original blue rectangle edges
- Nothing should extend into the red area or beyond the blue boundaries by even 1 pixel

VALIDATION CHECKLIST:
- Output dimensions = Input blue rectangle dimensions (exact match)
- Output position = Input blue rectangle position (exact match)
- All blue pixels replaced (zero blue remaining)
- Red area completely untouched
- No content bleeding beyond blue rectangle edges on any side
- Important subjects (pets) remain fully visible within the boundaries

Think of this as: measure the box -> scale image to cover -> crop to box size -> paste into box.`;

export function getAdvancedVariationPrompt(targetRatioLabel: string): string {
    if (targetRatioLabel === "1:1" || targetRatioLabel === "4:5") {
        return GROUP_1_PROMPT;
    }

    if (targetRatioLabel === "1:2" || targetRatioLabel === "9:16") {
        return GROUP_2_PROMPT;
    }

    if (targetRatioLabel === "1.91:1" || targetRatioLabel === "1.2:1") {
        return GROUP_3_PROMPT;
    }

    if (targetRatioLabel === "3:1") {
        return GROUP_4_PROMPT;
    }

    if (targetRatioLabel === "2.64:1" || targetRatioLabel === "0.72:1") {
        return GROUP_5_PROMPT;
    }

    if (targetRatioLabel === "3.14:1" || targetRatioLabel === "2.05:1") {
        return GROUP_6_PROMPT;
    }

    return GROUP_1_PROMPT;
}
