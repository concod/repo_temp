import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import { useTranslation } from "impact-ui-v3";
import {
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import React from "react";
import {
  getSupplyRouteTableConfig,
  setSupplyRouteTableConfigLoader,
  editSupplyRouteName,
} from "modules/inventorysmart/services-inventorysmart/Suply-Routes/supply-routes-service";
import { Grid, IconButton } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateNewSupplyRoutePopUp from "./CreateNewNetwork";

import { getNetwork } from "modules/inventorysmart/services-inventorysmart/Network-Route/network-route";
import { Edit } from "@mui/icons-material";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Button } from "impact-ui-v3";
import EditIcon from "@mui/icons-material/Edit";

const ManageSupplyRouteTable = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [openPopUp, setOpenPopUp] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [networkTableColumns, setNetworkTableColumns] = useState([]);
  const supplyRouteTableGridInstance = useRef(null);
  const [
    showDeleteSupplyRouteDialogue,
    setShowDeleteSupplyRouteDialogue,
  ] = useState(false);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };
  const onEditClick = (params) => {
    setSelectedNetwork({
      network_id: params.data.network_id,
      network_name: params.data.network_name,
    });
    openCreateNetwork(true);
  };
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        let networkCols = await props.getColumnsAg("table_name=supply_network");
        let actionCol = {
          headerName: t("inventorysmart.action"),
          minWidth: 150,
          cellRenderer: (params, extraProps) => {
            return (
              <div>
                <Button
                  size="small"
                  variant="tertiary"
                  title={t("inventorysmart.edit")}
                  onClick={(e) => {
                    onEditClick(params, e);
                  }}
                  icon={<EditIcon fontSize="small" />}
                ></Button>
              </div>
            );
          },
          editable: false,
          colId: "action",
        };
        let formattedColumns = [...networkCols, actionCol];
        setNetworkTableColumns(formattedColumns);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setPageLoader(true);
      let body = {
        meta: {
          ...manualbody,
          limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
        },
      };

      let response = await props.getNetwork(body);
      if (response.data.status) {
        setPageLoader(false);
        return { data: response.data.data, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setPageLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      setPageLoader(false);
      return defaultTableData;
    }
  };

  const loadTableInstance = (params) => {
    supplyRouteTableGridInstance.current = params;
  };

  const openCreateNetwork = () => {
    setOpenPopUp(true);
  };
  const closeCreateNewPopup = (data) => {
    setOpenPopUp(false);
  };

  const deleteSupplyRoute = async () => {
    setShowDeleteSupplyRouteDialogue(true);
  };

  return (
    <>
      {!openPopUp && (
        <>
          {" "}
          <Grid
            container
            className={globalClasses.marginVertical1rem}
            justifyContent={"space-between"}
          >
            <Grid item xs={12} container justifyContent={"flex-end"}>
              {/* <Button
                variant="contained"
                color="primary"
                id="createProductBtn"
                className={classes.button}
                disabled={selectedRows.length == 0}
                onClick={deleteSupplyRoute}
              >
                <DeleteIcon fontSize="small"></DeleteIcon>
              </Button> */}
              <Button
                variant="primary"
                id="productSetAllBtn"
                className={classes.button}
                onClick={() => {
                  setSelectedNetwork(null);
                  openCreateNetwork();
                }}
              >
                {t("inventorysmart.createNewNetwork")}
              </Button>
            </Grid>
          </Grid>
          <Loader loader={pageLoader}>
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <AgGridComponent
                columns={networkTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                hideSelectAllRecords={true}
                loadTableInstance={loadTableInstance}
                rowModelType="serverSide"
                serverSideStoreType="partial"
                onRowSelected
                cacheBlockSize={10}
                pagination={true}
                sizeColumnsToFitFlag={true}
              />
            </div>
          </Loader>
        </>
      )}
      {openPopUp && (
        <CreateNewSupplyRoutePopUp
          closeCreateNewPopup={closeCreateNewPopup}
          selectedNetwork={selectedNetwork}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderRepositoryFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => ({
  getNetwork: (payload) => dispatch(getNetwork(payload)),
  getColumnsAg: (payload) => dispatch(getColumnsAg(payload)),
  editSupplyRouteName: (payload) => dispatch(editSupplyRouteName(payload)),
  setSupplyRouteTableConfigLoader: (payload) =>
    dispatch(setSupplyRouteTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ManageSupplyRouteTable);
