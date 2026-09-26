import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Button, Prompt, Breadcrumbs, Badge, Modal, Input } from "impact-ui-v3";
import { Grid } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";

import { cloneDeep } from "lodash";
import {
  CONFIGURATION,
  NEW_STORE_APPROVAL_FLOW,
} from "../../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
  NO_TABLE_DATA_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchApprovalFlowReserveList,
  fetchApprovalFlowStoreList,
  reserveDemandEdited,
  reserveListOfArticles,
  setNewStoreApprovalFlowDetails,
  setNewStoreApprovalFlowLoader,
  setNewStoreApprovalFlowReservedProducts,
} from "../../../services-inventorysmart/New-Store/new-store-approval-flow";

const NewStoreApprovalFlow = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const approveTableInstance = useRef({});

  const selectedStore = location.state;

  const globalClasses = globalStyles();
  const [storeDetailsColumns, setStoreDetailsColumns] = useState([]);
  const [storeDetailsData, setStoreDetailsData] = useState([]);
  const [reservedProductsColumns, setReservedProductsColumns] = useState([]);
  const [reservedProductsData, setReservedProductsData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [demandValueOnEdit, setDemandValueOnEdit] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [reserveQuantity, setReserveQuantity] = useState(0);
  const [isSelectAllRecords, setIsSelectAllRecords] = useState(false);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setNewStoreApprovalFlowLoader(false);
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setNewStoreApprovalFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=new_store_dashboard_approve"
        )();
        let reserveCols = await getColumnsAg("table_name=new_store_approve")();
        let [storeDetailsData, reservedDetailsData] = await Promise.all([
          props.fetchApprovalFlowStoreList(selectedStore?.store_code),
          props.fetchApprovalFlowReserveList(selectedStore?.store_code),
        ]);
        props.setNewStoreApprovalFlowDetails(storeDetailsData.data?.data);
        props.setNewStoreApprovalFlowReservedProducts(
          reservedDetailsData.data?.data
        );
        if (storeDetailsData.data?.show_message) {
          displaySnackMessages(storeDetailsData.data?.message, "warning");
        }
        if (reservedDetailsData.data?.show_message) {
          displaySnackMessages(reservedDetailsData.data?.message, "warning");
        }
        setStoreDetailsColumns(storeDetailsCols);
        setReservedProductsColumns(reserveCols);
        props.setNewStoreApprovalFlowLoader(false);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    getInitialData();
  }, []);

  useEffect(() => {
    if (props.newStoreApprovalFlowDetails?.length) {
      setStoreDetailsData(props.newStoreApprovalFlowDetails);
    }
  }, [props.newStoreApprovalFlowDetails]);

  useEffect(() => {
    if (props.newStoreApprovalFlowReservedProducts?.length) {
      // items that are not approved are fetched and displayed in this table
      let reservedDetailsDataToApprove = cloneDeep(
        props.newStoreApprovalFlowReservedProducts
      );
      setReservedProductsData(reservedDetailsDataToApprove);
    }
  }, [props.newStoreApprovalFlowReservedProducts]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const renderBadge = (cellProps) => {
    const { colDef, data } = cellProps || {};
    const accessor = colDef?.accessor;
    const statusText = data?.status;

    // Map of status to badge props
    const badgeMap = {
      status: {
        Reserved: {
          color: "success",
          label: "Reserved",
          variant: "filled",
        },
        Unreserved: {
          color: "error",
          label: "Unreserved",
          variant: "filled",
        },
      },
    };

    const badgeProps = badgeMap[accessor]?.[statusText];

    if (!badgeProps) return null;

    return (
      <div>
        <Badge
          color={badgeProps.color}
          label={badgeProps.label}
          onClick={() => {}} // no action required
          size="default"
          variant={badgeProps.variant}
        />
      </div>
    );
  };

  const getProductsForPayload = (edit_type) => {
    return approveTableInstance.current?.api?.getSelectedRows().map((item) => {
      return {
        product_code: item.product_code,
        approved_qty: item?.approved_qty,
      };
    });
  };

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    let isSelectAll = event.api.isSelectAllRecords;
    setSelectedRows(selections);
    setIsSelectAllRecords(isSelectAll);
  };

  const approveArticlesToReserve = async (edit_type = "grid") => {
    try {
      props.setNewStoreApprovalFlowLoader(true);
      let reqBody = {
        store_code: selectedStore?.store_code,
        products: getProductsForPayload(edit_type),
        edit_type: edit_type,
      };

      let response = await props.reserveListOfArticles(reqBody);
      clearSetAllModal();
      if (response.data?.status || response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success", () => {
          navigate(CONFIGURATION, {
            state: NEW_STORE_APPROVAL_FLOW,
          });
        });
      }
      props.setNewStoreApprovalFlowLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const clearSetAllModal = () => {
    setShowSetAllModal(false);
    setReserveQuantity(0);
  };

  const renderReserveFlowActionButtons = () => {
    let options = [];

    options.push(
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="set-all-reserve-flow-button"
        onClick={() => setShowSetAllModal(true)}
        disabled={!selectedRows.length} // to check this, n make sure it gets enabled when more than one row is selected
      >
        Set All
      </Button>,
       <Button
       size="large"
       type="default"
       variant="primary"
       id="new-store-button"
       onClick={() => approveArticlesToReserve("grid")}
       disabled={!selectedRows.length}
     >
       Reserve Products
     </Button>
    );

    return options;
  };

  const onBlur = (_e, data) => {
    if (data.oh_oo_units != null) {
      if (data.approved_qty != null && data.approved_qty <= data.oh_oo_units) {
        let listOfRowsEdited = [
          ...new Set([...demandValueOnEdit, data.product_code]),
        ];
        setDemandValueOnEdit(listOfRowsEdited);
      } else {
        setTimeout(() => {
          displaySnackMessages(
            "Enter a value less than total inventory",
            "warning"
          );
          if (approveTableInstance?.current?.api) {
            approveTableInstance?.current?.api?.refreshCells({
              columns: ["approved_qty"],
          			force: true,
          		});
          }
        }, 0);
        data.approved_qty = data.oh_oo_units;
        approveTableInstance.current.api.refreshCells({
          columns: ["approved_qty"],
        });
      }
    } else if (data.approved_qty && data.approved_qty <= 10000) {
      let listOfRowsEdited = [
        ...new Set([...demandValueOnEdit, data.product_code]),
      ];
      setDemandValueOnEdit(listOfRowsEdited);
    } else {
      displaySnackMessages("Enter a value less than 10000", "warning");
      data.approved_qty = 0;
      approveTableInstance.current.api.refreshCells({
        columns: ["approved_qty"],
      });
    }
  };
  const setAllUpdateReservedQuantity = () => {
    const updatedRows = selectedRows.map((item) => {
      return {
        ...item,
        approved_qty: Math.max(
          reserveQuantity < item.oh_oo_units
            ? reserveQuantity
            : item.oh_oo_units,
          0
        ),
      };
    });
    approveTableInstance.current?.api?.applyTransaction({
      update: updatedRows,
    });
    displaySnackMessages(
      "Reserve quantity has been updated successfully (capped at DC OH Net Avail(Cyclic) + Upcoming OO)",
      "success"
    );
    clearSetAllModal();
  };

  const setApproveTableInstance = (params) => {
    approveTableInstance.current = params;
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
      label: "New Store Reserve",
      to: "#",
    },
  ];

  return (
    <Loader loader={props.newStoreApprovalFlowLoader}>
      <div className={globalClasses.marginAround}>
        <Breadcrumbs list={paths} />
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={storeDetailsColumns}
            rowdata={storeDetailsData}
            uniqueRowId={"store_code"}
            skipAutoSizeColumn
            sizeColumnsToFitFlag
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            tableHeader="Store Details"
          />
          <AgGridComponent
            columns={reservedProductsColumns}
            rowdata={reservedProductsData}
            uniqueRowId={"product_code"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            onBlur={onBlur}
            loadTableInstance={setApproveTableInstance}
            skipAutoSizeColumn
            sizeColumnsToFitFlag
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            topRightOptions={renderReserveFlowActionButtons()}
            tableHeader="Products Available for Reservation"
            paginationPageSize={props.pageSize || 10}
            downloadAsExcel={reservedProductsData?.length ? true : false}
            noEditableCustomCellRender={(cellProps) => renderBadge(cellProps)}
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
        variant="warning"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
      >
        {GO_TO_NEW_STORE_DASHBOARD_MESSAGE}
      </Prompt>
      {showSetAllModal && (
        <Modal
          open={showSetAllModal}
          onClose={() => clearSetAllModal()}
          onPrimaryButtonClick={() => setAllUpdateReservedQuantity()}
          onSecondaryButtonClick={() => clearSetAllModal()}
          title="Set Reserve Quantity"
          primaryButtonLabel={`Apply to ${selectedRows.length} products`}
          secondaryButtonLabel="Cancel"
          size="small"
        >
          <div>
            <Input
              onChange={(e) => {
                if (e.target.value < 0) {
                  setReserveQuantity(0);
                } else setReserveQuantity(e.target.value);
              }}
              placeholder="Enter value"
              type="number"
              value={reserveQuantity}
              label="Reserve Quantity"
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
    newStoreApprovalFlowLoader:
      inventorysmartReducer.inventorySmartNewStoreApprovalFlowService
        .newStoreApprovalFlowLoader,
    newStoreApprovalFlowDetails:
      inventorysmartReducer.inventorySmartNewStoreApprovalFlowService
        .newStoreApprovalFlowDetails,
    newStoreApprovalFlowReservedProducts:
      inventorysmartReducer.inventorySmartNewStoreApprovalFlowService
        .newStoreApprovalFlowReservedProducts,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewStoreApprovalFlowLoader: (body) =>
      dispatch(setNewStoreApprovalFlowLoader(body)),
    fetchApprovalFlowReserveList: (body) =>
      dispatch(fetchApprovalFlowReserveList(body)),
    fetchApprovalFlowStoreList: (body) =>
      dispatch(fetchApprovalFlowStoreList(body)),
    reserveListOfArticles: (body) => dispatch(reserveListOfArticles(body)),
    setNewStoreApprovalFlowDetails: (body) =>
      dispatch(setNewStoreApprovalFlowDetails(body)),
    setNewStoreApprovalFlowReservedProducts: (body) =>
      dispatch(setNewStoreApprovalFlowReservedProducts(body)),
    reserveDemandEdited: (body) => dispatch(reserveDemandEdited(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoreApprovalFlow);
