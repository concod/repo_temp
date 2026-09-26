import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PropTypes from "prop-types";

const ConfirmationDialog = ({
  open,
  title = "Confirmation",
  message = "Are you sure you want to continue?",
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  type = "info",
}) => {
  const borderColor = type === "error" ? "#D32F2F" : "#0055AF";
  const iconColor = type === "error" ? "#D32F2F" : "#0055AF";
  
  const DialogIcon = type === "error" ? ErrorOutlineIcon : InfoOutlinedIcon;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      PaperProps={{
        style: {
          borderRadius: "0.5rem",
          borderTop: `8px solid ${borderColor}`,
          width: "25rem",
        },
      }}
    >
      <DialogTitle sx={{ display: "inline-flex" }}>
        <>
          <DialogIcon
            sx={{ fontSize: "1rem", fill: iconColor, marginRight: "0.5rem" }}
          />
          {title}
          <IconButton
            onClick={onCancel}
            sx={{ marginLeft: "auto", padding: 0 }}
            size="small"
          >
            <CloseIcon sx={{ fontSize: "1rem", cursor: "pointer" }} />
          </IconButton>
        </>
      </DialogTitle>
      <DialogContent sx={{ marginBottom: "2rem", overflowY: "hidden" }}>
        <Typography
          color="#1D1D1D"
          variant="body1"
          sx={{ fontWeight: 500, fontSize: "0.875rem" }}
        >
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button 
          variant="contained" 
          onClick={onConfirm}
          color={type === "error" ? "error" : "primary"}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ConfirmationDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(["info", "error"]),
};

export default ConfirmationDialog; 