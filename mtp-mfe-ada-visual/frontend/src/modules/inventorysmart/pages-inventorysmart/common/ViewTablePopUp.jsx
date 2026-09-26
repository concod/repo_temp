import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { useEffect, useState } from "react";
import makeStyles from "@mui/styles/makeStyles";
import classnames from "classnames";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  paperFullWidth: {
    overflowY: "visible",
    minWidth: "80%",
  },
  dialogRoot: {
    "& .MuiDialog-paperWidthSm": {
      width: "35rem !important",
      borderRadius: "0.6rem",
    },
  },
}));

const ViewTablePopUp = ({
  rowData,
  columns,
  title,
  closePopUp,
  loader,
  pagination
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [data, setData] = useState({});
  const [column, setColumn] = useState({});

  useEffect(() => {
      setData(rowData);
      setColumn(columns);
  }, [columns, rowData])

  return (
    <Dialog
      maxWidth={"md"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        closePopUp();
      }}
      disableEscapeKeyDown={true}
    >
      <DialogContent
        dividers
        classes={{
          root: classnames(
            globalClasses.flexRow,
            globalClasses.layoutAlignBetweenCenter
          ),
        }}>
        <Typography classes={{ root: classes.moduleTitle }} >
          {title}
        </Typography>
        <IconButton color="primary" onClick={() => closePopUp()} size="large">
          <CloseIcon fontSize="medium" />
        </IconButton>
      </DialogContent>
      <DialogContent>
        <Loader loader={loader}>
          <AgGridComponent
            rowdata={data}
            columns={column}
            pagination={pagination !== undefined ? pagination : true}
          />
        </Loader>
      </DialogContent>
    </Dialog>
  )
}

export default (ViewTablePopUp);