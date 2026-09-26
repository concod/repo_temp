import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ChatMessage } from "../types";
import { maskBannerImageLinksInHtml } from "../utils/messageUtils";
import { getAllPreviewableImageLinksFromString, isAllowedPreviewUrl } from "../utils/imageUtils";
import chatDog from "../../../assets/chat-dog.svg";
import editAssetIcon from "../../../assets/editAsset.svg";
import viewAssetIcon from "../../../assets/viewAsset.svg";

const ADVANCED_EDITOR_SESSION_IMAGE_KEY = "banner-agent:advanced-editor-source";
const ADVANCED_EDITOR_PRODUCT_IMAGES_KEY = "banner-agent:advanced-editor-product-images";
const PRODUCT_IMAGE_HREF_PATTERN = /<a[^>]*href=["']([^"']+)["'][^>]*>\s*View product image\s*<\/a>/gi;

function getSafeHttpUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
    } catch {
        return null;
    }

    return null;
}

function extractProductImageUrlsFromHtml(html: string): string[] {
    if (!html) {
        return [];
    }

    const found = new Set<string>();
    let match: RegExpExecArray | null = null;

    while ((match = PRODUCT_IMAGE_HREF_PATTERN.exec(html)) !== null) {
        const href = getSafeHttpUrl(match[1] ?? "");
        if (href) {
            found.add(href);
        }
    }

    PRODUCT_IMAGE_HREF_PATTERN.lastIndex = 0;
    return Array.from(found);
}

type MessageItemProps = {
    message: ChatMessage;
};

function getTypingDelay(character: string): number {
    if (character === "." || character === "!" || character === "?") return 200;
    if (character === "," || character === ";") return 100;
    return 22;
}

export default function MessageItem({ message }: MessageItemProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [visibleText, setVisibleText] = useState(message.role === "user" || message.isHtml ? message.text : "");
    const [showMeta, setShowMeta] = useState(message.role === "user" || message.isHtml);

    const maskedHtml = useMemo(
        () => (message.isHtml ? maskBannerImageLinksInHtml(message.text) : ""),
        [message.isHtml, message.text]
    );

    useEffect(() => {
        if (message.role !== "bot" || message.isHtml || message.isError) {
            setVisibleText(message.text);
            setShowMeta(true);
            return;
        }

        let index = 0;
        let timer = 0;
        let cancelled = false;

        const typeNext = () => {
            if (cancelled) return;
            if (index >= message.text.length) {
                setShowMeta(true);
                return;
            }

            const nextChar = message.text[index];
            setVisibleText((prev) => prev + nextChar);
            index += 1;

            timer = window.setTimeout(typeNext, getTypingDelay(nextChar));
        };

        setVisibleText("");
        setShowMeta(false);
        timer = window.setTimeout(typeNext, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [message]);

    const editableImageUrls = useMemo(() => {
        const fallbackUrls = [
            ...getAllPreviewableImageLinksFromString(message.text),
            ...message.sources.flatMap((source) => getAllPreviewableImageLinksFromString(source)),
        ];
        const candidates = message.imageUrls.length > 0 ? message.imageUrls : fallbackUrls;
        const seen = new Set<string>();
        return candidates.filter((url) => {
            if (!isAllowedPreviewUrl(url) || seen.has(url)) {
                return false;
            }
            seen.add(url);
            return true;
        });
    }, [message.imageUrls, message.sources, message.text]);

    const handleEditImage = (imageUrl: string) => {
        if (!imageUrl) return;

        const params = new URLSearchParams({ img: imageUrl });
        const sessionId = (searchParams.get("session_id") ?? "").trim();
        if (sessionId) {
            params.set("session_id", sessionId);
        }
        navigate(`../assets-editor?${params.toString()}`, { relative: "path" });
    };

    const productImageUrls = useMemo(() => {
        const fromMessage = Array.isArray(message.productImageUrls) ? message.productImageUrls : [];
        const fromHtml = message.isHtml ? extractProductImageUrlsFromHtml(message.text) : [];
        const fromSources = message.sources.flatMap((source) => extractProductImageUrlsFromHtml(source));
        const merged = new Set<string>();

        [...fromMessage, ...fromHtml, ...fromSources].forEach((url) => {
            const safe = getSafeHttpUrl(url);
            if (safe) {
                merged.add(safe);
            }
        });

        return Array.from(merged);
    }, [message.isHtml, message.productImageUrls, message.sources, message.text]);

    const handleEditProductImage = () => {
        if (productImageUrls.length === 0) return;

        const [primaryProductImage] = productImageUrls;
        if (!primaryProductImage) return;

        window.sessionStorage.setItem(ADVANCED_EDITOR_SESSION_IMAGE_KEY, primaryProductImage);
        window.sessionStorage.setItem(ADVANCED_EDITOR_PRODUCT_IMAGES_KEY, JSON.stringify(productImageUrls));
        navigate("../advanced-editor?mode=banner&source=session", { relative: "path" });
    };

    const handleViewImage = (imageUrl: string) => {
        if (!imageUrl) return;

        window.open(imageUrl, "_blank", "noopener,noreferrer");
    };

    return (
        <article className={`ba-chatbot__message ba-chatbot__message--${message.role} ${message.isError ? "is-error" : ""}`}>
            <div className="ba-chatbot__message-avatar" aria-hidden="true">
                {message.role === "bot" ? (
                    <img src={chatDog} alt="Bot avatar" />
                ) : (
                    <i className={`fas ${message.isError ? "fa-exclamation-triangle" : "fa-user"}`} />
                )}
            </div>

            <div className="ba-chatbot__message-body">
                {message.isHtml ? (
                    <div className="ba-chatbot__message-text" dangerouslySetInnerHTML={{ __html: maskedHtml }} />
                ) : (
                    <div className="ba-chatbot__message-text">{visibleText}</div>
                )}

                {showMeta && (editableImageUrls.length > 0 || productImageUrls.length > 0) ? (
                    <div className="ba-chatbot__actions">
                        {editableImageUrls.map((imageUrl, index) => (
                            <div key={imageUrl} className="ba-chatbot__action-pair">
                                <button
                                    type="button"
                                    className="ba-chatbot__preview-btn"
                                    onClick={() => handleEditImage(imageUrl)}
                                >
                                    <img src={editAssetIcon} alt="" className="ba-chatbot__action-icon" aria-hidden="true" />
                                    <span>{editableImageUrls.length > 1 ? `Edit Banner Image ${index + 1}` : "Edit Banner Image"}</span>
                                </button>
                                <button
                                    type="button"
                                    className="ba-chatbot__preview-btn"
                                    onClick={() => handleViewImage(imageUrl)}
                                >
                                    <img src={viewAssetIcon} alt="" className="ba-chatbot__action-icon" aria-hidden="true" />
                                    <span>{editableImageUrls.length > 1 ? `View Image ${index + 1}` : "View Image"}</span>
                                </button>
                            </div>
                        ))}
                        {productImageUrls.length > 0 ? (
                            <div className="ba-chatbot__action-pair">
                                <button
                                    type="button"
                                    className="ba-chatbot__preview-btn"
                                    onClick={handleEditProductImage}
                                >
                                    <img src={editAssetIcon} alt="" className="ba-chatbot__action-icon" aria-hidden="true" />
                                    <span>Edit Product Image</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {showMeta ? <time className="ba-chatbot__message-time">{message.createdAt}</time> : null}
            </div>
        </article>
    );
}
