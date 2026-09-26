import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { GetSwapStoreInstanceContext } from "./swap-store-modal-component";
import { fetchStoreListDataFromCluster } from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import Form from "core/Utils/form";
import {
  SWAP_STORE_CLUSTER_DROPDOWN,
  MASTER_STORE_ATTRIBUTES,
} from "../../../../assortsmart/constants-assortsmart/stringContants";
import { Button } from "@mui/material";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import { getColumnsAg } from "core/actions/tableColumnActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { hyphenatedFormatter } from "../../../../assortsmart/utils-assortsmart/utilityFunctions";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import AgGridTable from "core/Utils/agGrid";

const SwapStoreTableComponent = (props) => {
  const [defaultClusterTableData, setDefaultClusterTableData] = useState([]);
  const [selectedClusterTableData, setSelectedClusterTableData] = useState([]);
  const [swapStoreColumns, setSwapStoreColumns] = useState([]);
  const [swapStoreAttributes, setSwapStoreAttributes] = useState([]);
  const [clusterListFormData, setClusterListFormData] = useState([]);
  const [selectedClusterValue, setSelectedClusterValue] = useState([]);

  const DefaultClusterInstance = useRef({});
  const SelectedClusterInstance = useRef({});

  useEffect(() => {
    if (
      props.swapStoreResponse?.status &&
      (!props.selectedClusterForSwapStore ||
        props.swapStoreResponse?.data?.data[props.selectedClusterForSwapStore]
          ?.length > 0)
    ) {
      props.setIsLoading(true);
      setDefaultClusterTableData([]);
      setSelectedClusterTableData([]);
      let clusterList = SWAP_STORE_CLUSTER_DROPDOWN;
      let clusterOptions = Object.keys(
        props.swapStoreResponse?.data?.data
      ).filter((clusterVal) => {
        //Remove the default cluster value selected on the left table
        return clusterVal !== props.selectedClusterForSwapStore;
      });
      props.sendSelectedCluster(clusterOptions[0]);

      clusterList.forEach((formData) => {
        formData.options = clusterOptions.map((clusterData) => {
          return {
            value: clusterData,
            label: hyphenatedFormatter(clusterData),
            id: clusterData,
          };
        });
        return formData;
      });

      setClusterListFormData(clusterList);
      (async () => {
        let swapStoreTableCols = await props.getColumnsAg(
          "table_name=assort_cluster_swap"
        );

        if (swapStoreTableCols?.length) {
          // Added checkbox and headerchecbox to column def
          swapStoreTableCols.unshift({
            headerCheckboxSelection: true,
            checkboxSelection: true,
            accessor: "checkbox",
          });
          setSwapStoreColumns(swapStoreTableCols);
          swapStoreTableCols = swapStoreTableCols.filter(
            (obj) => obj.column_name
          );
          let storeAttributes = swapStoreTableCols
            ?.map((columnData) => {
              return columnData.column_name;
            })
            .filter((rowData) => {
              return !MASTER_STORE_ATTRIBUTES.includes(rowData);
            }); //Fetch the list of store attibutes except the master attributes
          setSwapStoreAttributes(storeAttributes);
          let defaultStoreDataResp = await props.fetchStoreListDataFromCluster({
            //Fetch the store details of the default cluster
            store_codes:
              props.swapStoreResponse?.data?.data[
                props.selectedClusterForSwapStore
              ],
            attributes: storeAttributes,
          });
          let selectedStoreDataResp = await props.fetchStoreListDataFromCluster(
            {
              //Fetch the store details of the selected cluster
              store_codes:
                props.swapStoreResponse?.data?.data[clusterOptions[0]],
              attributes: storeAttributes,
            }
          );
          if (defaultStoreDataResp.status && selectedStoreDataResp.status) {
            setSelectedClusterValue({
              swapStoreCluster: clusterOptions[0],
            });
            setDefaultClusterTableData(defaultStoreDataResp?.data?.data || []);
            setSelectedClusterTableData(
              selectedStoreDataResp?.data?.data || []
            );
            props.setIsLoading(false);
          }
        }
        props.setSwapStoreLoader(false);
      })();
    } else if (
      props.swapStoreResponse?.status &&
      !props.swapStoreResponse?.data?.data[props.selectedClusterForSwapStore]
        ?.length > 0
    ) {
      props.closeSwapStoreModal();
      props.setSwapStoreLoader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.swapStoreResponse]);

  const generateSnackMessages = (errorMessage, errorType) => {
    props.addSnack({
      message: errorMessage,
      options: {
        variant: errorType,
      },
    });
  };

  const addSwapRows = () => {
    setDefaultClusterTableData([]);
    setSelectedClusterTableData([]);
    //Function to add rows from right to left table
    let selectedStoreRowId = {};
    let storesToAdd = [];
    // Getting selected rows
    SelectedClusterInstance.current.api.forEachNode((node, index) => {
      if (node.selected) {
        selectedStoreRowId[index] = true;
        storesToAdd.push(node.data);
      }
    });
    if (Object.keys(selectedStoreRowId).length === 0) {
      generateSnackMessages("Please select atleast One store to add", "error");
    } else {
      props.setSaveBeforeChange(true);
    }
    let storesToRemove = selectedClusterTableData.filter(
      (row) => !storesToAdd.map((o) => o.store_code).includes(row.store_code)
    );
    // Deselect the selected checkbox
    SelectedClusterInstance.current.api.deselectAll(true);
    DefaultClusterInstance.current.api.deselectAll(true);
    setDefaultClusterTableData([...defaultClusterTableData, ...storesToAdd]);
    DefaultClusterInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
    setSelectedClusterTableData(storesToRemove);
    SelectedClusterInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const removeSwapRows = () => {
    setDefaultClusterTableData([]);
    setSelectedClusterTableData([]);
    //Function to add rows from left to right table
    let defaultStoreRowId = {};
    let storesToAdd = [];
    // Getting selected rows
    DefaultClusterInstance.current.api.forEachNode((node, index) => {
      if (node.selected) {
        defaultStoreRowId[index] = true;
        storesToAdd.push(node.data);
      }
    });
    if (Object.keys(defaultStoreRowId).length === 0) {
      generateSnackMessages("Please select atleast One store to add", "error");
    } else {
      props.setSaveBeforeChange(true);
    }
    let storesToRemove = defaultClusterTableData.filter(
      (row) => !storesToAdd.map((o) => o.store_code).includes(row.store_code)
    );
    // Deselect the selected checkbox
    SelectedClusterInstance.current.api.deselectAll(true);
    DefaultClusterInstance.current.api.deselectAll(true);
    setSelectedClusterTableData([...selectedClusterTableData, ...storesToAdd]);
    SelectedClusterInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
    setDefaultClusterTableData(storesToRemove);
    DefaultClusterInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
    });
  };

  const handleClusterChange = (val) => {
    props.isSavedSwapStore
      ? generateSnackMessages("Please save before you proceed !", "error")
      : changeClusterValue(val);
  };

  const changeClusterValue = async (val) => {
    setSelectedClusterValue({ swapStoreCluster: val });
    props.setSwapStoreLoader(true);
    props.sendSelectedCluster(val?.swapStoreCluster);

    let selectedClusterDataResp = props.swapStoreResponse?.data?.data[
      val.swapStoreCluster
    ].length
      ? await props.fetchStoreListDataFromCluster({
          store_codes:
            props.swapStoreResponse?.data?.data[val.swapStoreCluster],
          attributes: swapStoreAttributes,
        })
      : [];

    if (selectedClusterDataResp?.data?.status) {
      setSelectedClusterTableData(selectedClusterDataResp?.data?.data);
    } else if (!props.selectedClusterDataResp?.data.data[val.value].length) {
      setSelectedClusterTableData([]);
    }
    props.setSwapStoreLoader(false);
  };

  const loadTableInstanceDefaultCluster = (
    params,
    setRTinstanceDefaultCluster
  ) => {
    DefaultClusterInstance.current = params;
    setRTinstanceDefaultCluster(DefaultClusterInstance);
  };

  const loadTableInstanceSelectedCluster = (
    params,
    setRTinstanceSelectedCluster
  ) => {
    SelectedClusterInstance.current = params;
    setRTinstanceSelectedCluster(SelectedClusterInstance);
  };
  const classes = useStyles();
  return (
    <GetSwapStoreInstanceContext.Consumer>
      {({ setRTinstanceDefaultCluster, setRTinstanceSelectedCluster }) => (
        <LoadingOverlay loader={props.swapStoreLoader || props.isLoading}>
          <div className={classes.resultContainer}>
            <Paper elevation={0} className={classes.tableLayout}>
              <Typography
                gutterBottom
                className={classes.typographyMarginBottom}
              >
                Selected cluster - {props.selectedClusterForSwapStore}{" "}
              </Typography>
              <AgGridTable
                rowdata={defaultClusterTableData || []}
                columns={swapStoreColumns}
                rowSelection="multiple"
                loadTableInstance={(params) =>
                  loadTableInstanceDefaultCluster(
                    params,
                    setRTinstanceDefaultCluster
                  )
                }
                uniqueRowId={"store_code"}
                sideBar={false}
              />
            </Paper>
            <div className={classes.smallButtonDiv}>
              <Button
                variant="contained"
                color="primary"
                className={classes.buttonFitContent}
                onClick={addSwapRows}
                id="addStores"
                title="Add stores"
              >
                {"<< Add"}
              </Button>

              <Button
                variant="contained"
                color="primary"
                className={classes.buttonFitContent}
                onClick={removeSwapRows}
                id="removeStores"
                title="Remove stores"
              >
                {"Remove >>"}
              </Button>
            </div>
            <Paper elevation={0} className={classes.tableLayout}>
              <div className={classes.formWidth}>
                {/* Pass props for width of label and form field once changes are merged to dev */}
                <Form
                  layout={"horizontal"}
                  maxFieldsInRow={1}
                  handleChange={handleClusterChange}
                  fields={clusterListFormData}
                  updateDefaultValue={false}
                  defaultValues={selectedClusterValue}
                  handleDropdownClose={true}
                ></Form>
              </div>
              <AgGridTable
                rowdata={selectedClusterTableData || []}
                columns={swapStoreColumns}
                rowSelection="multiple"
                loadTableInstance={(params) =>
                  loadTableInstanceSelectedCluster(
                    params,
                    setRTinstanceSelectedCluster
                  )
                }
                uniqueRowId={"store_code"}
                sideBar={false}
              />
            </Paper>
          </div>
        </LoadingOverlay>
      )}
    </GetSwapStoreInstanceContext.Consumer>
  );
};

const mapStateToProps = (store) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
  };
};

const mapActionsToProps = {
  fetchStoreListDataFromCluster,
  getColumnsAg,
  addSnack,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(SwapStoreTableComponent));
