import type { ChatResponse } from "../types";

const GENERATED_IMAGE_PATTERN =
    /(?:https?:\/\/[\w\-._~:\/?#\[\]@!$&'()*+,;=%]*)?\/generated_images\/[\w\-\/.?=&%#]*\.(?:png|jpe?g|gif|webp)(?:\?[\w\-.?=&%#]*)?/gi;

const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;

const PROXY_GENERATED_IMAGE_BASE = "https://smart-ai-image-editor.impact-agents.ai/api/proxy/generated_images/";
const PROXY_IMAGE_QUERY_PREFIX = "/api/proxy-image?url=";
const ABSOLUTE_PROXY_IMAGE_QUERY_PREFIX = "https://smart-ai-image-editor.impact-agents.ai/api/proxy-image?url=";
const DEV_DOMAIN_SUFFIX = ".devs.impact-agents.ai";
const GENERATED_IMAGE_HOSTS = [
    "tools.impact-agents.ai",
    "tools.impactagents.ai",
    "tools-sandbox.impact-agents.ai",
    "tools-ai-council.impact-agents.ai",
    "tools-uat.impact-agents.ai",
    "localhost:8003",
];

const ALLOWED_PREVIEW_PREFIXES = [
    PROXY_GENERATED_IMAGE_BASE,
    PROXY_IMAGE_QUERY_PREFIX,
    ABSOLUTE_PROXY_IMAGE_QUERY_PREFIX,
    "https://tools.impact-agents.ai/generated_images/",
    "http://tools.impact-agents.ai/generated_images/",
    "http://localhost:8003/generated_images/",
    "https://tools-sandbox.impact-agents.ai/generated_images/",
    "https://tools-ai-council.impact-agents.ai/generated_images/",
    "https://tools-uat.impact-agents.ai/generated_images/",
    "https://smart-ai-image-editor.impact-agents.ai/uploads/",
];

function buildProxyGeneratedImageUrl(filename: string, query: string = ""): string {
    const cleanFilename = filename.trim();
    if (!cleanFilename) {
        return "";
    }

    const normalizedQuery = query && !query.startsWith("?") ? `?${query}` : query;
    return `${PROXY_GENERATED_IMAGE_BASE}${encodeURIComponent(cleanFilename)}${normalizedQuery}`;
}

function buildProxyImageQueryUrl(fullImageUrl: string): string {
    return `${ABSOLUTE_PROXY_IMAGE_QUERY_PREFIX}${encodeURIComponent(fullImageUrl)}`;
}

function isDevDomainHost(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase();
    return normalizedHost === `devs.impact-agents.ai` || normalizedHost.endsWith(DEV_DOMAIN_SUFFIX);
}

function getGeneratedImageFilename(pathname: string): string {
    const marker = "/generated_images/";
    const markerIndex = pathname.toLowerCase().indexOf(marker);
    if (markerIndex === -1) {
        return "";
    }

    const afterMarker = pathname.slice(markerIndex + marker.length);
    const segments = afterMarker.split("/").filter(Boolean);
    return segments[segments.length - 1] ?? "";
}

export function toProxyGeneratedImageUrl(imageUrl: string): string {
    if (!imageUrl) {
        return "";
    }

    const trimmed = imageUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed) {
        return "";
    }

    if (trimmed.startsWith(PROXY_GENERATED_IMAGE_BASE)) {
        return trimmed;
    }

    if (trimmed.startsWith(PROXY_IMAGE_QUERY_PREFIX) || trimmed.startsWith(ABSOLUTE_PROXY_IMAGE_QUERY_PREFIX)) {
        return trimmed;
    }

    if (trimmed.startsWith("/uploads/")) {
        return `https://smart-ai-image-editor.impact-agents.ai${trimmed}`;
    }

    if (trimmed.startsWith("/generated_images/")) {
        const [pathWithoutQuery, query = ""] = trimmed.split("?");
        const filename = getGeneratedImageFilename(pathWithoutQuery);
        return buildProxyGeneratedImageUrl(filename, query);
    }

    try {
        const parsed = new URL(trimmed);
        const filename = getGeneratedImageFilename(parsed.pathname);

        // For dev-domain generated images, use the query proxy endpoint with full URL.
        if (filename && isDevDomainHost(parsed.hostname)) {
            return buildProxyImageQueryUrl(parsed.toString());
        }

        // Support signed Google Cloud Storage URLs that still point to /generated_images/<file>.
        if (filename) {
            return buildProxyGeneratedImageUrl(filename, parsed.search);
        }

        const isGeneratedImageHost = GENERATED_IMAGE_HOSTS.some(
            (host) => parsed.hostname === host || parsed.host === host || parsed.hostname.endsWith(`.${host}`)
        );
        if (!isGeneratedImageHost || !filename) {
            return trimmed;
        }

        return buildProxyGeneratedImageUrl(filename, parsed.search);
    } catch {
        return trimmed;
    }
}

export function getAllPreviewableImageLinksFromString(value: string): string[] {
    if (!value) return [];

    const matches = value.match(GENERATED_IMAGE_PATTERN) ?? [];
    const normalized = new Set<string>();

    matches.forEach((url) => {
        const clean = url.trim().replace(/^["']|["']$/g, "");
        if (clean && IMAGE_EXTENSION_PATTERN.test(clean)) {
            normalized.add(toProxyGeneratedImageUrl(clean));
        }
    });

    return Array.from(normalized);
}

export function getFirstPreviewableImageLinkFromString(value: string): string {
    const links = getAllPreviewableImageLinksFromString(value);
    return links[0] ?? "";
}

export function extractMessageImageUrls(text: string, sources: string[]): string[] {
    const fromText = getAllPreviewableImageLinksFromString(text);
    const all = new Set<string>(fromText);

    sources.forEach((source) => {
        getAllPreviewableImageLinksFromString(source).forEach((link) => all.add(link));
    });

    return Array.from(all).filter((url) => IMAGE_EXTENSION_PATTERN.test(url));
}

export function hasValidImageUrls(response: ChatResponse): boolean {
    if (Array.isArray(response.editableImageUrls)) {
        if (response.editableImageUrls.length > 0) {
            return true;
        }

        // Some execute payloads provide image links only in html/text when display metadata is absent.
        return extractMessageImageUrls(response.text, response.sources).length > 0;
    }

    return extractMessageImageUrls(response.text, response.sources).length > 0;
}

export function isAllowedPreviewUrl(imageUrl: string): boolean {
    const normalized = toProxyGeneratedImageUrl(imageUrl);
    return ALLOWED_PREVIEW_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function toEditorPreviewUrl(imageUrl: string): string {
    return `https://smart-ai-image-editor.impact-agents.ai?img=${encodeURIComponent(imageUrl)}`;
}

export function getFilenameFromUrl(url: string): string {
    try {
        const token = url.split("/").pop() ?? "image";
        return token.split("?")[0] || "image";
    } catch {
        return "image";
    }
}
