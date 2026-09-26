import React from "react";
import { Button, Dialog, DialogContent, DialogActions } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import Link from "@mui/material/Link";
const useStyles = makeStyles((theme) => ({
  confirmBox: {
    "& .MuiDialog-paper": {
      maxWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  contentBody: {
    minHeight: "10rem",
  },
  title: {
    textAlign: "center",
    fontSize: "1.6rem",
    fontWeight: "600",
    paddingTop: "1.5rem",
  },
  text: {
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#5a5a5ad9",
  },
  headerBox: {
    height: "10px",
    backgroundColor: "#4f677b",
  },
}));

const CreateTicket = (props) => {
  const classes = useStyles();

  return (
    <Dialog
      onClose={() => props.onClose()}
      className={classes.confirmBox}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      maxWidth={"xs"}
      disableEscapeKeyDown={true}
    >
      <div className={classes.headerBox}> </div>
      <DialogContent
        classes={{
          root: classes.contentBody,
        }}
      >
        <div className={classes.title}> {props.title} </div>
        <div>
          <p className={classes.text}>
            <span>
              {`Visit `}
              <Link
                href="#"
                onClick={() => window.open("https://www.impactanalytics.co")}
              >
                impactanalytics.co
              </Link>
              {` to learn more`}
            </span>
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            props.onClose();
          }}
          color="primary"
        >
          {`< Go Back`}
        </Button>
        <Button
          variant="contained"
          onClick={() => {
            props.onConfirm();
          }}
          color="primary"
        >
          Contact
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateTicket;
