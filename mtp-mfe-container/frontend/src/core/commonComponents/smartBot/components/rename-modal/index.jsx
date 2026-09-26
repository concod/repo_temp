import { Modal } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles(() => ({
  input: {
    width: "100%",
    padding: `${pxToRem(8)} ${pxToRem(12)}`,
    fontFamily: "Manrope",
    fontSize: pxToRem(14),
    border: `${pxToRem(1)} solid ${colours.neutralBorder}`,
    borderRadius: pxToRem(4),
    outline: "none",
    boxSizing: "border-box",
  },
}));

const RenameModal = (props) => {
  const { open, renameValue, setRenameValue, onConfirm, onCancel } = props;
  const classes = useStyles();
  const canSave = !!renameValue?.trim();

  return (
    <Modal
      open={open}
      onClose={onCancel}
      onPrimaryButtonClick={onConfirm}
      onSecondaryButtonClick={onCancel}
      size="small"
      title="Rename chat"
      primaryButtonLabel="Save"
      secondaryButtonLabel="Cancel"
      primaryButtonProps={{ disabled: !canSave }}
    >
      <input
        autoFocus
        value={renameValue}
        onChange={(e) => setRenameValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSave) onConfirm();
        }}
        placeholder="Enter chat name"
        className={classes.input}
      />
    </Modal>
  );
};

export default RenameModal;
