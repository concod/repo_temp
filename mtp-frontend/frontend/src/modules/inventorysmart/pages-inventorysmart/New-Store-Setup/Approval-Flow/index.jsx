import { useEffect, useState } from "react";
import { connect } from "react-redux";

import { Button, Typography } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { common } from "modules/assortsmart/constants-assortsmart/stringContants";

import { Prompt } from "impact-ui";
import { cloneDeep } from "lodash";
import {
  CONFIGURATION,
  NEW_STORE_APPROVAL_FLOW,
} from "../../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  GO_TO_NEW_STORE_DASHBOARD_MESSAGE,
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
  const selectedStore = props.location.state;
  const homeIcon = [
    {
      label: "Configurations/New Store Approval",
      id: 1,
    },
  ];
  const globalClasses = globalStyles();
  const [storeDetailsColumns, setStoreDetailsColumns] = useState([]);
  const [storeDetailsData, setStoreDetailsData] = useState([]);
  const [reservedProductsColumns, setReservedProductsColumns] = useState([]);
  const [reservedProductsData, setReservedProductsData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [demandValueOnEdit, setDemandValueOnEdit] = useState([]);

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setNewStoreApprovalFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=new_store_dashboard"
        )();
        let reserveCols = await getColumnsAg("table_name=new_store_release")();
        let storeDetailsData = await props.fetchApprovalFlowStoreList(
          selectedStore?.store_code
        );
        let reservedDetailsData = await props.fetchApprovalFlowReserveList(
          selectedStore?.store_code
        );
        props.setNewStoreApprovalFlowDetails(storeDetailsData.data?.data);
        props.setNewStoreApprovalFlowReservedProducts(
          reservedDetailsData.data?.data
        );
        setStoreDetailsColumns(storeDetailsCols);
        setReservedProductsColumns(reserveCols);
        props.setNewStoreApprovalFlowLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setNewStoreApprovalFlowLoader(false);
      }
    };
    getInitialData();
  }, []);

  useEffect(() => {
    setStoreDetailsData(props.newStoreApprovalFlowDetails);
  }, [props.newStoreApprovalFlowDetails]);

  useEffect(() => {
    if (props.newStoreApprovalFlowReservedProducts.length) {
      let reservedDetailsDataToApprove = cloneDeep(
        props.newStoreApprovalFlowReservedProducts
      ).filter((item) => !item.approved);
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

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const approveArticlesToReserve = async () => {
    try {
      props.setNewStoreApprovalFlowLoader(true);
      let reqBody = {
        store_code: selectedRows[0]["store_code"],
        product_codes: selectedRows.map((item) => item.product_code),
      };
      let response = await props.reserveListOfArticles(reqBody);
      if (response.data?.status) {
        displaySnackMessages("Successfully Approved", "success", () =>
          props.history.push({
            pathname: CONFIGURATION,
            state: NEW_STORE_APPROVAL_FLOW,
          })
        );
      }
      props.setNewStoreApprovalFlowLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewStoreApprovalFlowLoader(false);
    }
  };

  const saveDemandOnEdit = async () => {
    try {
      props.setNewStoreApprovalFlowLoader(true);
      let saveDemand = reservedProductsData.filter((item) =>
        demandValueOnEdit.includes(item.key)
      );
      let reqBody = {
        row_data: saveDemand.map((prod) => {
          return {
            store_code: prod.store_code,
            product_code: prod.product_code,
            original_reserved: prod.original_reserved,
          };
        }),
      };
      let response = await props.reserveDemandEdited(reqBody);
      if (response.data?.status) {
        displaySnackMessages("Edits Successfully Saved", "success");
      }
      props.setNewStoreApprovalFlowLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewStoreApprovalFlowLoader(false);
    }
  };

  const onCellValueChanged = (params) => {
    const { data } = params;
    if (data.original_reserved) {
      let listOfRowsEdited = [...new Set([...demandValueOnEdit, data.key])];
      setDemandValueOnEdit(listOfRowsEdited);
    } else {
      displaySnackMessages("Enter a value", "warning");
    }
  };

  return (
    <Loader loader={props.newStoreApprovalFlowLoader}>
      <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
      <div className={globalClasses.tableWrapper}>
        <Typography variant="h3" className={globalClasses.marginVertical1rem}>
          New Store Approval
        </Typography>
        <Typography variant="h4" className={globalClasses.marginVertical1rem}>
          Store Details
        </Typography>
        <AgGridComponent
          columns={storeDetailsColumns}
          rowdata={storeDetailsData}
          uniqueRowId={"store_code"}
        />
        <div className={globalClasses.marginVertical1rem}>
          <Typography variant="h4" className={globalClasses.marginVertical1rem}>
            Reserved Products
          </Typography>
          <AgGridComponent
            columns={reservedProductsColumns}
            rowdata={reservedProductsData}
            uniqueRowId={"key"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
      </div>
      <div className={globalClasses.centerAlign}>
        <Button
          color="primary"
          variant="outlined"
          id="new-store-button"
          onClick={() => setShowGoBackDialog(true)}
        >
          Back
        </Button>
        <Button
          className={globalClasses.marginLeft1rem}
          color="primary"
          variant="contained"
          id="new-store-button"
          onClick={saveDemandOnEdit}
          disabled={!demandValueOnEdit.length}
        >
          Save Edits
        </Button>
        <Button
          className={globalClasses.marginLeft1rem}
          color="primary"
          variant="contained"
          id="new-store-button"
          onClick={approveArticlesToReserve}
          disabled={!selectedRows.length}
        >
          Approve
        </Button>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        subHeading={GO_TO_NEW_STORE_DASHBOARD_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            props.history.push({
              pathname: CONFIGURATION,
              state: NEW_STORE_APPROVAL_FLOW,
            });
            setShowGoBackDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowGoBackDialog(false),
        }}
        variant="error"
      />
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
