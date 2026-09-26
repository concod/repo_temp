import type { EditorController } from "../types";

interface TextPanelProps {
    controller: EditorController;
}

export function TextPanel({ controller }: TextPanelProps) {
    const {
        textOverlays,
        selectedTextId,
        addText,
        setSelectedTextId,
        setEditingTextId,
        setIsImageSelected,
    } = controller;

    return (
        <>
            <button type="button" className="advanced-editor-text-add" onClick={() => addText()}>
                + Add text Box
            </button>

            <div className="advanced-editor-text-defaults">
                <h3>Default Text Styles</h3>
                <button
                    type="button"
                    className="advanced-editor-text-preset is-large"
                    onClick={() => addText({ text: "Add heading", fontSize: 28, bold: true, width: 280 })}
                >
                    Add heading
                </button>
                <button
                    type="button"
                    className="advanced-editor-text-preset is-bold"
                    onClick={() => addText({ text: "Add Sub Heading", fontSize: 18, bold: true, width: 260 })}
                >
                    Add Sub Heading
                </button>
                <button
                    type="button"
                    className="advanced-editor-text-preset"
                    onClick={() => addText({ text: "Add Sub Heading", fontSize: 16, width: 240 })}
                >
                    Add Sub Heading
                </button>
            </div>

            <div className="advanced-editor-text-layers" role="list" aria-label="Text layers">
                <h3>Text Layers</h3>
                {textOverlays.map((overlay) => {
                    const isSelected = selectedTextId === overlay.id;
                    return (
                        <button
                            key={overlay.id}
                            type="button"
                            className={`advanced-editor-text-layer ${isSelected ? "is-selected" : ""}`}
                            onClick={() => {
                                setSelectedTextId(overlay.id);
                                setEditingTextId(null);
                                setIsImageSelected(false);
                            }}
                        >
                            <span>{overlay.text || "Text"}</span>
                            <small>{overlay.fontFamily}, {overlay.fontSize}px</small>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
