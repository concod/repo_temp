import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import globalStyles from "core/Styles/globalStyles";
import { Modal } from "impact-ui-v3";

const EditModal = (props) => {
  const globalClasses = globalStyles();
  const isApplyDisabled = props?.isApplyDisabled

  return (
    <Modal
      title={props.heading}
      size= {props.size? props?.size : "medium"}
      onClose={props.onCancel}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
      disableBackdropClick={false}
      primaryButtonLabel={"Apply"}
      primaryButtonProps={{
        onClick: props.onSaveHandler,
        onMouseDown: props.onSaveMouseDown,
        disabled: isApplyDisabled,
      }}
      secondaryButtonLabel={"Cancel"}
      secondaryButtonProps={{ onClick: props.onCancel }}
    >
      <DialogContent>{props.children}</DialogContent>
    </Modal>
  );
};

export default EditModal;
