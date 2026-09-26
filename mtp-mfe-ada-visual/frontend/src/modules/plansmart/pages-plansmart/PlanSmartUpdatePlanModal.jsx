import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const PlanSmartUpdatePlanModal = ({onClose, onSubmit, showUpdatePlanAlert}) => {
  return (
    <Dialog 
      maxWidth="lg" 
      open={showUpdatePlanAlert}
      PaperProps={{
        style: {
          borderRadius: "0.5rem",
          borderTop: "8px solid #0055AF",
          width: "25rem"
        },
      }}
    >
      <DialogTitle sx={{display: "inline-flex"}}>
        <>
         <InfoOutlinedIcon sx={{fontSize: "1rem", fill: "#0055AF", marginRight: "0.5rem"}}/> Confirmation
          <CloseIcon onClick={() => onClose("close")} sx={{fontSize: "1rem", marginLeft: "auto", cursor: "pointer"}}/>
        </>
        </DialogTitle>
      <DialogContent sx={{marginBottom: "2rem", overflowY: "hidden"}}>
      <Typography color="#1D1D1D" variant="body1" sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
        Save changes before continuing the action?
      </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={() => onClose("update")}>
          No
        </Button>
        <Button 
          variant="contained" 
          onClick={onSubmit}>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PlanSmartUpdatePlanModal;
