import { useAssetUpload } from "../../hooks/useAssetUpload";
import "./AssetsTopbar.scss";

export default function AssetsTopbar() {
    const { uploadState, error, triggerUpload } = useAssetUpload();
    const isUploading = uploadState === "uploading";

    return (
        <header className="assets-topbar">
            <div className="assets-topbar__left">
                <h1 className="assets-topbar__title">Assets</h1>
            </div>

            <div className="assets-topbar__right">
                {error && (
                    <span className="assets-topbar__error" role="alert">
                        {error}
                    </span>
                )}
                <button
                    type="button"
                    className="assets-topbar__upload-btn"
                    onClick={triggerUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <span className="assets-topbar__spinner" aria-hidden="true" />
                    ) : (
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M8 12V3M8 3L4.5 6.5M8 3L11.5 6.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M2.5 13.5H13.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    )}
                    <span>{isUploading ? "Uploading…" : "Upload Asset"}</span>
                </button>
            </div>
        </header>
    );
}
