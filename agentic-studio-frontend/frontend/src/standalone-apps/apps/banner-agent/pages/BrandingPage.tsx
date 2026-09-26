import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar.jsx";
import brandSettingsIcon from "../assets/brand-settings.png";
import { useBrandingStore, type BrandingBorderSettings, type LogoPosition } from "../store/brandingStore";
import "./BrandingPage.scss";

type BrandingTab = "logo" | "border" | "colors";

const LOGO_POSITIONS: Array<{ value: LogoPosition; label: string }> = [
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
];

/** Default dark color used for auto-color preview on white canvas */
const AUTO_COLOR_PREVIEW = "#0B1118";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const normalized = hex.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized[0] + normalized[0], 16),
            g: Number.parseInt(normalized[1] + normalized[1], 16),
            b: Number.parseInt(normalized[2] + normalized[2], 16),
        };
    }
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return {
            r: Number.parseInt(normalized.slice(0, 2), 16),
            g: Number.parseInt(normalized.slice(2, 4), 16),
            b: Number.parseInt(normalized.slice(4, 6), 16),
        };
    }
    return null;
}

function recolorLightPixelsInLogo(logoUrl: string, colorHex: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;
            const context = canvas.getContext("2d");
            if (!context) { reject(new Error("Canvas context unavailable")); return; }
            context.drawImage(image, 0, 0);
            let imageData: ImageData;
            try { imageData = context.getImageData(0, 0, canvas.width, canvas.height); }
            catch { reject(new Error("Image data unavailable")); return; }
            const rgb = hexToRgb(colorHex);
            if (!rgb) { reject(new Error("Invalid color")); return; }
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (avg > 190) { data[i] = rgb.r; data[i + 1] = rgb.g; data[i + 2] = rgb.b; }
            }
            context.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        image.onerror = () => reject(new Error("Failed to load logo"));
        image.src = logoUrl;
    });
}

function getEffectiveBorderColor(settings: BrandingBorderSettings): string {
    return settings.autoColor ? AUTO_COLOR_PREVIEW : settings.color;
}

function buildCanvasStyle(settings: BrandingBorderSettings): React.CSSProperties {
    const effectiveColor = getEffectiveBorderColor(settings);
    return {
        background: "#ffffff",
        border: `${Math.max(1, settings.weight)}px solid ${effectiveColor}`,
        margin: `${Math.max(0, settings.distance)}px`,
    };
}

