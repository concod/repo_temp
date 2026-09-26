import { useEffect, useState } from "react";
import { connect } from "react-redux";

import { Button, Typography } from "@mui/material";

import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

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
  setNewStoreApprovalFlowDetails,
  setNewStoreApprovalFlowReservedProducts,
} from "../../../services-inventorysmart/New-Store/new-store-approval-flow";

import { Prompt } from "impact-ui";
import {
  releaseListOfArticles,
  setNewStoreReleaseFlowLoader,
} from "../../../services-inventorysmart/New-Store/new-store-release-flow";

const NewStoreReleaseFlow = (props) => {
  const selectedStore = props.location.state;
  const homeIcon = [
    {
      label: "Configurations/New Store Release",
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

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setNewStoreReleaseFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=new_store_dashboard"
        )();
        let reserveCols = await getColumnsAg("table_name=new_store_reserve")();
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
        props.setNewStoreReleaseFlowLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setNewStoreReleaseFlowLoader(false);
      }
    };
    getInitialData();
  }, []);

  useEffect(() => {
    setStoreDetailsData(props.newStoreApprovalFlowDetails);
  }, [props.newStoreApprovalFlowDetails]);

  useEffect(() => {
    if (props.newStoreApprovalFlowReservedProducts.length) {
      let reservedDetailsDataToApprove = props.newStoreApprovalFlowReservedProducts.filter(
        (item) => item.release_status === false // as it can be null not using !item.release_status
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

  const onSelectionChanged = (event) => {
    let selections = event.api.getSelectedRows();
    setSelectedRows(selections);
  };

  const approveArticlesToReserve = async () => {
    try {
      props.setNewStoreReleaseFlowLoader(true);
      let reqBody = {
        store_code: selectedRows[0]["store_code"],
        product_codes: selectedRows.map((item) => item.product_code),
      };
      let response = await props.releaseListOfArticles(reqBody);
      if (response.data?.status) {
        displaySnackMessages("Successfully Released", "success", () =>
          props.history.push({
            pathname: CONFIGURATION,
            state: NEW_STORE_APPROVAL_FLOW,
          })
        );
      }
      props.setNewStoreReleaseFlowLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewStoreReleaseFlowLoader(false);
    }
  };

  return (
    <Loader loader={props.newStoreReleaseFlowLoader}>
      <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
      <div className={globalClasses.tableWrapper}>
        <Typography variant="h3" className={globalClasses.marginVertical1rem}>
          New Store Release
        </Typography>
        <Typography variant="h4" className={globalClasses.marginVertical1rem}>
          Store Details
        </Typography>
        <AgGridComponent
          columns={storeDetailsColumns}
          rowdata={storeDetailsData}
          sizeColumnsToFitFlag
          uniqueRowId={"store_code"}
        />
        <div className={globalClasses.marginVertical1rem}>
          <Typography variant="h4" className={globalClasses.marginVertical1rem}>
            Reserved Products
          </Typography>
          <AgGridComponent
            columns={reservedProductsColumns}
            rowdata={reservedProductsData}
            sizeColumnsToFitFlag
            uniqueRowId={"key"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
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
          onClick={approveArticlesToReserve}
          disabled={!selectedRows.length}
        >
          Release
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
    newStoreReleaseFlowLoader:
      inventorysmartReducer.inventorySmartNewStoreReleaseFlowService
        .newStoreReleaseFlowLoader,
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
    setNewStoreReleaseFlowLoader: (body) =>
      dispatch(setNewStoreReleaseFlowLoader(body)),
    fetchApprovalFlowReserveList: (body) =>
      dispatch(fetchApprovalFlowReserveList(body)),
    fetchApprovalFlowStoreList: (body) =>
      dispatch(fetchApprovalFlowStoreList(body)),
    releaseListOfArticles: (body) => dispatch(releaseListOfArticles(body)),
    setNewStoreApprovalFlowDetails: (body) =>
      dispatch(setNewStoreApprovalFlowDetails(body)),
    setNewStoreApprovalFlowReservedProducts: (body) =>
      dispatch(setNewStoreApprovalFlowReservedProducts(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoreReleaseFlow);
