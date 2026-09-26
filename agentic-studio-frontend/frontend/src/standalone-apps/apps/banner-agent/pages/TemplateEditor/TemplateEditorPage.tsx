import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TemplateEditorPage.scss";
import {
    templateAdminService,
    type TemplateRecord,
} from "../../services/templateAdminService";

const SMART_EDITOR_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";

type DraftTemplate = {
    id: string;
    name: string;
    description: string;
    templateType: "banner" | "collage";
    enableBehindTemplateLayering: boolean;
    skipAIBackgroundRemoval: boolean;
    defaultBrandingEnabled: boolean;
    backgroundType: "transparent" | "solid" | "gradient" | "image";
    backgroundImageUrl: string;
    backgroundColor: string;
    backgroundGradientStart: string;
    backgroundGradientEnd: string;
    backgroundGradientAngle: number;
};

function createEmptyDraft(): DraftTemplate {
    return {
        id: `template_${Date.now()}`,
        name: "",
        description: "",
        templateType: "banner",
        enableBehindTemplateLayering: false,
        skipAIBackgroundRemoval: false,
        defaultBrandingEnabled: false,
        backgroundType: "image",
        backgroundImageUrl: "",
        backgroundColor: "#ffffff",
        backgroundGradientStart: "#ffffff",
        backgroundGradientEnd: "#000000",
        backgroundGradientAngle: 180,
    };
}

function toDraft(template: TemplateRecord): DraftTemplate {
    const background = template.settings?.background;
    return {
        id: template.id,
        name: template.name ?? "",
        description: template.description ?? "",
        templateType: "banner",
        enableBehindTemplateLayering: false,
        skipAIBackgroundRemoval: template.skipAIBackgroundRemoval === true,
        defaultBrandingEnabled: template.defaultBrandingEnabled === true,
        backgroundType: background?.type ?? "image",
        backgroundImageUrl: background?.imageUrl ?? "",
        backgroundColor: background?.color ?? "#ffffff",
        backgroundGradientStart: background?.gradientStart ?? "#ffffff",
        backgroundGradientEnd: background?.gradientEnd ?? "#000000",
        backgroundGradientAngle:
            typeof background?.gradientAngle === "number" && Number.isFinite(background.gradientAngle)
                ? background.gradientAngle
                : 180,
    };
}

function createDefaultTemplateFromDraft(draft: DraftTemplate): TemplateRecord {
    return {
        id: draft.id,
        name: draft.name,
        description: draft.description,
        thumbnail: draft.backgroundType === "image" ? draft.backgroundImageUrl || "/placeholder.svg" : "/placeholder.svg",
        templateType: "banner",
        enableBehindTemplateLayering: false,
        skipAIBackgroundRemoval: draft.skipAIBackgroundRemoval,
        defaultBrandingEnabled: draft.defaultBrandingEnabled,
        settings: {
            background: {
                type: draft.backgroundType,
                imageUrl: draft.backgroundType === "image" ? draft.backgroundImageUrl || null : null,
                color: draft.backgroundColor,
                gradientStart: draft.backgroundGradientStart,
                gradientEnd: draft.backgroundGradientEnd,
                gradientAngle: draft.backgroundGradientAngle,
            },
            positioning: {
                verticalAlignment: 50,
                horizontalAlignment: 50,
            },
            layout: {
                productScalePercent: 80,
                productSpacing: 0,
                placementWidthPct: 42,
                placementHeightPct: 74,
            },
        },
    };
}

