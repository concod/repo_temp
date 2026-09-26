import "./AdvancedEditorPage.scss";
import { AdvancedEditorView } from "./refactored/components/AdvancedEditorView";
import { useAdvancedEditorController } from "./refactored/hooks/useAdvancedEditorController";

export default function AdvancedEditorPageRefactored() {
    const controller = useAdvancedEditorController();
    return <AdvancedEditorView controller={controller} />;
}
