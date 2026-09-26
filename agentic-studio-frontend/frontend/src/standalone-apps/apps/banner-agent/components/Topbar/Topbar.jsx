import "./Topbar.scss";
import { useNavigate, useSearchParams } from "react-router-dom";
import videoConvert from "../../assets/asset-editor-icons/video-convert.svg";

export default function Topbar({
    onCreateAd,
    onConvertToVideo,
    canConvertToVideo = true,
    canCreateAd = true,
    brandingEnabled = false,
    onBrandingToggle,
}) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleBackToHome = () => {
        const sessionId = (searchParams.get("session_id") ?? "").trim();
        const nextParams = new URLSearchParams();

        if (sessionId) {
            nextParams.set("session_id", sessionId);
        }

        const query = nextParams.toString();
        navigate(query ? `../home?${query}` : "../home", { relative: "path" });
    };

    return (
        <header className="asset-editor-topbar">
            <div className="asset-editor-topbar__left">
                <button
                    className="asset-editor-topbar__back-button"
                    type="button"
                    aria-label="Back to home"
                    onClick={handleBackToHome}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M15 18L9 12L15 6" />
                    </svg>
                </button>
                <div className="asset-editor-topbar__title-block">
                    <h1>Asset Editor Tool</h1>
                    <p>Edit and generate campaign-ready assets.</p>
                </div>
            </div>

            <div className="asset-editor-topbar__right">
                <label className="asset-editor-branding-toggle" htmlFor="asset-editor-branding-toggle">
                    <span>Branding</span>
                    <input
                        id="asset-editor-branding-toggle"
                        type="checkbox"
                        checked={brandingEnabled}
                        disabled={!onBrandingToggle}
                        onChange={(event) => onBrandingToggle?.(event.target.checked)}
                    />
                </label>
                <button
                    type="button"
                    className="asset-editor-topbar__button asset-editor-topbar__button--gradient"
                    onClick={onConvertToVideo}
                    disabled={!canConvertToVideo}
                >
                    <img src={videoConvert} alt="Video Convert Icon" />
                    Convert to Video
                </button>
                <button
                    type="button"
                    className="asset-editor-topbar__button asset-editor-topbar__button--dark"
                    onClick={onCreateAd}
                    disabled={!canCreateAd}
                // disabled={true}
                >
                    Advanced Editor
                </button>
            </div>
        </header>
    );
}