function mergeDraftIntoTemplate(template: TemplateRecord, draft: DraftTemplate): TemplateRecord {
    const nextBackground = {
        ...(template.settings?.background ?? {}),
        type: draft.backgroundType,
        imageUrl: draft.backgroundType === "image" ? draft.backgroundImageUrl || null : null,
        color: draft.backgroundColor,
        gradientStart: draft.backgroundGradientStart,
        gradientEnd: draft.backgroundGradientEnd,
        gradientAngle: draft.backgroundGradientAngle,
    };

    return {
        ...template,
        id: draft.id,
        name: draft.name,
        description: draft.description,
        templateType: "banner",
        enableBehindTemplateLayering: false,
        skipAIBackgroundRemoval: draft.skipAIBackgroundRemoval,
        defaultBrandingEnabled: draft.defaultBrandingEnabled,
        thumbnail: draft.backgroundType === "image" ? draft.backgroundImageUrl || template.thumbnail : template.thumbnail,
        settings: {
            ...(template.settings ?? {}),
            background: nextBackground,
        },
    };
}

async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
                reject(new Error("Unable to read image file."));
                return;
            }
            resolve(result);
        };
        reader.onerror = () => {
            reject(new Error("Unable to read image file."));
        };
        reader.readAsDataURL(file);
    });
}

