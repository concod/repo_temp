import { useEffect, useRef, useState } from "react";
import DoneIcon from "coreAssets/checkmark_16.svg";
import CloseIcon from "coreAssets/closeIcon_16.svg";
import { Input } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import EditActionButton from "core/Utils/ui-actions/EditActionButton";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
    overflow: "hidden",
  },
  verticalDivider: {
    width: "12px",
    height: 0,
    transform: "rotate(90deg)",
    borderTop: "1px solid var(--Colors-Neutrals-Border-Subtle, #D9DDE7)",
    flexShrink: 0,
  },
  label: {
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    color: "var(--Colors-Neutrals-Text-Icon-Body, #1F2B4D)",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  groupName: {
    fontSize: "14px",
    fontWeight: 800,
    lineHeight: "21px",
    color: "var(--Colors-Neutrals-Text-Icon-Body, #1F2B4D)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "min(100ch, max(200px, calc(100vw - 500px)))",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    minWidth: 0,
    overflow: "hidden",
  },
  editRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },

  nameInput: {
    width: "133px",
    minWidth: "133px",
    maxWidth: "133px",
    flexShrink: 0,
    overflow: "hidden",
    "& .MuiInputBase-root": {
      width: "133px !important",
      minWidth: "133px !important",
      maxWidth: "133px !important",
      height: "32px",
      backgroundColor: "var(--Colors-Greys-400, #EFF2FA) !important",
      borderRadius: "8px",
      border: "none",
    },
    "& .MuiInputBase-input": {
      minWidth: "0 !important",
      width: "100% !important",
      height: "32px",
      fontSize: "14px",
      fontWeight: 800,
      color: "var(--Colors-Neutrals-Text-Icon-Body, #1F2B4D)",
      backgroundColor: "transparent !important",
    },
  },
  iconAction: {
    position: "relative",
    zIndex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    padding: "4px",
    borderRadius: "8px",
    backgroundColor: "var(--Colors-Neutrals-Surface-Lighter, #F5F6FA)",
    cursor: "pointer",
    border: "none",
    flexShrink: 0,
    "& svg": {
      width: "16px",
      height: "16px",
      display: "block",
      pointerEvents: "none",
    },
    "&:hover": {
      backgroundColor: "var(--Colors-Greys-400, #EFF2FA)",
    },
  },
});

const SelectedGroupHeader = ({
  groupName = "",
  onNameChange,
  onEditStateChange,
  editable = true,
}) => {
  const classes = useStyles();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(groupName);
  const [draftName, setDraftName] = useState(groupName);
  const nameBeforeEditRef = useRef(groupName);

  useEffect(() => {
    if (!isEditing) {
      setDisplayName(groupName || "");
      setDraftName(groupName || "");
    }
  }, [groupName, isEditing]);

  useEffect(() => {
    onEditStateChange?.({
      isEditing,
      draftName,
      baselineName: nameBeforeEditRef.current,
    });
  }, [isEditing, draftName, onEditStateChange]);

  const handleInputChange = (event) => {
    const nextValue =
      typeof event === "string"
        ? event
        : event?.target?.value ?? event?.value ?? "";
    setDraftName(nextValue);
  };

  const handleConfirm = () => {
    const trimmedName = (draftName || "").trim();
    if (!trimmedName) {
      return;
    }
    setDisplayName(trimmedName);
    setDraftName(trimmedName);
    setIsEditing(false);
    onNameChange?.(trimmedName);
  };

  const handleCancel = () => {
    const previousName = nameBeforeEditRef.current || "";
    setDraftName(previousName);
    setDisplayName(previousName);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    nameBeforeEditRef.current = displayName;
    setDraftName(displayName);
    setIsEditing(true);
  };

  return (
    <div className={classes.root}>
      <div className={classes.verticalDivider} />
      <div className={classes.nameRow}>
        <span className={classes.label}>Selected group:</span>
        {isEditing ? (
          <div className={classes.editRow}>
            <Input
              className={classes.nameInput}
              value={draftName}
              onChange={handleInputChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleConfirm();
                }
                if (event.key === "Escape") {
                  handleCancel();
                }
              }}
              autoFocus
            />
            <button
              type="button"
              className={classes.iconAction}
              onClick={handleConfirm}
              aria-label="Confirm group name"
            >
              <DoneIcon />
            </button>
            <button
              type="button"
              className={classes.iconAction}
              onClick={handleCancel}
              aria-label="Cancel group name edit"
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <>
            <span className={classes.groupName} title={displayName}>
              {replaceSpecialCharacter(displayName)}
            </span>
            {editable && (
              <EditActionButton
                iconOnly
                plainHover
                size="small"
                title="Edit Group Name"
                tooltipOrientation="right"
                onClick={handleStartEdit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SelectedGroupHeader;