export default function BrandingPage() {
    const settings = useBrandingStore((state) => state.settings);
    const setSettings = useBrandingStore((state) => state.setSettings);
    const [activeTab, setActiveTab] = useState<BrandingTab>("logo");
    const [showPreview, setShowPreview] = useState(false);
    const [draft, setDraft] = useState<BrandingBorderSettings>(settings);

    useEffect(() => {
        setDraft(settings);
    }, [settings]);

    const hasChanges = useMemo(
        () => JSON.stringify(draft) !== JSON.stringify(settings),
        [draft, settings]
    );

    const effectiveColor = useMemo(() => getEffectiveBorderColor(draft), [draft.autoColor, draft.color]);

    const [processedLogoUrl, setProcessedLogoUrl] = useState<string>(draft.logoUrl);

    useEffect(() => {
        if (!draft.logoUrl || !draft.logoEnabled) {
            setProcessedLogoUrl(draft.logoUrl);
            return;
        }
        let cancelled = false;
        recolorLightPixelsInLogo(draft.logoUrl, effectiveColor)
            .then((url) => { if (!cancelled) setProcessedLogoUrl(url); })
            .catch(() => { if (!cancelled) setProcessedLogoUrl(draft.logoUrl); });
        return () => { cancelled = true; };
    }, [draft.logoUrl, draft.logoEnabled, effectiveColor]);

    const logoPreviewStyle = useMemo(() => {
        const placement: Record<LogoPosition, React.CSSProperties> = {
            "top-left": { top: draft.distance + draft.logoOffsetY, left: draft.distance + draft.logoOffsetX },
            "top-right": { top: draft.distance + draft.logoOffsetY, right: draft.distance + draft.logoOffsetX },
            "bottom-left": { bottom: draft.distance + draft.logoOffsetY, left: draft.distance + draft.logoOffsetX },
            "bottom-right": { bottom: draft.distance + draft.logoOffsetY, right: draft.distance + draft.logoOffsetX },
        };

        return {
            width: Math.max(16, draft.logoSize),
            height: Math.max(16, draft.logoSize),
            ...placement[draft.logoPosition],
        };
    }, [draft.distance, draft.logoOffsetX, draft.logoOffsetY, draft.logoPosition, draft.logoSize]);

    const applyChanges = () => {
        setSettings(draft);
    };

    const discardChanges = () => {
        setDraft(settings);
    };

    return (
        <section className="assets-page branding-page">
            <Sidebar activeItem="Brand" />

            <main className="assets-page__main branding-page__main">
                <section className="assets-page__panel branding-page__panel">
                    <header className="branding-page__header">
                        <div className="branding-page__title-wrap">
                            <img src={brandSettingsIcon} alt="" aria-hidden="true" className="branding-page__title-icon" />
                            <h1>Brand Settings</h1>
                        </div>
                        <label className="branding-page__preview-toggle">
                            <input
                                type="checkbox"
                                checked={showPreview}
                                onChange={(e) => setShowPreview(e.target.checked)}
                            />
                            <span>Show Banner Preview</span>
                        </label>
                    </header>

                    <div className={`branding-page__body${showPreview ? " branding-page__body--with-preview" : ""}`}>
                        <div className="branding-page__settings">
                            <aside className="branding-page__tabs" aria-label="Brand settings sections">
                                <button
                                    type="button"
                                    className={activeTab === "logo" ? "is-active" : ""}
                                    onClick={() => setActiveTab("logo")}
                                >
                                    Logo
                                </button>
                                <button
                                    type="button"
                                    className={activeTab === "border" ? "is-active" : ""}
                                    onClick={() => setActiveTab("border")}
                                >
                                    Border
                                </button>
                                <button
                                    type="button"
                                    className={activeTab === "colors" ? "is-active" : ""}
                                    onClick={() => setActiveTab("colors")}
                                >
                                    Colours
                                </button>
                            </aside>

                            <div className="branding-page__content">
                                {activeTab === "logo" && (
                                    <div className="branding-page__section">
                                        <div className="branding-page__section-head">
                                            <h2>Logo</h2>
                                            <label className="branding-page__switch" htmlFor="branding-logo-enabled">
                                                <input
                                                    id="branding-logo-enabled"
                                                    type="checkbox"
                                                    checked={draft.logoEnabled}
                                                    onChange={(event) => {
                                                        setDraft((prev) => ({ ...prev, logoEnabled: event.target.checked }));
                                                    }}
                                                />
                                                <span />
                                            </label>
                                        </div>

                                        <div className="branding-page__logo-source">
                                            <span>Brand Logo</span>
                                            <div className="branding-page__logo-preview-chip">
                                                <img src={draft.logoUrl} alt="Brand logo" />
                                                <p>PSP logo (managed by system)</p>
                                            </div>
                                        </div>

                                        <label className="branding-page__field">
                                            <span>Position</span>
                                            <select
                                                value={draft.logoPosition}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({
                                                        ...prev,
                                                        logoPosition: event.target.value as LogoPosition,
                                                    }));
                                                }}
                                            >
                                                {LOGO_POSITIONS.map((position) => (
                                                    <option key={position.value} value={position.value}>
                                                        {position.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="branding-page__slider-field">
                                            <div>
                                                <span>X Offset</span>
                                                <strong>{draft.logoOffsetX}px</strong>
                                            </div>
                                            <input
                                                type="range"
                                                min={-80}
                                                max={80}
                                                value={draft.logoOffsetX}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, logoOffsetX: Number(event.target.value) }));
                                                }}
                                            />
                                        </label>

                                        <label className="branding-page__slider-field">
                                            <div>
                                                <span>Y Offset</span>
                                                <strong>{draft.logoOffsetY}px</strong>
                                            </div>
                                            <input
                                                type="range"
                                                min={-80}
                                                max={80}
                                                value={draft.logoOffsetY}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, logoOffsetY: Number(event.target.value) }));
                                                }}
                                            />
                                        </label>

                                        <label className="branding-page__slider-field">
                                            <div>
                                                <span>Size</span>
                                                <strong>{draft.logoSize}px</strong>
                                            </div>
                                            <input
                                                type="range"
                                                min={24}
                                                max={180}
                                                value={draft.logoSize}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, logoSize: Number(event.target.value) }));
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {activeTab === "border" && (
                                    <div className="branding-page__section">
                                        <div className="branding-page__section-head">
                                            <h2>Border</h2>
                                            <label className="branding-page__switch" htmlFor="branding-enabled">
                                                <input
                                                    id="branding-enabled"
                                                    type="checkbox"
                                                    checked={draft.enabled}
                                                    onChange={(event) => {
                                                        setDraft((prev) => ({ ...prev, enabled: event.target.checked }));
                                                    }}
                                                />
                                                <span />
                                            </label>
                                        </div>

                                        <label className="branding-page__field branding-page__field--inline">
                                            <span>Auto Color</span>
                                            <input
                                                type="checkbox"
                                                checked={draft.autoColor}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, autoColor: event.target.checked }));
                                                }}
                                            />
                                        </label>

                                        <label className="branding-page__field">
                                            <span>Border Color</span>
                                            <div className="branding-page__color-row">
                                                <input
                                                    type="color"
                                                    value={draft.color}
                                                    onChange={(event) => {
                                                        setDraft((prev) => ({ ...prev, color: event.target.value }));
                                                    }}
                                                    disabled={draft.autoColor}
                                                />
                                                <input
                                                    type="text"
                                                    value={draft.color}
                                                    onChange={(event) => {
                                                        setDraft((prev) => ({ ...prev, color: event.target.value }));
                                                    }}
                                                    disabled={draft.autoColor}
                                                />
                                            </div>
                                        </label>

                                        <label className="branding-page__slider-field">
                                            <div>
                                                <span>Weight</span>
                                                <strong>{draft.weight}px</strong>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={48}
                                                value={draft.weight}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, weight: Number(event.target.value) }));
                                                }}
                                            />
                                        </label>

                                        <label className="branding-page__slider-field">
                                            <div>
                                                <span>Distance</span>
                                                <strong>{draft.distance}px</strong>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={120}
                                                value={draft.distance}
                                                onChange={(event) => {
                                                    setDraft((prev) => ({ ...prev, distance: Number(event.target.value) }));
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {activeTab === "colors" && (
                                    <div className="branding-page__section">
                                        <h2>Colours</h2>
                                        <p className="branding-page__muted">
                                            Colours are controlled by Border Color and Auto Color in the Border section.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {showPreview && (
                            <aside className="branding-page__preview-pane" aria-label="Banner preview">
                                <div className="branding-page__preview-head">
                                    <h3>Banner Preview</h3>
                                    <p>Canvas with current branding applied</p>
                                </div>

                                <div className="branding-page__preview">
                                    <div className="branding-page__preview-canvas" style={buildCanvasStyle(draft)}>
                                        {draft.logoEnabled && processedLogoUrl && (
                                            <img
                                                src={processedLogoUrl}
                                                alt="Logo preview"
                                                className="branding-page__preview-logo"
                                                style={logoPreviewStyle}
                                            />
                                        )}
                                    </div>
                                </div>
                            </aside>
                        )}
                    </div>

                    <footer className="branding-page__footer">
                        <button type="button" onClick={discardChanges} disabled={!hasChanges}>
                            Cancel
                        </button>
                        <button type="button" className="is-primary" onClick={applyChanges} disabled={!hasChanges}>
                            Apply Changes
                        </button>
                    </footer>
                </section>
            </main>
        </section>
    );
}