function toSmartEditorUrl(path: string): string {
    const base = SMART_EDITOR_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

function resolveTemplateAssetUrl(url: string | null | undefined): string {
    if (!url) {
        return "";
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    return toSmartEditorUrl(url);
}

export default function TemplateEditorPage() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<TemplateRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedTemplateOriginalId, setSelectedTemplateOriginalId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [lockAspectRatio, setLockAspectRatio] = useState(true);
    const [previewRatio, setPreviewRatio] = useState<"square" | "landscape" | "portrait">("landscape");
    const [draft, setDraft] = useState<DraftTemplate>(createEmptyDraft);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === selectedTemplateOriginalId) ?? null,
        [selectedTemplateOriginalId, templates]
    );

    const isSubmitDisabled =
        isSaving ||
        isUploading ||
        draft.id.trim().length === 0 ||
        draft.name.trim().length === 0 ||
        draft.description.trim().length === 0;

    const resolvedBackgroundPreviewUrl = useMemo(
        () => resolveTemplateAssetUrl(draft.backgroundImageUrl),
        [draft.backgroundImageUrl]
    );

    const previewCanvasStyle = useMemo<React.CSSProperties>(() => {
        if (draft.backgroundType === "solid") {
            return { background: draft.backgroundColor };
        }

        if (draft.backgroundType === "gradient") {
            return {
                background: `linear-gradient(${draft.backgroundGradientAngle}deg, ${draft.backgroundGradientStart}, ${draft.backgroundGradientEnd})`,
            };
        }

        if (draft.backgroundType === "transparent") {
            return {
                backgroundColor: "#edf2f0",
                backgroundImage:
                    "linear-gradient(45deg, #c8d2cd 25%, transparent 25%), linear-gradient(-45deg, #c8d2cd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c8d2cd 75%), linear-gradient(-45deg, transparent 75%, #c8d2cd 75%)",
                backgroundSize: "18px 18px",
                backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0px",
            };
        }

        return {};
    }, [
        draft.backgroundColor,
        draft.backgroundGradientAngle,
        draft.backgroundGradientEnd,
        draft.backgroundGradientStart,
        draft.backgroundType,
    ]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setStatus(null);
            try {
                const loaded = await templateAdminService.getTemplates();
                if (cancelled) {
                    return;
                }

                setTemplates(loaded);
                if (loaded.length > 0) {
                    setSelectedTemplateOriginalId(loaded[0].id);
                    setIsCreating(false);
                    setDraft(toDraft(loaded[0]));
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setStatus({
                    type: "error",
                    message: error instanceof Error ? error.message : "Failed to load templates.",
                });
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    const selectTemplate = (template: TemplateRecord) => {
        setIsCreating(false);
        setSelectedTemplateOriginalId(template.id);
        setDraft(toDraft(template));
        setStatus(null);
    };

    const startCreate = () => {
        setIsCreating(true);
        setSelectedTemplateOriginalId(null);
        setDraft(createEmptyDraft());
        setStatus(null);
    };

    const handleUploadBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            setStatus({ type: "error", message: "Only image files are allowed." });
            return;
        }

        setIsUploading(true);
        setStatus(null);

        try {
            const dataUrl = await readFileAsDataUrl(file);
            const uploadedUrl = await templateAdminService.uploadTemplateImage(dataUrl, file.name);
            setDraft((prev) => ({ ...prev, backgroundImageUrl: uploadedUrl }));
            setStatus({ type: "success", message: "Background image uploaded." });
        } catch (error) {
            setStatus({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to upload background image.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (isSubmitDisabled) {
            return;
        }

        setIsSaving(true);
        setStatus(null);

        try {
            let templateToSave: TemplateRecord;

            if (isCreating || !selectedTemplateOriginalId) {
                const latestTemplates = await templateAdminService.getTemplates();
                const hasDuplicate = latestTemplates.some((item) => item.id === draft.id);
                if (hasDuplicate) {
                    throw new Error("Template ID already exists. Use a unique ID.");
                }

                templateToSave = createDefaultTemplateFromDraft(draft);
            } else {
                const latestTemplates = await templateAdminService.getTemplates();
                const existingTemplate = latestTemplates.find((item) => item.id === selectedTemplateOriginalId);
                if (!existingTemplate) {
                    throw new Error("Template no longer exists. Refresh and try again.");
                }

                if (
                    draft.id !== selectedTemplateOriginalId &&
                    latestTemplates.some((item) => item.id === draft.id)
                ) {
                    throw new Error("Template ID already exists. Use a unique ID.");
                }

                templateToSave = mergeDraftIntoTemplate(existingTemplate, draft);
            }

            const savedTemplate = await templateAdminService.saveTemplate(templateToSave);

            const refreshedTemplates = await templateAdminService.getTemplates();
            setTemplates(refreshedTemplates);
            setIsCreating(false);
            setSelectedTemplateOriginalId(savedTemplate.id);
            setDraft(toDraft(savedTemplate));

            setStatus({ type: "success", message: "Template saved successfully." });
        } catch (error) {
            setStatus({
                type: "error",
                message: error instanceof Error ? error.message : "Failed to save template.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="template-editor-page">
            <header className="template-editor-topbar">
                <div className="template-editor-topbar__left">
                    <button
                        type="button"
                        className="template-editor-topbar__back"
                        onClick={() => navigate(-1)}
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                            <path d="M15 18L9 12L15 6" />
                        </svg>
                    </button>
                    <div>
                        <h1>Template Settings</h1>
                        <p>Create and modify templates for Banner Agent.</p>
                    </div>
                </div>
                <button type="button" className="template-editor-save-btn" onClick={handleSave} disabled={isSubmitDisabled}>
                    {isSaving ? "Saving..." : "Save Template"}
                </button>
            </header>

            {status && (
                <div className={`template-editor-status template-editor-status--${status.type}`} role="status">
                    {status.message}
                </div>
            )}

            <div className="template-editor-shell">
                <aside className="template-editor-list" aria-label="Templates list">
                    <div className="template-editor-list__header">
                        <h2>Templates</h2>
                        <button type="button" onClick={startCreate}>+ Add New</button>
                    </div>

                    {isLoading ? (
                        <div className="template-editor-list__placeholder">Loading templates...</div>
                    ) : templates.length === 0 ? (
                        <div className="template-editor-list__placeholder">No templates found. Create one to get started.</div>
                    ) : (
                        <ul>
                            {templates.map((template) => (
                                <li key={template.id}>
                                    <button
                                        type="button"
                                        className={template.id === selectedTemplateOriginalId && !isCreating ? "is-active" : ""}
                                        onClick={() => selectTemplate(template)}
                                    >
                                        <span className="template-editor-list__item-title">{template.name || template.id}</span>
                                        <span className="template-editor-list__item-meta">
                                            {(template.templateType || "banner").toUpperCase()} • {template.id}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>

                <main className="template-editor-form">
                    {!isCreating && !selectedTemplate ? (
                        <div className="template-editor-form__empty">Select a template or create a new one.</div>
                    ) : (
                        <>
                            <div className="template-editor-form__grid">
                                <label>
                                    Template Name
                                    <input
                                        type="text"
                                        value={draft.name}
                                        onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                                        placeholder="e.g. Summer Promo"
                                    />
                                </label>

                                <label>
                                    Template ID
                                    <input
                                        type="text"
                                        value={draft.id}
                                        onChange={(event) => setDraft((prev) => ({ ...prev, id: event.target.value }))}
                                        placeholder="template_123"
                                    />
                                </label>
                            </div>

                            <label>
                                Description
                                <textarea
                                    value={draft.description}
                                    onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                                    placeholder="Short description for template usage"
                                    rows={3}
                                />
                            </label>

                            <label>
                                Background Type
                                <select
                                    value={draft.backgroundType}
                                    onChange={(event) => setDraft((prev) => ({
                                        ...prev,
                                        backgroundType: (event.target.value as DraftTemplate["backgroundType"]),
                                    }))}
                                >
                                    <option value="image">Image</option>
                                    <option value="transparent">Transparent</option>
                                    <option value="solid">Solid Color</option>
                                    <option value="gradient">Gradient</option>
                                </select>
                            </label>

                            {draft.backgroundType === "solid" && (
                                <div className="template-editor-form__grid">
                                    <label>
                                        Background Color
                                        <input
                                            type="color"
                                            value={draft.backgroundColor}
                                            onChange={(event) => setDraft((prev) => ({
                                                ...prev,
                                                backgroundColor: event.target.value,
                                            }))}
                                        />
                                    </label>

                                    <label>
                                        Color Hex
                                        <input
                                            type="text"
                                            value={draft.backgroundColor}
                                            onChange={(event) => setDraft((prev) => ({
                                                ...prev,
                                                backgroundColor: event.target.value,
                                            }))}
                                            placeholder="#ffffff"
                                        />
                                    </label>
                                </div>
                            )}

                            {draft.backgroundType === "gradient" && (
                                <>
                                    <div className="template-editor-form__grid">
                                        <label>
                                            Gradient Start
                                            <input
                                                type="color"
                                                value={draft.backgroundGradientStart}
                                                onChange={(event) => setDraft((prev) => ({
                                                    ...prev,
                                                    backgroundGradientStart: event.target.value,
                                                }))}
                                            />
                                        </label>

                                        <label>
                                            Gradient End
                                            <input
                                                type="color"
                                                value={draft.backgroundGradientEnd}
                                                onChange={(event) => setDraft((prev) => ({
                                                    ...prev,
                                                    backgroundGradientEnd: event.target.value,
                                                }))}
                                            />
                                        </label>
                                    </div>

                                    <label>
                                        Gradient Angle
                                        <input
                                            type="number"
                                            min={0}
                                            max={360}
                                            step={1}
                                            value={draft.backgroundGradientAngle}
                                            onChange={(event) => setDraft((prev) => ({
                                                ...prev,
                                                backgroundGradientAngle: Number(event.target.value) || 0,
                                            }))}
                                        />
                                    </label>
                                </>
                            )}

                            {draft.backgroundType === "image" && (
                                <div className="template-editor-upload">
                                    <div className="template-editor-upload__label-row">
                                        <span>Background Image</span>
                                        <label className="template-editor-upload__button">
                                            {isUploading ? "Uploading..." : "Upload Image"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUploadBackground}
                                                disabled={isUploading}
                                            />
                                        </label>
                                    </div>

                                    {draft.backgroundImageUrl ? (
                                        <>
                                            <div className="template-editor-upload__preview-wrap">
                                                <img src={resolvedBackgroundPreviewUrl} alt="Template background preview" />
                                            </div>
                                            <input
                                                type="text"
                                                value={draft.backgroundImageUrl}
                                                onChange={(event) => setDraft((prev) => ({
                                                    ...prev,
                                                    backgroundImageUrl: event.target.value,
                                                }))}
                                            />
                                        </>
                                    ) : (
                                        <p className="template-editor-upload__placeholder">No background image selected.</p>
                                    )}
                                </div>
                            )}

                            <div className="template-editor-options">
                                <div className="template-editor-option-row">
                                    <div>
                                        <strong>Skip AI Background Removal</strong>
                                        <p>When loading images from URL (?img=...), skip AI processing and use original images</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`template-editor-switch ${draft.skipAIBackgroundRemoval ? "is-on" : ""}`}
                                        aria-pressed={draft.skipAIBackgroundRemoval}
                                        onClick={() => setDraft((prev) => ({
                                            ...prev,
                                            skipAIBackgroundRemoval: !prev.skipAIBackgroundRemoval,
                                        }))}
                                    >
                                        <span />
                                    </button>
                                </div>

                                <div className="template-editor-option-row">
                                    <div>
                                        <strong>Default Branding Enabled</strong>
                                        <p>If enabled, branding is selected by default when this template is applied in editor</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`template-editor-switch ${draft.defaultBrandingEnabled ? "is-on" : ""}`}
                                        aria-pressed={draft.defaultBrandingEnabled}
                                        onClick={() => setDraft((prev) => ({
                                            ...prev,
                                            defaultBrandingEnabled: !prev.defaultBrandingEnabled,
                                        }))}
                                    >
                                        <span />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </main>

                <aside className="template-editor-preview" aria-label="Live preview panel">
                    <h3>Live Preview</h3>
                    <p>Upload test images to see how the template looks.</p>

                    <div className="template-editor-preview__lock-row">
                        <div>
                            <strong>Lock Aspect Ratio</strong>
                            <p className="template-editor-preview__lock-subtitle">Maintains proportions while resizing</p>
                        </div>
                        <button
                            type="button"
                            className={`template-editor-preview__toggle ${lockAspectRatio ? "is-on" : ""}`}
                            onClick={() => setLockAspectRatio((prev) => !prev)}
                            aria-pressed={lockAspectRatio}
                        >
                            <span />
                        </button>
                    </div>

                    <div className="template-editor-preview__ratio-grid">
                        <button
                            type="button"
                            className={previewRatio === "square" ? "is-active" : ""}
                            onClick={() => setPreviewRatio("square")}
                        >
                            1:1 SQ
                        </button>
                        <button
                            type="button"
                            className={previewRatio === "landscape" ? "is-active" : ""}
                            onClick={() => setPreviewRatio("landscape")}
                        >
                            3:2 LS
                        </button>
                        <button
                            type="button"
                            className={previewRatio === "portrait" ? "is-active" : ""}
                            onClick={() => setPreviewRatio("portrait")}
                        >
                            2:3 PT
                        </button>
                    </div>

                    <div className={`template-editor-preview__canvas is-${previewRatio}`} style={previewCanvasStyle}>
                        {draft.backgroundType === "image" && resolvedBackgroundPreviewUrl ? (
                            <img src={resolvedBackgroundPreviewUrl} alt="Live template preview" />
                        ) : (
                            <div className="template-editor-preview__empty">
                                {draft.backgroundType === "image" ? "No background image selected." : ""}
                            </div>
                        )}

                        <div className="template-editor-preview__placement-box" aria-hidden="true" />
                    </div>

                    <button type="button" className="template-editor-preview__upload-test" disabled>
                        Upload Test Images
                    </button>

                    <div className="template-editor-preview__tip">
                        Drag the blue border in advanced editor to reposition products. Positioning and layout values update automatically.
                    </div>
                </aside>
            </div>
        </section>
    );
}
