import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";

import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const StoreGroupDetails = (props) => {
  const { open, loader, columns, data, onClose } = props;

  const classes = useStyles();

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth={true}
      disableEscapeKeyDown={true}
      onClose={onClose}
      classes={{
        paperFullWidth: classes.paperFullWidth,
      }}
    >
      <DialogTitle>Store Groups</DialogTitle>
      <DialogContent dividers>
        <div>
          <Loader loader={loader}>
            <AgGridComponent
                columns={columns}
                rowdata={data}
            />
          </Loader>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StoreGroupDetails;
