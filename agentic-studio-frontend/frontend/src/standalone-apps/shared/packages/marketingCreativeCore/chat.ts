import type { StandaloneCreativeAppConfig } from "./types";

export type StandaloneCreativeChatResponse = {
    text: string;
    isHtml?: boolean;
    sources: string[];
};

function getResponseText(result: unknown): { text: string; isHtml?: boolean } {
    if (typeof result !== "object" || result === null) {
        return { text: "Response received but could not extract text." };
    }

    const record = result as Record<string, unknown>;

    if (typeof record.html_content === "string" && record.html_content.trim()) {
        return { text: record.html_content, isHtml: true };
    }

    const orderedKeys = ["answer", "response", "result", "text"];

    for (const key of orderedKeys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
            return { text: value };
        }
    }

    if (
        typeof record.content === "object" &&
        record.content !== null &&
        typeof (record.content as Record<string, unknown>).text === "string"
    ) {
        const contentText = (record.content as Record<string, string>).text;
        if (contentText.trim()) {
            return { text: contentText };
        }
    }

    return { text: "Response received but could not extract text." };
}

export async function sendStandaloneCreativeMessage(
    config: StandaloneCreativeAppConfig,
    userInput: string
): Promise<StandaloneCreativeChatResponse> {
    const response = await fetch(`${config.baseUrl}${config.apiEndpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "AGENT-API-KEY": config.apiKey,
        },
        body: JSON.stringify({
            agentId: config.agentId,
            userInput,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const result = (data?.result ?? data) as Record<string, unknown>;

    const sources = Array.isArray(result?.urls)
        ? (result.urls as string[])
        : Array.isArray(result?.sources)
            ? (result.sources as string[])
            : [];

    const payload = getResponseText(result);

    return {
        text: payload.text,
        isHtml: payload.isHtml,
        sources,
    };
}

export function getStandaloneCreativeErrorMessage(error: unknown): string {
    const raw = error instanceof Error ? error.message : "Unexpected error.";

    if (raw.includes("401")) {
        return "You are not authorized to access this knowledge base.";
    }

    if (raw.includes("404")) {
        return "The knowledge base service could not be found. Please try again later.";
    }

    if (raw.includes("500")) {
        return "The server encountered an error. Please check if your knowledge base ID is valid.";
    }

    return `API request failed: ${raw}. Please check if your knowledge base ID is valid.`;
}