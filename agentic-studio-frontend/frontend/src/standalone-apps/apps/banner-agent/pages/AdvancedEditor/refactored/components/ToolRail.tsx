import { IMAGE_TOP_TOOLS, TOOLS } from "../advancedEditorConstants";
import { IMAGE_TOP_TOOL_ICONS, TOOL_ICONS } from "../advancedEditorAssets";
import type { EditorController } from "./types";

interface ToolRailProps {
    controller: EditorController;
}

export function ToolRail({ controller }: ToolRailProps) {
    const {
        activeTool,
        setActiveTool,
        activeRailMode,
        setActiveRailMode,
        activeImageTopTool,
        setActiveImageTopTool,
        isHeroAdjustMode,
    } = controller;

    return (
        <aside className="advanced-editor-tool-rail" aria-label="Advanced tools">
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    type="button"
                    className={`advanced-editor-tool-rail__item ${activeRailMode === "main" && activeTool === tool.id ? "is-active" : ""}`}
                    onClick={() => {
                        if (isHeroAdjustMode) {
                            return;
                        }
                        setActiveRailMode("main");
                        setActiveTool(tool.id);
                    }}
                >
                    <span className="advanced-editor-tool-rail__icon" aria-hidden="true">
                        <img
                            src={activeRailMode === "main" && activeTool === tool.id ? TOOL_ICONS[tool.id].selected : TOOL_ICONS[tool.id].normal}
                            alt=""
                        />
                    </span>
                    <span className="advanced-editor-tool-rail__label">{tool.label}</span>
                </button>
            ))}

            {IMAGE_TOP_TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    type="button"
                    className={`advanced-editor-tool-rail__item ${activeRailMode === "image" && activeImageTopTool === tool.id ? "is-active" : ""}`}
                    onClick={() => {
                        if (isHeroAdjustMode) {
                            return;
                        }
                        setActiveRailMode("image");
                        setActiveImageTopTool(tool.id);
                    }}
                >
                    <span className="advanced-editor-tool-rail__icon" aria-hidden="true">
                        <img
                            src={activeRailMode === "image" && activeImageTopTool === tool.id ? IMAGE_TOP_TOOL_ICONS[tool.id].selected : IMAGE_TOP_TOOL_ICONS[tool.id].normal}
                            alt=""
                        />
                    </span>
                    <span className="advanced-editor-tool-rail__label">{tool.label}</span>
                </button>
            ))}
        </aside>
    );
}
