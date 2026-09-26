import React, { useState, useEffect, useRef } from "react";
import CloseIcon from "assets/closeIcon.svg";
import { useStyles } from "../styles";

const RenameRolePopup = ({ role, anchorRef, onClose, onSave }) => {
  const classes = useStyles();
  const [name, setName] = useState(role.name);
  const popupRef = useRef(null);

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const canSave = name.trim() && name.trim() !== role.name;

  return (
    <div ref={popupRef} className={classes.renamePopup}>

      {/* Header */}
      <div className={classes.popupHeaderRow}>
        <span className={classes.renameTitle}>Rename Role</span>
        <button className={classes.popupCloseBtn} onClick={onClose}>
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      {/* Input */}
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && canSave) onSave(name.trim()); }}
        placeholder="Enter new role name"
        className={classes.popupInput}
      />

      {/* Buttons */}
      <div className={classes.renameBtnRow}>
        <button
          onClick={() => canSave && onSave(name.trim())}
          disabled={!canSave}
          className={`${classes.applySaveBtn} ${canSave ? classes.applySaveBtnEnabled : ""}`}
        >
          Apply &amp; Save
        </button>
      </div>

    </div>
  );
};

export default RenameRolePopup;
