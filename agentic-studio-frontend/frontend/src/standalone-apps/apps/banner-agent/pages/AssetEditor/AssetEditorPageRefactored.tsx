import "./AssetEditorPage.scss";
import { AssetEditorView } from "./refactored/components/AssetEditorView";
import { useAssetEditorController } from "./refactored/hooks/useAssetEditorController";

export default function AssetEditorPageRefactored() {
    const controller = useAssetEditorController();
    return <AssetEditorView controller={controller} />;
}
