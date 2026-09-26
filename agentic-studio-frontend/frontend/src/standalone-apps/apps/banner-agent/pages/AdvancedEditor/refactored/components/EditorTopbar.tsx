import type { EditorController } from "./types";

interface EditorTopbarProps {
    controller: EditorController;
}

export function EditorTopbar({ controller }: EditorTopbarProps) {
    const {
        navigate,
        brandingSettings,
        setBrandingEnabled,
        isBackgroundRemoving,
        isHeroAdjustMode,
        heroAdjustTargetRatio,
        activeSourceImageUrl,
        isCatalogueProcessing,
        isAssetUploadProcessing,
        openSaveModal,
        openCatalogueModal,
        openAssetUploadModal,
        setIsVariationsModalOpen,
    } = controller;

    return (
        <header className="advanced-editor-topbar">
            <div className="advanced-editor-topbar__left">
                <button
                    type="button"
                    className="advanced-editor-topbar__back-button"
                    aria-label="Back"
                    onClick={() => navigate(-1)}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M15 18L9 12L15 6" />
                    </svg>
                </button>
                <div className="advanced-editor-topbar__title-block">
                    <h1>Advanced Editor</h1>
                    <p>Edit and generate ad-ready visuals for Banner Agent.</p>
                </div>
            </div>
            <div className="advanced-editor-topbar__right">
                <label className="advanced-editor-branding-toggle" htmlFor="advanced-editor-branding-toggle">
                    <span>Branding</span>
                    <input
                        id="advanced-editor-branding-toggle"
                        type="checkbox"
                        checked={brandingSettings.enabled}
                        onChange={(event) => {
                            setBrandingEnabled(event.target.checked);
                        }}
                    />
                </label>
                <button
                    type="button"
                    className="advanced-editor-save-btn"
                    onClick={openSaveModal}
                    disabled={!activeSourceImageUrl || isBackgroundRemoving || isHeroAdjustMode}
                    title={isBackgroundRemoving ? "Please wait until background removal is complete." : undefined}
                >
                    Save
                </button>
                <button
                    type="button"
                    className="advanced-editor-catalogue-btn"
                    onClick={openCatalogueModal}
                    disabled={isHeroAdjustMode || isCatalogueProcessing}
                >
                    Catalogue
                </button>
                <button
                    type="button"
                    className="advanced-editor-catalogue-btn"
                    onClick={openAssetUploadModal}
                    disabled={isHeroAdjustMode || isAssetUploadProcessing}
                >
                    Upload
                </button>
                <button
                    type="button"
                    className="advanced-editor-settings-btn"
                    onClick={() => navigate("/apps/banner-agent/template-editor")}
                >
                    Settings
                </button>
                {isHeroAdjustMode && heroAdjustTargetRatio ? (
                    <button type="button" className="advanced-editor-pill" disabled>
                        Hero adjust modal: {heroAdjustTargetRatio.label} ({heroAdjustTargetRatio.ratio})
                    </button>
                ) : (
                    <button
                        type="button"
                        className="advanced-editor-export-btn"
                        onClick={() => setIsVariationsModalOpen(true)}
                        disabled={!activeSourceImageUrl || isBackgroundRemoving}
                        title={isBackgroundRemoving ? "Please wait until background removal is complete." : undefined}
                    >
                        AI Variations
                    </button>
                )}
            </div>
        </header>
    );
}
