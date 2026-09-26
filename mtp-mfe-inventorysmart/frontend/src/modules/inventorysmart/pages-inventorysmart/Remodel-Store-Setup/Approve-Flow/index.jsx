import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Prompt, Button, Badge } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import {
  NO_TABLE_DATA_MESSAGE,
  ERROR_MESSAGE,
  GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  setRemodelStoreApprovalFlowLoader,
  fetchRemodelStoreApprovalStoreList,
  fetchRemodelStoreApprovalEligibleProductsList,
  approveProducts,
} from "modules/inventorysmart/services-inventorysmart/Remodel-Store/remodel-store-approval-flow";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  CONFIGURATION,
  REMODEL_STORE_APPROVAL_FLOW,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { Breadcrumbs } from "impact-ui-v3";

const RemodelStoreApproveFlow = (props) => {
  const [remodelStoreDetailsColumns, setRemodelStoreDetailsColumns] = useState(
    []
  );
  const [remodelStoreDetailsData, setRemodelStoreDetailsData] = useState([]);
  const [
    remodelStoreEligibleProductsColumn,
    setRemodelStoreEligibleProductsColumn,
  ] = useState([]);
  const [
    remodelStoreEligibleProductsData,
    setRemodelStoreEligibleProductsData,
  ] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [demandValueOnEdit, setDemandValueOnEdit] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);

  const globalClasses = globalStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedStore = location.state;
  const approveTableInstance = useRef({});

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setRemodelStoreApprovalFlowLoader(false);
  };

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
    const getInitialData = async () => {
      try {
        props.setRemodelStoreApprovalFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=remodel_store_approve_store_list"
        )();
        let reserveCols = await getColumnsAg(
          "table_name=remodel_store_approve_products_list"
        )();
        let storeDetailsData = await props.fetchRemodelStoreApprovalStoreList(
          selectedStore?.store_code
        );
        let reservedDetailsData = await props.fetchRemodelStoreApprovalEligibleProductsList(
          selectedStore?.store_code
        );
        setRemodelStoreDetailsColumns(storeDetailsCols);
        setRemodelStoreEligibleProductsColumn(reserveCols);
        setRemodelStoreDetailsData(storeDetailsData.data?.data);
        setRemodelStoreEligibleProductsData(reservedDetailsData.data?.data);
        props.setRemodelStoreApprovalFlowLoader(false);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    getInitialData();
  }, []);

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const setApproveTableInstance = (params) => {
    approveTableInstance.current = params;
  };

  const onCellValueChanged = (params) => {
    const { data } = params;
    if (data.approved_qty && data.approved_qty <= 10000) {
      let listOfRowsEdited = [
        ...new Set([...demandValueOnEdit, data.product_code]),
      ];
      setDemandValueOnEdit(listOfRowsEdited);
    } else {
      displaySnackMessages("Enter a value less than 10000", "warning");
      data.approved_qty = 0;
      approveTableInstance.current?.api?.refreshCells({
        columns: ["approved_qty"],
      });
    }
  };

  const renderBadge = (cellProps) => {
    const { colDef, data } = cellProps || {};
    const accessor = colDef?.accessor;
    const statusText = data?.status;

    // Map of status to badge props
    const badgeMap = {
      status: {
        "Reserved": {
          color: "success",
          label: "Reserved",
          variant: "filled",
        },
        "Unreserved": {
          color: "error",
          label: "Unreserved",
          variant: "filled",
        }
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

  const approveArticlesToReserve = async () => {
    try {
      props.setRemodelStoreApprovalFlowLoader(true);
      let reqBody = {
        store_code: selectedStore?.store_code,
        products: selectedRows.map((item) => {
          return {
            product_code: item.product_code,
            approved_qty: item?.approved_qty,
          };
        }),
      };
      let response = await props.approveProducts(reqBody);
      if (response.data?.status || response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success", () => {
          navigate(CONFIGURATION, {
            state: REMODEL_STORE_APPROVAL_FLOW,
          });
        });
      }
      props.setRemodelStoreApprovalFlowLoader(false);
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
      label: "Remodel Store Reserve",
      to: "#",
    },
  ];
  const topRightOptions = () => {
    let options = [];
    options.push(
      <div>
        <Button
          variant="tertiary"
          id="new-store-button"
          onClick={() => setShowGoBackDialog(true)}
          size="large"
        >
          Cancel
        </Button>
        <Button
          className={globalClasses.marginLeft1rem}
          variant="primary"
          id="new-store-button"
          onClick={approveArticlesToReserve}
          disabled={!selectedRows.length}
          sx={{
            marginLeft: "1rem",
          }}
          size="large"
        >
          Reserve Products
        </Button>
      </div>
    );
    return options;
  };
  return (
    <Loader loader={props.remodelStoreApprovalFlowLoader}>
      <div className={globalClasses.tableWrapper}>
        <div className={globalClasses.marginBottom}>
          <Breadcrumbs list={paths} />
        </div>
        <AgGridComponent
          columns={remodelStoreDetailsColumns}
          rowdata={remodelStoreDetailsData}
          uniqueRowId={"store_code"}
          skipAutoSizeColumn
          sizeColumnsToFitFlag
          noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
          tableHeader="Store Details"
        />
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={remodelStoreEligibleProductsColumn}
            rowdata={remodelStoreEligibleProductsData}
            uniqueRowId={"product_code"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            loadTableInstance={setApproveTableInstance}
            skipAutoSizeColumn
            sizeColumnsToFitFlag
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            tableHeader="Eligible Products"
            paginationPageSize={props.pageSize || 10}
            topRightOptions={topRightOptions()}
            noEditableCustomCellRender={(cellProps) => renderBadge(cellProps)}
            downloadAsExcel={
              remodelStoreEligibleProductsData?.length ? true : false
            }
          />
        </div>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        primaryButtonLabel={common.__ConfirmBtnText}
        onPrimaryButtonClick={() => {
          navigate(CONFIGURATION, {
            state: REMODEL_STORE_APPROVAL_FLOW,
          });
          setShowGoBackDialog(false);
        }}
        secondaryButtonLabel={common.__RejectBtnText}
        onSecondaryButtonClick={() => setShowGoBackDialog(false)}
        handleClose={() => setShowGoBackDialog(false)}
        variant="error"
      >
        <Typography variant="h4">
          {GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE}
        </Typography>
      </Prompt>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    remodelStoreApprovalFlowLoader:
      inventorysmartReducer.remodelStoreApprovalFlowService
        .remodelStoreApprovalFlowLoader,
    pageSize: inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setRemodelStoreApprovalFlowLoader: (loader) =>
      dispatch(setRemodelStoreApprovalFlowLoader(loader)),
    fetchRemodelStoreApprovalEligibleProductsList: (body) =>
      dispatch(fetchRemodelStoreApprovalEligibleProductsList(body)),
    fetchRemodelStoreApprovalStoreList: (body) =>
      dispatch(fetchRemodelStoreApprovalStoreList(body)),
    approveProducts: (body) => dispatch(approveProducts(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RemodelStoreApproveFlow);
