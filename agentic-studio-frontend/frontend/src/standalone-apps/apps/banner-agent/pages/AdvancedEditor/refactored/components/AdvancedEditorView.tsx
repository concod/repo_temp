import { TOOLS } from "../advancedEditorConstants";
import type { EditorController } from "./types";
import { EditorTopbar } from "./EditorTopbar";
import { ToolRail } from "./ToolRail";
import { CropPanel } from "./panels/CropPanel";
import { AdjustPanel } from "./panels/AdjustPanel";
import { EraserPanel } from "./panels/EraserPanel";
import { ShadowPanel } from "./panels/ShadowPanel";
import { ReflectionPanel } from "./panels/ReflectionPanel";
import { ResizePanel } from "./panels/ResizePanel";
import { BackgroundPanel } from "./panels/BackgroundPanel";
import { TextPanel } from "./panels/TextPanel";
import { TemplatePanel } from "./panels/TemplatePanel";
import { FiltersPanel } from "./panels/FiltersPanel";
import { EditorCanvas } from "./EditorCanvas";
import { EditorModals } from "./EditorModals";
import { CatalogueSection } from "./CatalogueSection";
import { AssetUploadSection } from "./AssetUploadSection";

interface AdvancedEditorViewProps {
    controller: EditorController;
}

export function AdvancedEditorView({ controller }: AdvancedEditorViewProps) {
    const {
        activeTool,
        activeImageTopTool,
        isImageSelected,
        isHeroAdjustMode,
        isImageToolPanelRequested,
        isImageToolPanelActive,
        activePanelLabel,
        activePanelIcon,
    } = controller;

    return (
        <section className={`advanced-editor-page ${isHeroAdjustMode ? "is-hero-adjust-mode" : ""}`}>
            <EditorTopbar controller={controller} />

            <div className={`advanced-editor-shell ${isHeroAdjustMode ? "is-hero-adjust-mode" : ""}`}>
                <ToolRail controller={controller} />

                <aside className="advanced-editor-panel">
                    <div className="advanced-editor-panel__header">
                        <h2>
                            {activePanelIcon && <img src={activePanelIcon} alt="" aria-hidden="true" />}
                            <span>{activePanelLabel}</span>
                        </h2>
                    </div>

                    {isImageToolPanelRequested && !isImageSelected && (
                        <div className="advanced-editor-placeholder">
                            <p>Select the product image to open Crop, Adjust, Shadow, Reflection, and Eraser tools.</p>
                        </div>
                    )}

                    {isImageToolPanelActive && activeImageTopTool === "crop" && <CropPanel controller={controller} />}
                    {isImageToolPanelActive && activeImageTopTool === "adjust" && <AdjustPanel controller={controller} />}
                    {isImageToolPanelActive && activeImageTopTool === "eraser" && <EraserPanel controller={controller} />}
                    {isImageToolPanelActive && activeImageTopTool === "shadow" && <ShadowPanel controller={controller} />}
                    {isImageToolPanelActive && activeImageTopTool === "reflection" && <ReflectionPanel controller={controller} />}

                    {!isImageToolPanelRequested && activeTool !== "template" && activeTool !== "resize" && activeTool !== "filters" && activeTool !== "text" && activeTool !== "background" && (
                        <div className="advanced-editor-placeholder">
                            <p>{TOOLS.find((item) => item.id === activeTool)?.label} panel is next in the migration queue.</p>
                            <p>Templates are fully functional right now.</p>
                        </div>
                    )}

                    {!isImageToolPanelRequested && activeTool === "resize" && <ResizePanel controller={controller} />}
                    {!isImageToolPanelRequested && activeTool === "background" && <BackgroundPanel controller={controller} />}
                    {!isImageToolPanelRequested && activeTool === "text" && <TextPanel controller={controller} />}
                    {!isImageToolPanelRequested && activeTool === "template" && <TemplatePanel controller={controller} />}
                    {!isImageToolPanelRequested && activeTool === "filters" && <FiltersPanel controller={controller} />}
                </aside>

                <EditorCanvas controller={controller} />
            </div>

            <EditorModals controller={controller} />
            <CatalogueSection controller={controller} />
            <AssetUploadSection controller={controller} />
        </section>
    );
}
