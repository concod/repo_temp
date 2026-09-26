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

const EditModal = (props) => {
  const globalClasses = globalStyles();

  return (
    <Dialog
      className={globalClasses.root}
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            {props.heading}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => props.onCancel()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>{props.children}</DialogContent>
      <DialogActions
        classes={{
          root: globalClasses.footer,
        }}
      >
        <Button
          onClick={() => {
            props.onCancel();
          }}
          color="primary"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={props.onSaveHandler}
          color="primary"
        >
          {props.saveButtonLabel || "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditModal;
