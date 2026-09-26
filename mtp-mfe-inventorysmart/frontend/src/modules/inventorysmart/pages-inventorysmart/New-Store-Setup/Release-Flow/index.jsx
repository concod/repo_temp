import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Button, Prompt, Breadcrumbs, Modal, Input } from "impact-ui-v3";
import { Grid } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";

import {
  CONFIGURATION,
  NEW_STORE_APPROVAL_FLOW,
} from "../../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  NO_TABLE_DATA_MESSAGE,
  NEW_STORE_RELEASE_FLOW_EDIT_VALIDATION_MESSAGE,
  INVALID_MIN_QTY,
} from "../../../constants-inventorysmart/stringConstants";

import {
  releaseListOfArticles,
  setNewStoreReleaseFlowLoader,
  fetchReleaseFlowStoreList,
  fetchReleaseFlowApprovedList,
} from "../../../services-inventorysmart/New-Store/new-store-release-flow";

const NewStoreReleaseFlow = (props) => {
  const navigate = useNavigate();
  let location = useLocation();

  const selectedStore = location.state;
  const globalClasses = globalStyles();
  const [storeDetailsColumns, setStoreDetailsColumns] = useState([]);
  const [storeDetailsData, setStoreDetailsData] = useState([]);
  const [releasedProductsColumn, setReleasedProductsColumn] = useState([]);
  const [releaseProductsData, setReleasedProductsData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [releaseQuantity, setReleaseQuantity] = useState(0);
  const newStoreReleaseTableInstance = useRef(null);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setNewStoreReleaseFlowLoader(false);
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setNewStoreReleaseFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=new_store_dashboard"
        )();
        let reserveCols = await getColumnsAg("table_name=new_store_release")();
        let [storeDetailsData, releaseDetailsData] = await Promise.all([
          props.fetchReleaseFlowStoreList(selectedStore?.store_code),
          props.fetchReleaseFlowApprovedList(selectedStore?.store_code),
        ]);
        setStoreDetailsData(storeDetailsData.data?.data);
        setReleasedProductsData(releaseDetailsData.data?.data);
        if (storeDetailsData.data?.show_message) {
          displaySnackMessages(storeDetailsData.data?.message, "warning");
        }
        if (releaseDetailsData.data?.show_message) {
          displaySnackMessages(releaseDetailsData.data?.message, "warning");
        }
        setStoreDetailsColumns(storeDetailsCols);
        setReleasedProductsColumn(reserveCols);
        props.setNewStoreReleaseFlowLoader(false);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    getInitialData();
  }, []);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const releaseArticles = async (edit_type) => {
    try {
      props.setNewStoreReleaseFlowLoader(true);
      let reqBody = {
        store_code: selectedStore?.store_code,
        products: newStoreReleaseTableInstance.current?.api?.getSelectedRows().map((item) => {
          return {
            product_code: item.product_code,
            released_qty: item?.release_qty,
          };
        }),
      };
      if (edit_type !== "default") {
        reqBody.edit_type = edit_type;
      }
      let response = await props.releaseListOfArticles(reqBody);
      if (response.data?.status || response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success", () => {
          navigate(CONFIGURATION, {
            state: NEW_STORE_APPROVAL_FLOW,
          });
        });
      }
      props.setNewStoreReleaseFlowLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Configurations",
      to: CONFIGURATION,
    },
    {
      label: "New Store Release",
      to: "#",
    },
  ];

  const renderReleaseFlowActionButtons = () => {
    let options = [];
    if (props.editReleaseQty) {
      options.push(
        <Button
          size="large"
          type="default"
          variant="tertiary"
          id="set-all-release-flow-button"
          onClick={() => setShowSetAllModal(true)}
          disabled={!selectedRows.length}
        >
          Set All
        </Button>,
        <Button
          size="large"
          type="default"
          variant="primary"
          id="release-products-button"
          onClick={() => releaseArticles("grid")}
          disabled={!selectedRows.length}
        >
          Release Products
        </Button>
      );
    }
    return options;
  };

  const setNewSoreReleaseTableInstance = (params) => {
    newStoreReleaseTableInstance.current = params;
  };

  const setAllUpdateReleaseQuantity = () => {
    // Update the release_qty for each selected row, ensuring it does not exceed the item's on-hand (oh) quantity and is not less than 0
    const updatedRows = selectedRows.map((item) => {
      return {
        ...item,
        release_qty: Math.max(
          releaseQuantity < item.oh ? releaseQuantity : item.oh,
          0
        ),
      };
    });
    newStoreReleaseTableInstance.current?.api?.applyTransaction({
      update: updatedRows,
    });
    displaySnackMessages(
      "Release quantity has been updated successfully (capped at DC OH Net Avail(Cyclic))",
      "success"
    );
    clearSetAllModal();
  };

  const onBlur = (_e, data, column, isChanged, value, initialValue) => {
    if (column.colId === "release_qty" && isChanged) {
      if (Number(value) > Number(data.oh)) {
        data.release_qty = data.oh;
        displaySnackMessages(
          NEW_STORE_RELEASE_FLOW_EDIT_VALIDATION_MESSAGE,
          "warning"
        );
      } else if (Number(value) < 0) {
        data.release_qty = data.oh;
        displaySnackMessages(INVALID_MIN_QTY, "warning");
      } else {
        data.release_qty = value;
      }
      newStoreReleaseTableInstance.current.api.refreshCells({
        columns: ["release_qty"],
      });
    }
  };

  const clearSetAllModal = () => {
    setShowSetAllModal(false);
    setReleaseQuantity(0);
  };

  return (
    <Loader loader={props.newStoreReleaseFlowLoader}>
      <div className={globalClasses.marginAround}>
        <Breadcrumbs list={paths} />
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={storeDetailsColumns}
            rowdata={storeDetailsData}
            sizeColumnsToFitFlag
            skipAutoSizeColumn
            uniqueRowId={"store_code"}
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            tableHeader="Store Details"
          />
          <AgGridComponent
            columns={releasedProductsColumn}
            rowdata={releaseProductsData}
            sizeColumnsToFitFlag
            skipAutoSizeColumn
            uniqueRowId={"product_code"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            tableHeader={props.releaseFlowTableHeading || "Reserved Products"}
            paginationPageSize={props.pageSize || 10}
            downloadAsExcel={releaseProductsData?.length ? true : false}
            topRightOptions={renderReleaseFlowActionButtons()}
            onBlur={onBlur}
            loadTableInstance={setNewSoreReleaseTableInstance}
          />
          <Grid
            container
            sx={{
              gap: 1,
              background: "white",
              borderRadius: "8px",
              position: "absolute",
              left: "0",
            }}
            className={`${globalClasses.layoutAlignEnd} ${globalClasses.evenPaddingAround}`}
          >
            <Button
              size="large"
              type="default"
              variant="secondary"
              id="new-store-button"
              onClick={() => setShowGoBackDialog(true)}
            >
              Back
            </Button>
            {!props.editReleaseQty && (
              <Button
                size="large"
                type="default"
                variant="primary"
                id="new-store-button"
                onClick={() => releaseArticles("default")}
                disabled={!selectedRows.length}
              >
                Release
              </Button>
            )}
          </Grid>
        </div>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title={"Go back"}
        onPrimaryButtonClick={() => {
          navigate(CONFIGURATION, {
            state: NEW_STORE_APPROVAL_FLOW,
          });
          setShowGoBackDialog(false);
        }}
        onSecondaryButtonClick={() => setShowGoBackDialog(false)}
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        variant="warning"
      >
        {GO_TO_NEW_STORE_DASHBOARD_MESSAGE}
      </Prompt>
      {showSetAllModal && (
        <Modal
          open={showSetAllModal}
          onClose={() => clearSetAllModal()}
          onPrimaryButtonClick={() => setAllUpdateReleaseQuantity()}
          onSecondaryButtonClick={() => clearSetAllModal()}
          title="Set Release Quantity"
          primaryButtonLabel={`Apply to ${selectedRows.length} products`}
          secondaryButtonLabel="Cancel"
          size="small"
        >
          <div>
            <Input
              onChange={(e) => setReleaseQuantity(e.target.value)}
              placeholder="Enter value"
              type="number"
              value={releaseQuantity}
              label="Release Quantity"
              isRequired={true}
              inputProps={{
                min: 0,
              }}
            />
          </div>
        </Modal>
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoreReleaseFlowLoader:
      inventorysmartReducer.inventorySmartNewStoreReleaseFlowService
        .newStoreReleaseFlowLoader,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    releaseFlowTableHeading:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.releaseFlowTableHeading,
    editReleaseQty:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.editReleaseQty,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewStoreReleaseFlowLoader: (body) =>
      dispatch(setNewStoreReleaseFlowLoader(body)),
    fetchReleaseFlowApprovedList: (body) =>
      dispatch(fetchReleaseFlowApprovedList(body)),
    fetchReleaseFlowStoreList: (body) =>
      dispatch(fetchReleaseFlowStoreList(body)),
    releaseListOfArticles: (body) => dispatch(releaseListOfArticles(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoreReleaseFlow);
