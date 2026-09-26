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
import globalStyles from "core/Styles/globalStyles";
import CloseIcon from "@mui/icons-material/Close";
import React, { useEffect, useState } from "react";

const Validation = (props) => {
  const globalClasses = globalStyles();
  const [showInValidModal, setShowInValidModal] = useState(false);

  useEffect(() => {
    if (props?.articles?.articlesWithValidationError?.length) {
      setShowInValidModal(true);
    }
  }, [props.articles]);

  const onCloseModalHandler = (p_excludeCallback = false) => {
    setShowInValidModal((value) => !value);
    props?.onCloseModalHandlerCallback &&
      props.onCloseModalHandlerCallback(p_excludeCallback);
  };

  const excludeAllHandler = () => {
    props.excludeAllHandler();
    onCloseModalHandler(true);
  };

  return (
    showInValidModal && (
      <Dialog
        onClose={() => onCloseModalHandler()}
        maxWidth={"sm"}
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
            <Typography variant="h4" gutterBottom>
              {"Validation Error"}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => onCloseModalHandler()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {props?.articles?.articlesWithValidationError.join(",")}
          </Typography>
          <Typography variant="h6" className={globalClasses.marginBottom}>
            {props?.articles?.validationErrorMessage}
          </Typography>
        </DialogContent>
        {!props?.articles?.validationErrorMessage.includes("user reserve") &&
          !props?.renderedForAlert && (
            <DialogActions>
              <Button
                onClick={() => {
                  excludeAllHandler();
                }}
                color="primary"
              >
                {props.label || "Exclude All"}
              </Button>
              <Button
                onClick={() => {
                  onCloseModalHandler();
                }}
                color="primary"
              >
                Cancel
              </Button>
            </DialogActions>
          )}
      </Dialog>
    )
  );
};

export default Validation;
