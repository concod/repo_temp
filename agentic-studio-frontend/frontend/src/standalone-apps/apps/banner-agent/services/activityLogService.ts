import { appEnv } from "../../../../config/appEnv";
import { bannerAgentConfig } from "../config/bannerAgentConfig";

/**
 * Centralized audit / usage-tracking service for the Banner Agent.
 *
 * Every meaningful, backend-driven user action is reported to the shared
 * interaction-logs API. Logging is intentionally **fire-and-forget**: a failed
 * log call must never break or block the user-facing action.
 *
 * To instrument a new action, prefer wrapping the call with `trackInteraction`,
 * which automatically records duration plus success / error / cancelled status.
 * Use `logInteraction` directly only for one-off events that are not modeled as
 * a single awaited promise.
 */

const INTERACTION_LOG_ENDPOINT = "https://tools.impact-agents.ai/api/interaction_logs";

// Service-level bearer token for the interaction-logs API. This is NOT the
// end-user's auth token (the end user is identified via the `user` field).
// TODO: move this to an environment variable / secret when available.
const INTERACTION_LOG_TOKEN =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFnZW50c0BpbXBhY3RhbmFseXRpY3MuY28iLCJleHAiOjE3ODM4NjE5MzYsImlhdCI6MTc3NjA4NTkzNn0.nhN_jWe2ZnuhH418qThylxnpeIzLb2b8d4a5LKlTHhA";

const CLIENT_NAME = "banner-agent-web";
const APP_NAME = bannerAgentConfig.name;

/** Canonical names for every backend-driven action we audit. */
export const InteractionEvent = {
    /** Agent execute API that fetches chat results. */
    AGENT_EXECUTE: "agent_execute",
    /** Asset editor modify / add objects / replace (via /generate-content). */
    ASSET_EDITOR_EDIT: "asset_editor_edit",
    /** Asset editor expand / resize (via /ai/resize-image). */
    ASSET_EDITOR_EXPAND: "asset_editor_expand",
    /** Advanced editor AI background removal. */
    ADV_EDITOR_BACKGROUND_REMOVAL: "adv_editor_background_removal",
    /** Advanced editor AI variation generation. */
    AI_VARIATION_GENERATE: "ai_variation_generate",
} as const;

export type InteractionEvent = (typeof InteractionEvent)[keyof typeof InteractionEvent];

export type InteractionStatus = "success" | "error" | "cancelled";

export interface LogInteractionParams {
    event: InteractionEvent;
    status: InteractionStatus;
    durationMs?: number;
    /** Action-specific, lightweight metadata. Never include base64 image data. */
    data?: Record<string, unknown>;
    /** Raw error (only used when status is "error"); serialized to a message. */
    error?: unknown;
    additionalInfo?: string;
}

function getStoredUserEmail(): string | null {
    if (typeof window === "undefined") return null;

    try {
        const stored = window.sessionStorage.getItem(bannerAgentConfig.authStorageKey);
        if (!stored) return null;

        const data = JSON.parse(stored) as { user_email?: unknown };
        return typeof data.user_email === "string" && data.user_email.trim()
            ? data.user_email
            : null;
    } catch {
        return null;
    }
}

function describeError(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
        return JSON.stringify(error);
    } catch {
        return "Unknown error";
    }
}

function isAbortError(error: unknown): boolean {
    return (
        (typeof DOMException !== "undefined" && error instanceof DOMException && error.name === "AbortError") ||
        (typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError")
    );
}

/**
 * Send a single audit record. Always resolves (never throws) so callers can
 * safely fire-and-forget. Failures are logged to the console for debugging.
 */
export async function logInteraction(params: LogInteractionParams): Promise<void> {
    if (typeof window === "undefined") return;

    try {
        const eventData: Record<string, unknown> = {
            status: params.status,
            env: appEnv(),
            page: window.location.pathname,
            ...(typeof params.durationMs === "number" ? { duration_ms: params.durationMs } : {}),
            ...(params.data ?? {}),
        };

        if (params.status === "error" && params.error !== undefined) {
            eventData.error_message = describeError(params.error);
        }

        const payload = {
            event_name: params.event,
            event_data: eventData,
            user: getStoredUserEmail() ?? "anonymous",
            client: CLIENT_NAME,
            app_name: APP_NAME,
            additional_info: params.additionalInfo ?? `${params.event} (${params.status})`,
        };

        await fetch(INTERACTION_LOG_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${INTERACTION_LOG_TOKEN}`,
                Referer: window.location.href,
            },
            body: JSON.stringify(payload),
            // Ensures the log survives page navigation / unload.
            keepalive: true,
        });
    } catch (logError) {
        console.warn("[activityLog] Failed to record interaction", params.event, logError);
    }
}

export interface TrackInteractionOptions<T> {
    /** Metadata known before the action runs. */
    data?: Record<string, unknown>;
    /** Extra metadata derived from the successful result. */
    resultData?: (result: T) => Record<string, unknown>;
    additionalInfo?: string;
}

/**
 * Wrap an async action so its outcome is audited automatically.
 *
 * - Records `duration_ms` for every call.
 * - Logs `success` with optional result metadata, or `error` with the message.
 * - Distinguishes user cancellations (AbortError) as `cancelled`.
 * - Re-throws the original error so caller behavior is unchanged.
 */
export async function trackInteraction<T>(
    event: InteractionEvent,
    run: () => Promise<T>,
    options?: TrackInteractionOptions<T>
): Promise<T> {
    const startedAt = Date.now();

    try {
        const result = await run();

        void logInteraction({
            event,
            status: "success",
            durationMs: Date.now() - startedAt,
            data: {
                ...(options?.data ?? {}),
                ...(options?.resultData?.(result) ?? {}),
            },
            additionalInfo: options?.additionalInfo,
        });

        return result;
    } catch (error) {
        void logInteraction({
            event,
            status: isAbortError(error) ? "cancelled" : "error",
            durationMs: Date.now() - startedAt,
            data: options?.data,
            error,
            additionalInfo: options?.additionalInfo,
        });

        throw error;
    }
}
