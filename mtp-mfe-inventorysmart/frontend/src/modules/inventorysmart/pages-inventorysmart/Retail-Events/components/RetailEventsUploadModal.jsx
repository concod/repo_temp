import { makeStyles } from "@mui/styles";
import { Modal } from "impact-ui-v3";
import RetailEventsFileUpload from "./RetailEventsFileUpload";
import { RETAIL_EVENTS_MESSAGES } from "../constants";

const useStyles = makeStyles(() => ({
  // impact-ui Modal defaults to fixed size heights with an absolute body;
  // override so the dialog hugs the FileUpload content.
  modal: {
    "&.ia_modalPopover": {
      height: "auto !important",
      top: "50%",
      bottom: "auto",
      transform: "translateY(-50%)",
    },
    "& .ia_modalBody": {
      position: "relative",
      top: "auto",
      bottom: "auto",
      flex: "none",
      overflow: "visible",
      padding: "16px",
    },
    "& .ia-fileUpload-container": {
      boxShadow: "none",
      minHeight: "unset",
      padding: 0,
      width: "100%",
    },
  },
}));

/** Upload flow shown from the table header "Upload" / preview "Re-Upload" actions. */
const RetailEventsUploadModal = ({ open, onClose, onUploaded, onError }) => {
  const classes = useStyles();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={RETAIL_EVENTS_MESSAGES.uploadTitle}
      width="620px"
      height="auto"
      className={classes.modal}
    >
      <RetailEventsFileUpload
        showHeader={false}
        width="100%"
        onCancel={onClose}
        onUploaded={onUploaded}
        onError={onError}
      />
    </Modal>
  );
};

export default RetailEventsUploadModal;
