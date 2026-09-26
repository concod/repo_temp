import type { EditorController } from "../types";

interface EraserPanelProps {
    controller: EditorController;
}

export function EraserPanel({ controller }: EraserPanelProps) {
    const { activeSourceImageUrl, openImageEraserModal } = controller;

    return (
        <div className="advanced-editor-placeholder">
            <p>Open the eraser modal to remove parts of the selected product image.</p>
            <p>Use Eraser or Hand mode, then save to apply changes.</p>
            <button
                type="button"
                className="advanced-editor-open-eraser-btn"
                onClick={openImageEraserModal}
                disabled={!activeSourceImageUrl}
            >
                Open Eraser Tool
            </button>
        </div>
    );
}
