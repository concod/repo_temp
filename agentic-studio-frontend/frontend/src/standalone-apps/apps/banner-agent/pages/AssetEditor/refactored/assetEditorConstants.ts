import type { Crop } from "react-image-crop";
import type { CropPreset, EditorToolKey } from "./assetEditorTypes";

export const EDITOR_TOOL_KEYS: EditorToolKey[] = ["modify", "text", "asset", "erase", "crop", "expand"];

export const isEditorToolKey = (value: string | null): value is EditorToolKey => {
    if (!value) return false;
    return EDITOR_TOOL_KEYS.includes(value as EditorToolKey);
};

export const DEFAULT_CROP: Crop = {
    unit: "%",
    x: 5,
    y: 5,
    width: 90,
    height: 90,
};

export const CROP_PRESET_GROUPS: Array<{ label: string; presets: CropPreset[] }> = [
    {
        label: "Quick",
        presets: [
            { id: "free", label: "Free Form", aspectRatio: 0, ratio: "Any" },
            { id: "square", label: "Square", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "Instagram",
        presets: [
            { id: "instagram_portrait", label: "Portrait", aspectRatio: 4 / 5, ratio: "4:5" },
            { id: "instagram_landscape", label: "Landscape", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "instagram_story", label: "Story", aspectRatio: 9 / 16, ratio: "9:16" },
            { id: "instagram_carousel", label: "Carousel", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "Facebook",
        presets: [
            { id: "facebook_post", label: "Post", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "facebook_cover", label: "Cover", aspectRatio: 2.7, ratio: "2.7:1" },
            { id: "facebook_story", label: "Story", aspectRatio: 9 / 16, ratio: "9:16" },
        ],
    },
    {
        label: "LinkedIn",
        presets: [
            { id: "linkedin_post", label: "Post", aspectRatio: 1.91, ratio: "1.91:1" },
            { id: "linkedin_cover", label: "Cover", aspectRatio: 4, ratio: "4:1" },
            { id: "linkedin_company", label: "Company", aspectRatio: 1128 / 191, ratio: "5.91:1" },
        ],
    },
    {
        label: "Twitter",
        presets: [
            { id: "twitter_post", label: "Post", aspectRatio: 16 / 9, ratio: "16:9" },
            { id: "twitter_card", label: "Card", aspectRatio: 2, ratio: "2:1" },
            { id: "twitter_header", label: "Header", aspectRatio: 3, ratio: "3:1" },
        ],
    },
    {
        label: "TikTok",
        presets: [
            { id: "tiktok_video", label: "Video", aspectRatio: 9 / 16, ratio: "9:16" },
            { id: "tiktok_profile", label: "Profile", aspectRatio: 1, ratio: "1:1" },
        ],
    },
    {
        label: "YouTube",
        presets: [
            { id: "youtube_video", label: "Video", aspectRatio: 16 / 9, ratio: "16:9" },
            { id: "youtube_banner", label: "Banner", aspectRatio: 2560 / 400, ratio: "6.4:1" },
        ],
    },
    {
        label: "Pinterest",
        presets: [
            { id: "pinterest_pin", label: "Pin", aspectRatio: 2 / 3, ratio: "2:3" },
            { id: "pinterest_square", label: "Square", aspectRatio: 1, ratio: "1:1" },
        ],
    },
];
