import React, { useState, useEffect, useRef } from "react";
import CloseIcon from "assets/closeIcon.svg";
import { Button } from "impact-ui-v3";
import { ROLE_COLORS } from "../constants";
import { useStyles } from "../styles";

const AddRolePopup = ({ anchorRef, onClose, onSave }) => {
  const classes = useStyles();
  const [roleName, setRoleName] = useState("");
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

  const buildRole = (enabled) => ({
    id: `role-${Date.now()}`,
    name: roleName.trim(),
    userCount: 0,
    color: ROLE_COLORS.default,
    enabled,
    isDefault: false,
  });

  const handleAddAndEnable = () => {
    if (!roleName.trim()) return;
    onSave(buildRole(true), {});
  };

  return (
    <div ref={popupRef} className={classes.addRolePopup}>

      <div className={classes.popupHeaderRow}>
        <span className={classes.addRoleTitle}>Add Role</span>
        <button className={classes.popupCloseBtn} onClick={onClose}>
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <input
        autoFocus
        value={roleName}
        onChange={(e) => setRoleName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleAddAndEnable(); }}
        placeholder="Enter The Role Name"
        className={classes.popupInput}
      />

      <div className={classes.popupBtnRow}>
        <Button
          variant="secondary"
          size="small"
          onClick={onClose}
          className={classes.cancelBtnStyle}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          disabled={!roleName.trim()}
          onClick={handleAddAndEnable}
          className={classes.addBtnStyle}
        >
          Add
        </Button>
      </div>

    </div>
  );
};

export default AddRolePopup;
