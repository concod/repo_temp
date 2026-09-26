export function formatMessageTime(date = new Date()): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const BANNER_IMAGE_HOSTS = ["tools.impact-agents.ai", "tools.impactagents.ai"];
const BANNER_IMAGE_LABEL = "Banner-Image-Link";
const GENERATED_BANNER_IMAGE_STORAGE_URL_PATTERN =
    /https?:\/\/storage\.googleapis\.com\/[^\s"']+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"']*)?/gi;
const GENERATED_BANNER_IMAGE_LINE_PATTERN =
    /Generated\s+banner\s+Images\s*:\s*["']?(https?:\/\/storage\.googleapis\.com\/[^\s"']+\.(?:png|jpe?g|gif|webp)(?:\?[^\s"']*)?)["']?/gi;

function isBannerImageHost(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase();
    return BANNER_IMAGE_HOSTS.some((allowedHost) => normalizedHost === allowedHost || normalizedHost.endsWith(`.${allowedHost}`));
}

export function getSourceLabel(url: string): string {
    try {
        const parsed = new URL(url);
        if (isBannerImageHost(parsed.hostname)) {
            return BANNER_IMAGE_LABEL;
        }

        const compact = `${parsed.hostname}${parsed.pathname}`;
        return compact.length > 40 ? `${compact.slice(0, 37)}...` : compact;
    } catch {
        if (/https?:\/\/tools\.impact-?agents\.ai/i.test(url)) {
            return BANNER_IMAGE_LABEL;
        }
        return url.length > 40 ? `${url.slice(0, 37)}...` : url;
    }
}

export function maskBannerImageLinksInHtml(html: string): string {
    const maskedAnchors = html.replace(
        /(<a\b[^>]*href=["']https?:\/\/(?:tools\.impact-?agents\.ai|storage\.googleapis\.com)[^"']*["'][^>]*>)(.*?)(<\/a>)/gis,
        (_match, openTag: string, innerHtml: string, closeTag: string) => {
            // Keep image anchors intact so preview thumbnails continue to render.
            if (/<img\b/i.test(innerHtml)) {
                return `${openTag}${innerHtml}${closeTag}`;
            }

            return `${openTag}${BANNER_IMAGE_LABEL}${closeTag}`;
        }
    );

    // Replace plain-text URLs only outside HTML tags so href/src attributes stay intact.
    return maskedAnchors
        .split(/(<[^>]+>)/g)
        .map((segment) =>
            segment.startsWith("<")
                ? segment
                : segment.replace(GENERATED_BANNER_IMAGE_STORAGE_URL_PATTERN, BANNER_IMAGE_LABEL)
        )
        .join("");
}

export function normalizeBannerImageLinksInText(text: string): string {
    if (!text) return text;

    const normalizedGeneratedLine = text.replace(
        GENERATED_BANNER_IMAGE_LINE_PATTERN,
        `Generated Banner Images : ${BANNER_IMAGE_LABEL}`
    );

    return normalizedGeneratedLine.replace(
        GENERATED_BANNER_IMAGE_STORAGE_URL_PATTERN,
        BANNER_IMAGE_LABEL
    );
}

export function generateMessageId(prefix: string): string {
    const seed = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${seed}`;
}
