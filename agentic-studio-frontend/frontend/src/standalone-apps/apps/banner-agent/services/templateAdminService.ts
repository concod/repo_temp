const SMART_EDITOR_BASE_URL = "https://smart-ai-image-editor.impact-agents.ai";

export type TemplateRecord = {
    /** Integer primary key from the banner_templates API. Undefined for unsaved (new) templates. */
    dbId?: number;
    id: string;
    name?: string;
    description?: string;
    templateType?: "banner" | "collage";
    thumbnail?: string;
    enableBehindTemplateLayering?: boolean;
    skipAIBackgroundRemoval?: boolean;
    defaultBrandingEnabled?: boolean;
    settings?: {
        background?: {
            type?: "transparent" | "solid" | "gradient" | "image";
            imageUrl?: string | null;
            color?: string;
            gradientStart?: string;
            gradientEnd?: string;
            gradientAngle?: number;
        };
        positioning?: {
            verticalAlignment?: number;
            horizontalAlignment?: number;
        };
        layout?: {
            productScalePercent?: number;
            productSpacing?: number;
            placementWidthPct?: number;
            placementHeightPct?: number;
        };
    };
    [key: string]: unknown;
};

type BannerTemplatesResponse = {
    status: string;
    data: any[];
    error?: string;
};

type UploadResponse = {
    url: string;
};

function mapApiToRecord(t: any): TemplateRecord {
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
        settings: t.settings ?? {},
    };
}

function mapRecordToApi(template: TemplateRecord) {
    return {
        template_id: template.id,
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnail,
        template_type: template.templateType ?? null,
        enable_behind_template_layering: template.enableBehindTemplateLayering ?? null,
        skip_ai_background_removal: template.skipAIBackgroundRemoval ?? null,
        default_branding_enabled: template.defaultBrandingEnabled ?? null,
        settings: template.settings,
    };
}

function toSmartEditorUrl(path: string): string {
    const base = SMART_EDITOR_BASE_URL.replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

async function readErrorText(response: Response): Promise<string> {
    try {
        const body = await response.json();
        const errorText = (body as { error?: string })?.error;
        if (typeof errorText === "string" && errorText.trim().length > 0) {
            return errorText;
        }
    } catch {
        // Ignore parse errors and fall back to status text.
    }

    return response.statusText || "Request failed";
}

export const templateAdminService = {
    async getTemplates(): Promise<TemplateRecord[]> {
        const response = await fetch(toSmartEditorUrl("/api/banner_templates"));

        if (!response.ok) {
            const message = await readErrorText(response);
            throw new Error(message || `Unable to load templates (${response.status})`);
        }

        const data = (await response.json()) as BannerTemplatesResponse;
        if (data.status !== "ok") {
            throw new Error(data.error || "Failed to load templates");
        }

        return Array.isArray(data.data) ? data.data.map(mapApiToRecord) : [];
    },

    async uploadTemplateImage(dataUrl: string, originalName?: string): Promise<string> {
        const response = await fetch(toSmartEditorUrl("/api/templates/upload"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ dataUrl, originalName }),
        });

        if (!response.ok) {
            const message = await readErrorText(response);
            throw new Error(message || `Unable to upload image (${response.status})`);
        }

        const data = (await response.json()) as UploadResponse;
        if (!data?.url) {
            throw new Error("Upload succeeded but no image URL was returned.");
        }

        return data.url;
    },

    async saveTemplate(template: TemplateRecord): Promise<TemplateRecord> {
        const isUpdate = !!template.dbId;
        const url = isUpdate
            ? toSmartEditorUrl(`/api/banner_templates/${template.dbId}`)
            : toSmartEditorUrl("/api/banner_templates");
        const method = isUpdate ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mapRecordToApi(template)),
        });

        if (!response.ok) {
            const message = await readErrorText(response);
            throw new Error(message || `Unable to save template (${response.status})`);
        }

        const result = await response.json();
        return mapApiToRecord(result.data);
    },

    async saveTemplates(templates: TemplateRecord[]): Promise<void> {
        for (const template of templates) {
            await templateAdminService.saveTemplate(template);
        }
    },

    async deleteTemplate(dbId: number): Promise<void> {
        const response = await fetch(toSmartEditorUrl(`/api/banner_templates/${dbId}`), {
            method: "DELETE",
        });

        if (!response.ok) {
            const message = await readErrorText(response);
            throw new Error(message || `Unable to delete template (${response.status})`);
        }
    },
};
