import templatesIcon from "../../../assets/advanced-editor-icons/templates.svg";
import templatesSelectedIcon from "../../../assets/advanced-editor-icons/templates-selected.svg";
import templatesPanelIcon from "../../../assets/advanced-editor-icons/templates-panel.svg";
import resizeIcon from "../../../assets/advanced-editor-icons/resize.svg";
import resizeSelectedIcon from "../../../assets/advanced-editor-icons/resize-selected.svg";
import resizePanelIcon from "../../../assets/advanced-editor-icons/resize-panel.svg";
import assetsIcon from "../../../assets/advanced-editor-icons/assets.svg";
import assetsSelectedIcon from "../../../assets/advanced-editor-icons/assets-selected.svg";
import assetsPanelIcon from "../../../assets/advanced-editor-icons/assets-panel.svg";
import backgroundIcon from "../../../assets/advanced-editor-icons/background.svg";
import backgroundSelectedIcon from "../../../assets/advanced-editor-icons/background-selected.svg";
import backgroundPanelIcon from "../../../assets/advanced-editor-icons/background-panel.svg";
import textIcon from "../../../assets/advanced-editor-icons/text.svg";
import textSelectedIcon from "../../../assets/advanced-editor-icons/text-selected.svg";
import textPanelIcon from "../../../assets/advanced-editor-icons/text-panel.svg";
import filtersIcon from "../../../assets/advanced-editor-icons/filters.svg";
import filtersSelectedIcon from "../../../assets/advanced-editor-icons/filters-selected.svg";
import filtersPanelIcon from "../../../assets/advanced-editor-icons/filters-panel.svg";
import layoutIcon from "../../../assets/advanced-editor-icons/layout.svg";
import layoutSelectedIcon from "../../../assets/advanced-editor-icons/layout-selected.svg";
import layoutPanelIcon from "../../../assets/advanced-editor-icons/layout-panel.svg";
import cropIcon from "../../../assets/advanced-editor-icons/crop.svg";
import cropSelectedIcon from "../../../assets/advanced-editor-icons/crop-selected.svg";
import cropPanelIcon from "../../../assets/advanced-editor-icons/crop-panel.svg";
import adjustIcon from "../../../assets/advanced-editor-icons/adjust.svg";
import adjustSelectedIcon from "../../../assets/advanced-editor-icons/adjust-selected.svg";
import adjustPanelIcon from "../../../assets/advanced-editor-icons/adjust-panel.svg";
import shadowIcon from "../../../assets/advanced-editor-icons/shadow.svg";
import shadowSelectedIcon from "../../../assets/advanced-editor-icons/shadow-selected.svg";
import shadowPanelIcon from "../../../assets/advanced-editor-icons/shadow-panel.svg";
import reflectionIcon from "../../../assets/advanced-editor-icons/reflection.svg";
import reflectionSelectedIcon from "../../../assets/advanced-editor-icons/reflection-selected.svg";
import reflectionPanelIcon from "../../../assets/advanced-editor-icons/reflection-panel.svg";
import eraserIcon from "../../../assets/advanced-editor-icons/eraser.svg";
import eraserSelectedIcon from "../../../assets/advanced-editor-icons/eraser-selected.svg";
import eraserPanelIcon from "../../../assets/advanced-editor-icons/eraser-panel.svg";
import type { AdvancedToolKey, ImageTopTool } from "./advancedEditorTypes";

export const TOOL_ICONS: Record<AdvancedToolKey, { normal: string; selected: string; panel: string }> = {
    template: {
        normal: templatesIcon,
        selected: templatesSelectedIcon,
        panel: templatesPanelIcon,
    },
    resize: {
        normal: resizeIcon,
        selected: resizeSelectedIcon,
        panel: resizePanelIcon,
    },
    assets: {
        normal: assetsIcon,
        selected: assetsSelectedIcon,
        panel: assetsPanelIcon,
    },
    background: {
        normal: backgroundIcon,
        selected: backgroundSelectedIcon,
        panel: backgroundPanelIcon,
    },
    text: {
        normal: textIcon,
        selected: textSelectedIcon,
        panel: textPanelIcon,
    },
    filters: {
        normal: filtersIcon,
        selected: filtersSelectedIcon,
        panel: filtersPanelIcon,
    },
    layouts: {
        normal: layoutIcon,
        selected: layoutSelectedIcon,
        panel: layoutPanelIcon,
    },
};

export const IMAGE_TOP_TOOL_ICONS: Record<ImageTopTool, { normal: string; selected: string; panel: string }> = {
    crop: {
        normal: cropIcon,
        selected: cropSelectedIcon,
        panel: cropPanelIcon,
    },
    adjust: {
        normal: adjustIcon,
        selected: adjustSelectedIcon,
        panel: adjustPanelIcon,
    },
    shadow: {
        normal: shadowIcon,
        selected: shadowSelectedIcon,
        panel: shadowPanelIcon,
    },
    reflection: {
        normal: reflectionIcon,
        selected: reflectionSelectedIcon,
        panel: reflectionPanelIcon,
    },
    eraser: {
        normal: eraserIcon,
        selected: eraserSelectedIcon,
        panel: eraserPanelIcon,
    },
};
