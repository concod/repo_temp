import { useState } from "react";
import DeleteIcon from "coreAssets/chatbot/delete_icon.svg";
import EditIcon from "coreAssets/chatbot/edit_icon.svg";
import ConfirmIcon from "coreAssets/chatbot/confirm_icon.svg";
import { useStyles } from "../styling.js";

const Memories = (props) => {
  const {
    memories = [],
    tabFilter,
    onDelete,
    onEdit,
    loading,
    updating,
  } = props;
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const classes = useStyles();

  const filtered = Array.isArray(memories)
    ? memories.filter((m) => m?.tab === tabFilter)
    : [];

  const startEditing = (memory) => {
    setEditingId(memory.memory_id);
    setEditingText(memory.new_memory || "");
  };

  const confirmEdit = (memory) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    onEdit && onEdit(memory, trimmed);
    setEditingId(null);
  };

  if (loading) {
    return <div className={classes.memoryLoadingOverlay}>Loading memories…</div>;
  }

  if (!loading && filtered.length === 0) {
    return <div className={classes.memoryLoadingOverlay}>No memories to show</div>;
  }

  return (
    <div className={classes.outerWrapper}>
      {updating && (
        <div className={classes.actionLoadingOverlay}>
          <div className={classes.actionLoadingOverlayText}>Updating…</div>
        </div>
      )}
      {filtered.map((memory) => (
        <div key={memory.memory_id} className={classes.memorySection}>
          {editingId === memory.memory_id ? (
            <div className={classes.memoryTextSection}>
              <input
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                autoFocus
                className={classes.memoryTextInputSection}
              />
              <button
                aria-label="Confirm edit"
                onClick={() => confirmEdit(memory)}
                className={classes.editConfirmButton}
              >
                <span className={classes.confirmButton}>
                  <ConfirmIcon className={classes.confirmIconSvg} />
                </span>
              </button>
            </div>
          ) : (
            <div className={classes.memoryText}>{memory.new_memory}</div>
          )}
          <div className={classes.separator} />
          {editingId !== memory.memory_id && (
            <div className={classes.actionsRow}>
              <button
                aria-label="Edit memory"
                onClick={() => startEditing(memory)}
                className={classes.actionButton}
              >
                <span className={classes.iconWrapSmall}>
                  <EditIcon className={classes.iconSvgSmall} />
                </span>
                <span className={classes.editText}>Edit</span>
              </button>
              <button
                aria-label="Delete memory"
                onClick={() => onDelete && onDelete(memory.memory_id)}
                className={classes.actionButton}
              >
                <span className={classes.iconWrapSmall}>
                  <DeleteIcon className={classes.iconSvgSmall} />
                </span>
                <span className={classes.deleteText}>Delete</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default Memories;
