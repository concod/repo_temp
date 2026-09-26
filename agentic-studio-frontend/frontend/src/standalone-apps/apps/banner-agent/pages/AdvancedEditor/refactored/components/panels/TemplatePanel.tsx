import { resolveTemplateAssetUrl } from "../../advancedEditorUtils";
import type { EditorController } from "../types";

interface TemplatePanelProps {
    controller: EditorController;
}

export function TemplatePanel({ controller }: TemplatePanelProps) {
    const {
        isLoadingTemplates,
        isApplyingTemplate,
        activeTemplateId,
        templateError,
        filteredTemplates,
        applyTemplate,
    } = controller;

    return (
        <>
            <p className="advanced-editor-panel__subtitle">
                Choose a template to instantly set the canvas background
            </p>
            <p className="advanced-editor-feedback">
                {filteredTemplates.length} templates available
            </p>

            {isLoadingTemplates && <p className="advanced-editor-feedback">Loading templates...</p>}
            {!isLoadingTemplates && templateError && <p className="advanced-editor-feedback is-error">{templateError}</p>}
            {!isLoadingTemplates && !templateError && isApplyingTemplate && (
                <p className="advanced-editor-feedback is-loading">Updating template...</p>
            )}

            {!isLoadingTemplates && !templateError && (
                <div className="advanced-editor-template-list">
                    {filteredTemplates.map((template) => {
                        const bg = template.settings.background;
                        const thumbStyle = bg.type === "solid"
                            ? { background: bg.color }
                            : bg.type === "gradient"
                                ? { background: `linear-gradient(${bg.gradientAngle}deg, ${bg.gradientStart}, ${bg.gradientEnd})` }
                                : bg.type === "image"
                                    ? {
                                        backgroundImage: `url(${resolveTemplateAssetUrl(bg.imageUrl) || ""})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }
                                    : {
                                        background: "linear-gradient(120deg, #22c55e 0%, #e9ddb4 60%)",
                                    };

                        return (
                            <button
                                type="button"
                                key={template.id}
                                className={`advanced-editor-template-card ${template.id === activeTemplateId ? "is-selected" : ""}`}
                                disabled={isApplyingTemplate || template.id === activeTemplateId}
                                onClick={() => {
                                    if (isApplyingTemplate || template.id === activeTemplateId) {
                                        return;
                                    }
                                    void applyTemplate(template);
                                }}
                            >
                                <div className="advanced-editor-template-card__thumb" style={thumbStyle} />
                                <div className="advanced-editor-template-card__meta">
                                    <h3>{template.name}</h3>
                                    <p>{template.description || "Professional ad layout"}</p>
                                </div>
                                {template.id === activeTemplateId && <span className="advanced-editor-template-card__check">✓</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </>
    );
}
