import { bannerAgentConfig } from "../config/bannerAgentConfig";
import { InteractionEvent, trackInteraction } from "./activityLogService";

const AUTH_STORAGE_KEY = bannerAgentConfig.authStorageKey;
const BANNER_AGENT_UNAUTHORIZED_EVENT = "banner-agent:unauthorized";

export interface UserSessionListItemApi {
    session_id?: string | null;
    first_request?: string | null;
    last_request?: string | null;
    request_count?: number | null;
    avg_execution_time?: number | null;
    agents_used?: string | null;
    session_title?: string | null;
}

export interface UserSessionsApiResponse {
    user_email?: string | null;
    total_sessions?: number | null;
    sessions?: UserSessionListItemApi[] | null;
}

export interface ConversationMessageBlockApi {
    type?: string | null;
    content?: unknown;
    data?: unknown;
}

export interface ConversationMessageApi {
    id?: number | string | null;
    timestamp?: string | null;
    user_input?: string | null;
    ai_message?: {
        type?: string | null;
        content?: {
            text?: string | null;
            html?: string | null;
            display_metadata?: unknown;
            suggestive_questions?: string[] | null;
            suggestiveQuestions?: string[] | null;
        } | null;
        display_metadata?: unknown;
        suggestive_questions?: string[] | null;
        suggestiveQuestions?: string[] | null;
        message_blocks?: ConversationMessageBlockApi[] | null;
    } | null;
    log_url?: string | null;
    agent_name?: string | null;
    execution_time?: number | null;
    execution_id?: string | null;
    feedback?: unknown;
}

export interface SessionConversationApiResponse {
    session_id?: string | null;
    total_messages?: number | null;
    messages?: ConversationMessageApi[] | null;
}

export interface SavedAssetApiItem {
    image_url?: string | null;
    user_input?: string | null;
    created_at?: string | null;
    confidence?: string | null;
    dimensions?: string | null;
    method?: string | null;
    agent_name?: string | null;
    session_id?: string | null;
}

export interface SavedAssetsApiResponse {
    assets?: SavedAssetApiItem[] | null;
}

