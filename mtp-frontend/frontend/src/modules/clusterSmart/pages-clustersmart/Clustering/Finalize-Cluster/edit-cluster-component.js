import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import CloseIcon from "@mui/icons-material/Close";
import LoadingOverlay from "core/Utils/Loader/loader";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  Plan,
  PARAMETERS_FORM,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import {
  isChannelMultiple,
  getDefaultChannelValue,
  externalFilterChannelSubChannel,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as bopReceiptDraweServiceActions from "modules/assortsmart/services-assortsmart/Plan/BOP-Receipt-Drawer/bop-receipt-drawer-service";
import { isEmpty } from "lodash";
import AgGridTable from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";

const EditClusterNameComponent = (props) => {
  const [columns, setColumns] = useState([]);
  const [formFields, setFormFields] = useState(null);
  const [updatedFormData, setUpdatedFormData] = useState(false);
  const [formValue, setFormData] = useState({});
  const EditClusterInstance = useRef({});
  let formData = formValue;

  useEffect(() => {
    if (!isEmpty(props.planDetails)) {
      const fetchData = async () => {
        let editClusterCols = await getColumnsAg(
          `${"table_name="}${"assort_cluster_name_edit"}`
        )();
        if (editClusterCols?.length) {
          setColumns(editClusterCols);
        }
        if (isChannelMultiple(props.planDetails.data)) {
          let options = props.planDetails.data?.channel.map((value) => {
            return {
              value: value,
              label: value,
              id: value,
            };
          });
          options = options.filter(
            (option) => !Plan.__Ecom_Channel.includes(option.value)
          );
          let updatedFormData = formValue;
          let defaultChannel = getDefaultChannelValue(
            options,
            props.planDetails?.data
          );
          updatedFormData.channel_list = defaultChannel?.value;
          setFormData(updatedFormData);
          setUpdatedFormData(true);
          PARAMETERS_FORM[1].options = options;

          delete PARAMETERS_FORM[0];
          setFormFields(PARAMETERS_FORM);
        }
      };
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails]);

  const loadTableInstance = (params) => {
    EditClusterInstance.current = params;
  };

  const handleChangeChannelFilter = (updatedFormData, id) => {
    setFormData(updatedFormData);
    setUpdatedFormData(true);
  };

  const isExternalFilterPresent = useCallback(() => {
    // if formData is not empty, then we are filtering
    return isChannelMultiple(props.planDetails?.data) ? true : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doesExternalFilterPass = useCallback(
    //whenever channel or sub channel changes data get filtered here
    (node) => {
      return externalFilterChannelSubChannel(
        node,
        props.tableData,
        formData,
        props.planDetails?.data
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, props.tableData]
  );

  useEffect(() => {
    if (updatedFormData) {
      setUpdatedFormData(false);
      if (props.tableData?.length && EditClusterInstance?.current?.api) {
        EditClusterInstance.current.api.onFilterChanged();
      }
    }
  }, [updatedFormData]);

  const onBlurClusterName = (e) => {
    let regexForAlphaNumeric = /^\s*([0-9a-zA-Z ]*)\s*$/;
    if (e.newValue.match(regexForAlphaNumeric) === null) {
      props.addSnack({
        message:
          "Please enter valid cluster name without any special character",
        options: {
          variant: "error",
        },
      });
    }
  };

  const classes = useStyles();
  return (
    <Dialog
      maxWidth={"sm"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      onClose={() => props.showEditCluster(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          className="receiptHeader"
        >
          {/* <Typography variant="h4" gutterBottom>
            Cluster Name Edit
          </Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.showEditCluster(false)} />
          </IconButton> */}
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          <Grid container direction="row" className={classes.dialogGrid}>
            <LoadingOverlay loader={props.loaderReceiptDrawer}>
              {/* {formFields && (
                <div className={classes.formContainer}>
                  <Form
                    layout={"vertical"}
                    maxFieldsInRow={1}
                    handleChange={handleChangeChannelFilter}
                    fields={formFields}
                    updateDefaultValue={false}
                    defaultValues={formData}
                  ></Form>
                </div>
              )}
              {props.tableData?.length > 0 && (
                <AgGridTable
                  columns={columns || []}
                  rowdata={props.tableData || []}
                  loadTableInstance={loadTableInstance}
                  isExternalFilterPresent={isExternalFilterPresent}
                  doesExternalFilterPass={doesExternalFilterPass}
                  sideBar={false}
                  pagination={false}
                  sizeColumnsToFitFlag={true}
                  cellValueChanged={(e) => onBlurClusterName(e)}
                />
              )} */}
              <p>
                You have successfully created the cluster. Go back to dashboard?
              </p>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                onClick={() => {
                  if (props.planDetails?.data?.steps === "1.3") {
                    props.closeClusterSmartNavigate();
                    props.setShowFinalizedClusterEditInstance(
                      EditClusterInstance
                    );
                  } else {
                    props.closeClusterSmartNavigate();
                    props.navigateToPlanComponent(props.tableData);
                  }
                }}
                id="assortClusterBackBtn"
                className={classes.smallPrimaryButton}
              >
                Yes
              </Button>

              <Button
                variant="outlined"
                color="primary"
                onClick={props.closeClusterSmartNavigate}
                id="assortClusterBackBtn"
                className={classes.smallPrimaryButton}
              >
                No
              </Button>
            </LoadingOverlay>
          </Grid>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    loaderReceiptDrawer: bopReceiptDraweServiceActions.loaderReceiptDrawerSelector(
      store
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    columnHeaderJson: planDashboardServiceActions.columnHeaderJsonSelector(
      store
    ),
  };
};

const mapActionsToProps = {
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(EditClusterNameComponent));
