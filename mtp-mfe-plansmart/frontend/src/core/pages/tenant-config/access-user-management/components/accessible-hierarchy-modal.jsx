import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
} from "@mui/material";
import { addSnack } from "core/actions/snackbarActions";
import makeStyles from "@mui/styles/makeStyles";
import Paper from "@mui/material/Paper";
import { getAccessHierachyData } from "../services/TenantManagement/User-Role-Management/user-role-management-service";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

import { useStyles as sharedStyles } from "./styles-tenant-user-mgmt";

const useStyles = makeStyles((theme) => ({
  footer: {
    padding: theme.typography.pxToRem(15),
    justifyContent: "center",
  },
}));
const AccessibleHierarchyModal = (props) => {
  const [accessibleDeptTableColumns, setAccessibleDeptTableColumns] = useState(
    []
  );
  const [accessibleDeptTableData, setAccessibleDeptTableData] = useState([]);
  const [showLoader, setShowLoader] = useState(false);
  const dispatch = useDispatch();
  const sharedClasses = sharedStyles();
  const classes = useStyles();

  useEffect(() => {
    getInitialData();

    return () => {
      setAccessibleDeptTableColumns([]);
      setAccessibleDeptTableData([]);
    };
  }, []);

  const getInitialData = async () => {
    setShowLoader(true);
    try {
      let configColumns = await props.getTableConfig();
      let formattedColumns = agGridColumnFormatter(configColumns.data?.data);
      let rowdata = await getAccessHierachyData(props.hierarchyId);
      setAccessibleDeptTableData(rowdata.data.data);
      setAccessibleDeptTableColumns(formattedColumns);
      setShowLoader(false);
    } catch (error) {
      console.error(error);
      setShowLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  return (
    <Dialog
      className={sharedClasses.root}
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
          View Department Mapping
        </Grid>
      </DialogTitle>
      <DialogContent
        classes={{
          root: sharedClasses.content,
        }}
      >
        <Loader loader={showLoader}>
          <div className={sharedClasses.contentBody}>
            <Paper elevation={0}>
              {accessibleDeptTableColumns.length > 0 && (
                <AgGridComponent
                  rowdata={accessibleDeptTableData}
                  columns={accessibleDeptTableColumns}
                  uniqueRowId={"id"}
                  sizeColumnsToFitFlag
                />
              )}
            </Paper>
          </div>
        </Loader>
      </DialogContent>
      <DialogActions
        classes={{
          root: classes.footer,
        }}
      >
        <Button
          onClick={props.closeModal}
          id="createStoreCancelBtn"
          color="primary"
          variant="outlined"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccessibleHierarchyModal;
