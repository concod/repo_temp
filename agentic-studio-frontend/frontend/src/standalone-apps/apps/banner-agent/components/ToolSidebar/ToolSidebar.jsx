import "./ToolSidebar.scss";

import assetIcon from "../../assets/asset-editor-icons/asset.svg";
import assetSelectedIcon from "../../assets/asset-editor-icons/asset-selected.svg";
import cropIcon from "../../assets/asset-editor-icons/crop.svg";
import cropSelectedIcon from "../../assets/asset-editor-icons/crop-selected.svg";
import eraseIcon from "../../assets/asset-editor-icons/erase.svg";
import eraseSelectedIcon from "../../assets/asset-editor-icons/erase-selected.svg";
import expandIcon from "../../assets/asset-editor-icons/expand.svg";
import expandSelectedIcon from "../../assets/asset-editor-icons/expand-selected.svg";
import modifySelectedIcon from "../../assets/asset-editor-icons/modify-selected.svg";
import textIcon from "../../assets/asset-editor-icons/text.svg";
import textSelectedIcon from "../../assets/asset-editor-icons/text-selected.svg";

const TOOLS = [
    { key: "modify", label: "Modify" },
    { key: "asset", label: "Asset" },
    { key: "text", label: "Text" },
    { key: "erase", label: "Erase" },
    { key: "crop", label: "Crop" },
    { key: "expand", label: "Expand" },
];

const TOOL_ICONS = {
    // The provided icon set currently has no modify.svg; use selected variant as fallback for normal state.
    modify: {
        normal: modifySelectedIcon,
        selected: modifySelectedIcon,
    },
    asset: {
        normal: assetIcon,
        selected: assetSelectedIcon,
    },
    text: {
        normal: textIcon,
        selected: textSelectedIcon,
    },
    erase: {
        normal: eraseIcon,
        selected: eraseSelectedIcon,
    },
    crop: {
        normal: cropIcon,
        selected: cropSelectedIcon,
    },
    expand: {
        normal: expandIcon,
        selected: expandSelectedIcon,
    },
};

export default function ToolSidebar({ activeItem = "modify", onSelect }) {
    return (
        <aside className="tool-sidebar" aria-label="Asset editor tools">
            {TOOLS.map((tool) => {
                const isActive = tool.key === activeItem;

                return (
                    <button
                        key={tool.key}
                        type="button"
                        className={`tool-sidebar__item${isActive ? " tool-sidebar__item--active" : ""}`}
                        onClick={() => onSelect?.(tool.key)}
                    >
                        <span className="tool-sidebar__icon" aria-hidden="true">
                            <img
                                src={isActive ? TOOL_ICONS[tool.key].selected : TOOL_ICONS[tool.key].normal}
                                alt=""
                            />
                        </span>
                        <span className="tool-sidebar__label">{tool.label}</span>
                    </button>
                );
            })}
        </aside>
    );
}
