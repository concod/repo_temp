import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
  DIALOG_CONFIRM_BTN_TEXT,
  DIALOG_REJECT_BTN_TEXT
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import React from "react";
import {
  resetSupplyRouteState,
  getSupplyRouteTableConfig,
  setSupplyRouteTableConfigLoader,
  getSupplyRouteData,
  deleteSupplyRoute,
  editSupplyRouteName,
} from "modules/inventorysmart/services-inventorysmart/Suply-Routes/supply-routes-service";
import { Button, Grid } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import UpdateIcon from "@mui/icons-material/Update";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateNewSupplyRoutePopUp from "./CreateNewSupplyRoutePopUp";

import ProductMappedListPopUp from "./ProductMappedListPopUp";
import { Prompt, useTranslation } from "impact-ui-v3";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const ManageSupplyRouteTable = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [openPopUp, setOpenPopUp] = useState(false);
  const [pageLoader, setPageLoader] = useState(false);
  const [supplyRouteTableColumns, setSupplyRouteTableColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [renderAgGrid, setrenderAgGrid] = useState(false);
  const [showAlertsDialog, setShowAlertsDialog] = useState(false);
  const [ishide, setIsHide] = useState(true);
  const supplyRouteTableGridInstance = useRef(null);
  const tabValueRef = useRef({});
  const editSupplyRouteNameData = useRef([]);
  const [showDeleteSupplyRouteDialogue,setShowDeleteSupplyRouteDialogue] = useState(false)

  useEffect(() => {
    tabValueRef.current = props.tabValue;
  }, [props.tabValue]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setIsHide(true);
        let type = tabValueRef.current.toLowerCase();
        type = type.replace("-", "_");
        const response = await props.getSupplyRouteTableConfig(type);
        if (response?.data?.status) {
          response?.data?.data?.map((col) => {
            if (col.label === "Products Mapped") {
              col.type = "link";
              col.is_editable = true;
            }
          });
          let col = response?.data?.data?.map((item) => {
            item.onClick = (tableInfo) => {
              onClickColumn(tableInfo?.cellData?.data || {});
            };
            return item;
          });
          let formattedColumns = agGridColumnFormatter(response?.data?.data);
          setSupplyRouteTableColumns(formattedColumns);
        }
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    return () => {
      props.resetSupplyRouteState();
    };
  }, [props?.tabValue, renderAgGrid]);

  useEffect(() => {
    supplyRouteTableGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
  }, [props?.tabValue, renderAgGrid]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setPageLoader(true);
      let body = {
        supply_route_type: [tabValueRef.current],
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : { column: "supply_route_id", order: "desc" },
              ],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };

      let response = await props.getSupplyRouteData(body);
      if (response.data.status) {
        setrenderAgGrid(false)
        setPageLoader(false);
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          "id"
        );
        return { data: formatedData, totalCount: response.data.total };
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

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    supplyRouteTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const openAlertsPopUp = () => {
    setShowAlertsDialog(true);
  };

  const closeAlertsPopUp = () => {
    setShowAlertsDialog(false);
  };

  const onClickColumn = async (data) => {
    setShowAlertsDialog(true);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    if (colDef?.field === "supply_route_name") {
      setIsHide(false);
      if (data?.supply_route_name === "") {
        displaySnackMessages(t("inventorysmart.srNameCannotBeEmpty"), "error");
      } else {
        if (editSupplyRouteNameData.current.length != 0) {
          var flag = false;
          editSupplyRouteNameData.current.filter((prod_code) => {
            if (prod_code.supply_route_id == params.data.supply_route_id) {
              prod_code.supply_route_name = params.value;
              flag = true;
            }
          });
          if (!flag) {
            editSupplyRouteNameData.current.push({
              supply_route_id: params.data.supply_route_id,
              supply_route_name: params.data.supply_route_name,
            });
          }
        } else {
          editSupplyRouteNameData.current.push({
            supply_route_id: params.data.supply_route_id,
            supply_route_name: params.data.supply_route_name,
          });
        }
      }
    }
  };

  // const updateEditedValues = async () => {
  //   try {
  //     setIsHide(true);
  //     let data = {
  //       data: editSupplyRouteNameData.current,
  //     };
  //     let editSupplyRouteName = await props.editSupplyRouteName(data);
  //     if (editSupplyRouteName.data.status) {
  //       supplyRouteTableGridInstance.current.api?.refreshServerSideStore({
  //         purge: true,
  //       });
  //       displaySnackMessages("Edit Successfully", "success");
  //     }
  //   } catch (error) {
  //     displaySnackMessages(ERROR_MESSAGE, "error");
  //   }
  // };

  const deleteSupplyRoute = async () => {
    setShowDeleteSupplyRouteDialogue(true)
  };

  const confirmDelete = async() =>{
    try {
      let supplyRouteId = [];
      selectedRows.forEach((id) => {
        supplyRouteId.push(id?.supply_route_id);
      });
      let data = {
        supply_route_ids: supplyRouteId,
      };
      let deleteSupplyRoute = await props.deleteSupplyRoute(data);
      if (deleteSupplyRoute.data.status) {
        supplyRouteTableGridInstance.current.api.deselectAll();
        supplyRouteTableGridInstance.current.api?.refreshServerSideStore({
          purge: true,
        });
        displaySnackMessages(t("inventorysmart.deleteSuccessfully"), "success");
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  }

  return (
    <>
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
            onClick={updateEditedValues}
            disabled={ishide}
          >
            <UpdateIcon fontSize="small"></UpdateIcon>
          </Button> */}
          <Button
            variant="contained"
            color="primary"
            id="createProductBtn"
            className={classes.button}
            disabled={selectedRows.length == 0}
            onClick={deleteSupplyRoute}
          >
            <DeleteIcon fontSize="small"></DeleteIcon>
          </Button>
          <Button
            variant="contained"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            onClick={openSetAllPopUp}
          >
            + Create New Supply-Route
          </Button>
        </Grid>
      </Grid>
      <Loader loader={pageLoader}>
        <div className={classNames(globalClasses.marginVertical1rem)}>
          <AgGridComponent
            columns={supplyRouteTableColumns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            selectAllHeaderComponent={true}
            hideSelectAllRecords={true}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            loadTableInstance={loadTableInstance}
            //onBlur={onBlur}
            rowSelection="multiple"
            uniqueRowId={"supply_route_id"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            onRowSelected
            cacheBlockSize={10}
            pagination={true}
            sizeColumnsToFitFlag={true}
          />
        </div>
      </Loader>

      {openPopUp && (
        <CreateNewSupplyRoutePopUp
          setShowSetAllModal={setOpenPopUp}
          setrenderAgGrid={setrenderAgGrid}
          tabValue = {props?.tabValue}
        />
      )}

      {showAlertsDialog && (
        <ProductMappedListPopUp
          active={showAlertsDialog}
          openModal={openAlertsPopUp}
          closeModal={closeAlertsPopUp}
        />
      )}

        <Prompt
        isOpen={showDeleteSupplyRouteDialogue}
        title={t("inventorysmart.confirmation")}
        subHeading={t("inventorysmart.deleteSupplyRouteConfirmation")}
        infoList={[]}
        primaryButtonProps={{
          children: DIALOG_CONFIRM_BTN_TEXT,
          onClick: () => {
              confirmDelete();
            setShowDeleteSupplyRouteDialogue(false);
          },
        }}
        tertiaryButtonProps={{
          children: DIALOG_REJECT_BTN_TEXT,
          onClick: () => setShowDeleteSupplyRouteDialogue(false),
        }}
      />

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
  getSupplyRouteTableConfig: (payload) =>
    dispatch(getSupplyRouteTableConfig(payload)),
  getSupplyRouteData: (payload) => dispatch(getSupplyRouteData(payload)),
  deleteSupplyRoute: (payload) => dispatch(deleteSupplyRoute(payload)),
  editSupplyRouteName: (payload) => dispatch(editSupplyRouteName(payload)),
  setSupplyRouteTableConfigLoader: (payload) =>
    dispatch(setSupplyRouteTableConfigLoader(payload)),
  resetSupplyRouteState: () => dispatch(resetSupplyRouteState()),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ManageSupplyRouteTable);