export interface ProjectApiItem {
    id?: string | null;
    project_name?: string | null;
    description?: string | null;
    agent_name?: string | null;
    asset_count?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface ProjectsApiResponse {
    projects?: ProjectApiItem[] | null;
}

export interface CreateProjectPayload {
    project_name: string;
    description?: string;
    agent_id?: string;
    agent_name?: string;
}

export interface CreateProjectResponse {
    project?: ProjectApiItem | null;
}

export interface UpdateProjectPayload {
    project_name?: string;
    description?: string;
}

export interface ProjectMutationResponse {
    success?: boolean;
}

export interface ProjectAssetMetadata {
    image_data?: string;
    source: string;
    dimensions: string;
    original_url?: string;
    type?: string;
    video_url?: string;
}

export interface CreateProjectAssetPayload {
    asset_name: string;
    description?: string;
    metadata: ProjectAssetMetadata;
}

export interface CreateProjectAssetResponse {
    success?: boolean;
}

export interface ProjectAssetApiItem {
    id?: string | null;
    project_id?: string | null;
    asset_url?: string | null;
    asset_name?: string | null;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at?: string | null;
}

export interface ProjectDetailApiResponse extends ProjectApiItem {
    assets?: ProjectAssetApiItem[] | null;
}

type AgentResponse = {
    text: string;
    isHtml?: boolean;
    sources: string[];
    sessionId?: string;
    editableImageUrls: string[];
    productImageUrls: string[];
};

type DisplayMetadataDetail = {
    label?: unknown;
    value?: unknown;
};

type DisplayMetadataProduct = {
    name?: unknown;
    product_image_url?: unknown;
    details?: unknown;
};

type DisplayMetadataPayload = {
    image_urls?: unknown;
    confidence?: unknown;
    generation_details?: unknown;
    products_used?: unknown;
};

const GENERATED_IMAGE_URL_PATTERN =
    /(?:https?:\/\/[^\s"'<>]+)?\/generated_images\/[^\s"'<>]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>]*)?/gi;

const toNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const getSafeHttpUrl = (value: unknown): string | null => {
    const raw = toNonEmptyString(value);
    if (!raw) return null;

    try {
        const parsed = new URL(raw);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
    } catch {
        return null;
    }

    return null;
};

const normalizeGenerationLabel = (label: string): string => {
    const normalized = label.trim().toLowerCase();

    if (normalized === "method") return "Generation Method";
    if (normalized === "dimensions") return "Output Dimensions";
    if (normalized === "prompt adherence") return "Prompt Adherence";
    return label;
};

export function getDisplayMetadataImageUrls(displayMetadata: unknown): string[] {
    if (typeof displayMetadata !== "object" || displayMetadata === null) {
        return [];
    }

    const record = displayMetadata as DisplayMetadataPayload;
    if (!Array.isArray(record.image_urls)) {
        return [];
    }

    return record.image_urls
        .map((url) => getSafeHttpUrl(url))
        .filter((url): url is string => Boolean(url));
}

export function getDisplayMetadataProductImageUrls(displayMetadata: unknown): string[] {
    if (typeof displayMetadata !== "object" || displayMetadata === null) {
        return [];
    }

    const record = displayMetadata as DisplayMetadataPayload;
    if (!Array.isArray(record.products_used)) {
        return [];
    }

    const seen = new Set<string>();

    return record.products_used
        .map((product) => {
            if (typeof product !== "object" || product === null) {
                return null;
            }

            return getSafeHttpUrl((product as DisplayMetadataProduct).product_image_url);
        })
        .filter((url): url is string => {
            if (!url || seen.has(url)) {
                return false;
            }
            seen.add(url);
            return true;
        });
}

function extractGeneratedImageUrls(value: unknown): string[] {
    if (typeof value !== "string" || !value.trim()) {
        return [];
    }

    const matches = value.match(GENERATED_IMAGE_URL_PATTERN) ?? [];
    const normalized = new Set<string>();

    matches.forEach((match) => {
        const candidate = match.trim().replace(/^['"]|['"]$/g, "");
        if (!candidate) return;

        if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
            const safeUrl = getSafeHttpUrl(candidate);
            if (safeUrl) {
                normalized.add(safeUrl);
            }
            return;
        }

        if (candidate.startsWith("/generated_images/")) {
            normalized.add(candidate);
            return;
        }

        if (candidate.startsWith("generated_images/")) {
            normalized.add(`/${candidate}`);
        }
    });

    return Array.from(normalized);
}

export function renderDisplayMetadataHtml(displayMetadata: unknown): string | null {
    if (typeof displayMetadata !== "object" || displayMetadata === null) {
        return null;
    }

    const record = displayMetadata as DisplayMetadataPayload;
    const generationDetails = Array.isArray(record.generation_details)
        ? (record.generation_details as DisplayMetadataDetail[])
        : [];
    const imageUrls = getDisplayMetadataImageUrls(record);
    const productsUsed = Array.isArray(record.products_used)
        ? (record.products_used as DisplayMetadataProduct[])
        : [];

    const normalizedProducts = productsUsed.map((product, index) => {
        const name = toNonEmptyString(product?.name) ?? `Product ${index + 1}`;
        const imageUrl = getSafeHttpUrl(product?.product_image_url);
        const details = Array.isArray(product?.details)
            ? (product.details as DisplayMetadataDetail[])
            : [];

        const detailRows = details
            .map((detail) => {
                const label = toNonEmptyString(detail?.label);
                const value = toNonEmptyString(detail?.value);
                if (!label || !value) return "";

                return [
                    `<div class="ba-chatbot__meta-row">`,
                    `<span class="ba-chatbot__meta-row-label">${escapeHtml(label)}</span>`,
                    `<span class="ba-chatbot__meta-row-value">${escapeHtml(value)}</span>`,
                    `</div>`,
                ].join("");
            })
            .filter(Boolean)
            .join("");

        return {
            name,
            imageUrl,
            detailRows,
        };
    });

    const primaryProductName = normalizedProducts[0]?.name ?? null;
    const confidence = toNonEmptyString(record.confidence);

    const generationRows = generationDetails
        .map((detail) => {
            const label = toNonEmptyString(detail?.label);
            const value = toNonEmptyString(detail?.value);
            if (!label || !value) return "";

            return [
                `<div class="ba-chatbot__meta-row">`,
                `<span class="ba-chatbot__meta-row-label">${escapeHtml(normalizeGenerationLabel(label))}</span>`,
                `<span class="ba-chatbot__meta-row-value">${escapeHtml(value)}</span>`,
                `</div>`,
            ].join("");
        })
        .filter(Boolean)
        .join("");

    const productSections = normalizedProducts
        .map((product) => {
            const escapedProductName = escapeHtml(product.name);
            const productImageRow = product.imageUrl
                ? [
                    `<div class="ba-chatbot__meta-row">`,
                    `<span class="ba-chatbot__meta-row-label">Product Image URL</span>`,
                    `<span class="ba-chatbot__meta-row-value"><a href="${escapeHtml(product.imageUrl)}" target="_blank" rel="noopener noreferrer">View product image</a></span>`,
                    `</div>`,
                ].join("")
                : "";

            return [
                `<article class="ba-chatbot__meta-subcard">`,
                `<p class="ba-chatbot__meta-subheading">${escapedProductName}</p>`,
                product.detailRows || `<p class="ba-chatbot__meta-empty">No product details available</p>`,
                productImageRow,
                `</article>`,
            ].join("");
        })
        .join("");

    const firstImageUrl = imageUrls[0] ?? null;
    const escapedFirstImageUrl = firstImageUrl ? escapeHtml(firstImageUrl) : "";
    const confidenceBadge = confidence
        ? `<span class="ba-chatbot__meta-confidence">${escapeHtml(confidence)} confidence</span>`
        : "";

    const hasContent = Boolean(
        confidenceBadge ||
        primaryProductName ||
        generationRows ||
        productSections ||
        firstImageUrl ||
        normalizedProducts.some((product) => Boolean(product.imageUrl))
    );

    if (!hasContent) {
        return null;
    }

    const previewCards: string[] = [];

    if (firstImageUrl) {
        previewCards.push(
            [
                `<article class="ba-chatbot__meta-preview-card">`,
                `<div class="ba-chatbot__meta-banner-thumb"><img src="${escapedFirstImageUrl}" alt="Generated banner preview" loading="lazy" /></div>`,
                `<div class="ba-chatbot__meta-banner-content">`,
                `<p class="ba-chatbot__meta-banner-title">Banner image</p>`,
                `<a class="ba-chatbot__meta-link-btn" href="${escapedFirstImageUrl}" target="_blank" rel="noopener noreferrer">View full image</a>`,
                `</div>`,
                `</article>`,
            ].join("")
        );
    }

    normalizedProducts.forEach((product, index) => {
        if (!product.imageUrl) {
            return;
        }

        const escapedProductImageUrl = escapeHtml(product.imageUrl);
        const productPreviewTitle = normalizedProducts.length > 1 ? `Product image ${index + 1}` : "Product image";
        previewCards.push(
            [
                `<article class="ba-chatbot__meta-preview-card">`,
                `<div class="ba-chatbot__meta-banner-thumb"><img src="${escapedProductImageUrl}" alt="Product image preview" loading="lazy" /></div>`,
                `<div class="ba-chatbot__meta-banner-content">`,
                `<p class="ba-chatbot__meta-banner-title">${escapeHtml(productPreviewTitle)}</p>`,
                `<a class="ba-chatbot__meta-link-btn" href="${escapedProductImageUrl}" target="_blank" rel="noopener noreferrer">View product image</a>`,
                `</div>`,
                `</article>`,
            ].join("")
        );
    });

    const previewSection = previewCards.length > 0
        ? [
            `<section class="ba-chatbot__meta-card ba-chatbot__meta-card--banner">`,
            `<p class="ba-chatbot__meta-heading">Image Previews</p>`,
            `<div class="ba-chatbot__meta-preview-grid">${previewCards.join("")}</div>`,
            `</section>`,
        ].join("")
        : "";

    return [
        `<div class="ba-chatbot__display-meta">`,
        `<div class="ba-chatbot__meta-header">`,
        primaryProductName
            ? `<p class="ba-chatbot__meta-product-name">${escapeHtml(primaryProductName)}</p>`
            : `<p class="ba-chatbot__meta-product-name">Banner generation report</p>`,
        confidenceBadge,
        `</div>`,
        `<div class="ba-chatbot__meta-grid">`,
        `<section class="ba-chatbot__meta-card">`,
        `<p class="ba-chatbot__meta-heading">Generation Details</p>`,
        generationRows || `<p class="ba-chatbot__meta-empty">No generation details available</p>`,
        `</section>`,
        `<section class="ba-chatbot__meta-card">`,
        `<p class="ba-chatbot__meta-heading">Products Used (${normalizedProducts.length})</p>`,
        productSections || `<p class="ba-chatbot__meta-empty">No product details available</p>`,
        `</section>`,
        `</div>`,
        previewSection,
        `</div>`,
    ].join("");
}

export class BannerAgentService {
    private config = bannerAgentConfig;

    private getStoredTokenData(): Record<string, unknown> | null {
        if (typeof window === "undefined") return null;

        try {
            const stored = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
            return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }

    private notifyUnauthorized(): never {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent(BANNER_AGENT_UNAUTHORIZED_EVENT));
        }
        throw new Error("Session expired. Please login again.");
    }

    private assertAuthorized(response: Response): void {
        if (response.status === 401) {
            this.notifyUnauthorized();
        }
    }

    private getAccessToken(): string | null {
        const tokenData = this.getStoredTokenData();
        return typeof tokenData?.access_token === "string" && tokenData.access_token.trim()
            ? tokenData.access_token
            : null;
    }

    private getUserEmail(): string | null {
        const tokenData = this.getStoredTokenData();
        return typeof tokenData?.user_email === "string" && tokenData.user_email.trim()
            ? tokenData.user_email
            : null;
    }

    private buildAuthHeaders(): Record<string, string> {
        const token = this.getAccessToken();

        if (!token) {
            throw new Error("Authentication token is missing. Please login again.");
        }

        return {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "AGENT-API-KEY": this.config.apiKey,
        };
    }

    private buildExecuteHeaders(): Record<string, string> {
        const token = this.getAccessToken();

        return {
            "Content-Type": "application/json",
            "AGENT-API-KEY": this.config.apiKey,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    async fetchUserSessions(): Promise<UserSessionsApiResponse> {
        const sessionsUrl = new URL("api/user-sessions", this.config.baseUrl);
        sessionsUrl.searchParams.set("agent_id", this.config.agentId);

        const response = await fetch(sessionsUrl.toString(), {
            method: "GET",
            headers: this.buildAuthHeaders(),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to fetch previous chats.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as UserSessionsApiResponse;
    }

    async fetchSessionConversation(sessionId: string): Promise<SessionConversationApiResponse> {
        const encodedSessionId = encodeURIComponent(sessionId);
        const response = await fetch(
            `${this.config.baseUrl}api/user-sessions/session/${encodedSessionId}/conversation`,
            {
                method: "GET",
                headers: this.buildAuthHeaders(),
            }
        );

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to fetch session conversation.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as SessionConversationApiResponse;
    }

    async fetchSavedAssets(agentId?: string): Promise<SavedAssetsApiResponse> {
        const savedAssetsUrl = new URL("api/saved-assets", this.config.baseUrl);
        const resolvedAgentId = agentId || this.config.agentId;

        if (resolvedAgentId) {
            savedAssetsUrl.searchParams.set("agent_id", resolvedAgentId);
        }

        const response = await fetch(savedAssetsUrl.toString(), {
            method: "GET",
            headers: this.buildAuthHeaders(),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to fetch saved assets.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as SavedAssetsApiResponse;
    }

    async fetchProjects(agentId?: string): Promise<ProjectsApiResponse> {
        const projectsUrl = new URL("api/projects", this.config.baseUrl);
        const resolvedAgentId = agentId || this.config.agentId;

        if (resolvedAgentId) {
            projectsUrl.searchParams.set("agent_id", resolvedAgentId);
        }

        const response = await fetch(projectsUrl.toString(), {
            method: "GET",
            headers: this.buildAuthHeaders(),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to fetch projects.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as ProjectsApiResponse;
    }

    async fetchProjectById(projectId: string): Promise<ProjectDetailApiResponse> {
        const encodedProjectId = encodeURIComponent(projectId);
        const projectUrl = new URL(`api/projects/${encodedProjectId}`, this.config.baseUrl);

        const response = await fetch(projectUrl.toString(), {
            method: "GET",
            headers: this.buildAuthHeaders(),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to fetch project.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as ProjectDetailApiResponse;
    }

    async createProject(payload: CreateProjectPayload): Promise<CreateProjectResponse> {
        const projectsUrl = new URL("api/projects", this.config.baseUrl);

        const response = await fetch(projectsUrl.toString(), {
            method: "POST",
            headers: {
                ...this.buildAuthHeaders(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to create project.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as CreateProjectResponse;
    }

    async updateProject(projectId: string, payload: UpdateProjectPayload): Promise<ProjectMutationResponse> {
        const encodedProjectId = encodeURIComponent(projectId);
        const projectsUrl = new URL(`api/projects/${encodedProjectId}`, this.config.baseUrl);

        const response = await fetch(projectsUrl.toString(), {
            method: "PUT",
            headers: {
                ...this.buildAuthHeaders(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to update project.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as ProjectMutationResponse;
    }

    async createProjectAsset(
        projectId: string,
        payload: CreateProjectAssetPayload
    ): Promise<CreateProjectAssetResponse> {
        const encodedProjectId = encodeURIComponent(projectId);
        const assetsUrl = new URL(`api/projects/${encodedProjectId}/assets`, this.config.baseUrl);

        const response = await fetch(assetsUrl.toString(), {
            method: "POST",
            headers: {
                ...this.buildAuthHeaders(),
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to save asset.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as CreateProjectAssetResponse;
    }

    async deleteProject(projectId: string): Promise<ProjectMutationResponse> {
        const encodedProjectId = encodeURIComponent(projectId);
        const projectsUrl = new URL(`api/projects/${encodedProjectId}`, this.config.baseUrl);

        const response = await fetch(projectsUrl.toString(), {
            method: "DELETE",
            headers: this.buildAuthHeaders(),
        });

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "Failed to delete project.";
            try {
                const errorData = await response.json();
                if (typeof errorData?.message === "string") {
                    errorMessage = errorData.message;
                }
            } catch {
                // ignore malformed error payload
            }
            throw new Error(errorMessage);
        }

        return (await response.json()) as ProjectMutationResponse;
    }

    async sendMessage(userInput: string, sessionId?: string): Promise<AgentResponse> {
        return trackInteraction(
            InteractionEvent.AGENT_EXECUTE,
            () => this.executeAgentRequest(userInput, sessionId),
            {
                data: {
                    agent_id: this.config.agentId,
                    has_session: Boolean(sessionId),
                    input_length: userInput.trim().length,
                },
                resultData: (result) => ({
                    response_session_id: result.sessionId ?? null,
                    is_html: result.isHtml,
                    source_count: result.sources?.length ?? 0,
                    editable_image_count: result.editableImageUrls?.length ?? 0,
                    product_image_count: result.productImageUrls?.length ?? 0,
                }),
            }
        );
    }

    private async executeAgentRequest(userInput: string, sessionId?: string): Promise<AgentResponse> {
        const userEmail = this.getUserEmail();
        const payload = {
            agentId: this.config.agentId,
            userInput,
            ...(userEmail ? { user: userEmail } : {}),
            ...(sessionId ? { session_id: sessionId } : {}),
        };

        const response = await fetch(
            `${this.config.baseUrl}${this.config.apiEndpoint}`,
            {
                method: "POST",
                headers: this.buildExecuteHeaders(),
                body: JSON.stringify(payload),
            }
        );

        this.assertAuthorized(response);

        if (!response.ok) {
            let errorMessage = "An error occurred while processing your request.";

            try {
                const errorData = await response.json();
                if (errorData.message) errorMessage = errorData.message;
                else if (errorData.error) errorMessage = errorData.error;
                else if (errorData.detail) errorMessage = errorData.detail;
            } catch {
                if (response.status === 401) errorMessage = "Invalid API key or agent ID";
                else if (response.status === 403) errorMessage = "Access denied to this agent";
                else if (response.status === 404) errorMessage = "Agent not found";
                else if (response.status >= 500) errorMessage = "Server error. Please try again later.";
                else errorMessage = `Request failed with status ${response.status}`;
            }

            throw new Error(errorMessage);
        }

        const responseData = (await response.json()) as Record<string, unknown>;
        const resultUnknown = responseData.result ?? responseData;
        const result =
            typeof resultUnknown === "object" && resultUnknown !== null
                ? (resultUnknown as Record<string, unknown>)
                : ({} as Record<string, unknown>);
        const resultContent =
            typeof result.content === "object" && result.content !== null
                ? (result.content as Record<string, unknown>)
                : ({} as Record<string, unknown>);

        const responseSessionId = [
            result.session_id,
            result.sessionId,
            responseData.session_id,
            responseData.sessionId,
        ].find((value) => typeof value === "string") as string | undefined;

        // Extract text
        let responseText = "";
        let isHtml = false;

        const displayMetadata = result.display_metadata ?? resultContent.display_metadata;
        const displayMetadataHtml = renderDisplayMetadataHtml(displayMetadata);
        const metadataImageUrls = getDisplayMetadataImageUrls(displayMetadata);
        const metadataProductImageUrls = getDisplayMetadataProductImageUrls(displayMetadata);
        const htmlContentCandidate = [
            result.html_content,
            resultContent.html_content,
            resultContent.html,
            responseData.html_content,
        ].find((value) => typeof value === "string" && value.trim()) as string | undefined;

        if (displayMetadataHtml) {
            responseText = displayMetadataHtml;
            isHtml = true;
        } else if (htmlContentCandidate) {
            responseText = htmlContentCandidate;
            isHtml = true;
        } else if (typeof resultContent.text === "string" && resultContent.text.trim()) {
            responseText = resultContent.text;
        } else if (typeof resultContent.response === "string" && resultContent.response.trim()) {
            responseText = resultContent.response;
        } else {
            const orderedKeys = ["answer", "response", "result", "text"];
            for (const key of orderedKeys) {
                const value = result[key];
                if (typeof value === "string" && value.trim()) {
                    responseText = value;
                    break;
                }
            }
        }

        if (!responseText && typeof resultUnknown === "string") {
            responseText = resultUnknown;
        }

        if (!responseText) {
            responseText = "Response received but could not extract text.";
        }

        // Extract sources
        const sources = Array.isArray(result.urls)
            ? (result.urls as string[])
            : Array.isArray(result.sources)
                ? (result.sources as string[])
                : typeof displayMetadata === "object" &&
                    displayMetadata !== null &&
                    Array.isArray((displayMetadata as { image_urls?: unknown }).image_urls)
                    ? ((displayMetadata as { image_urls?: unknown }).image_urls as unknown[])
                        .map((value) => getSafeHttpUrl(value))
                        .filter((value): value is string => Boolean(value))
                    : [];

        const editableImageUrls = Array.from(
            new Set<string>([
                ...metadataImageUrls,
                ...extractGeneratedImageUrls(responseText),
                ...extractGeneratedImageUrls(htmlContentCandidate),
                ...sources.flatMap((source) => extractGeneratedImageUrls(source)),
            ])
        );

        return {
            text: responseText,
            isHtml,
            sources,
            sessionId: responseSessionId,
            editableImageUrls,
            productImageUrls: metadataProductImageUrls,
        };
    }
}

export const bannerAgentService = new BannerAgentService();
