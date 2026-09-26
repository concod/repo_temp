import React, { useState, useEffect } from "react";
import { Prompt,Button } from "impact-ui-v3";

import AgGridComponent from "core/Utils/agGrid";
import { Typography } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import {
  NO_TABLE_DATA_MESSAGE,
  ERROR_MESSAGE,
  GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { connect } from "react-redux";
import { setRemodelStoreReleaseFlowLoader,fetchRemodelStoreReleaseStoreDetails,fetchRemodelStoreReleaseApprovedList,releaseRemodelStoreApprovedProducts } from "modules/inventorysmart/services-inventorysmart/Remodel-Store/remodel-store-release-flow";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { getColumnsAg } from "core/actions/tableColumnActions";
import Loader from "core/Utils/Loader/loader";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
    CONFIGURATION,
    REMODEL_STORE_RELEASE_FLOW,
  } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {Breadcrumbs} from "impact-ui-v3";

const RemodelStoreReleaseFlow = (props) => {
  const [
    remodelStoreReleaseFlowStoreDetailsColumn,
    setRemodelStoreReleaseFlowStoreDetailsColumn,
  ] = useState([]);
  const [
    remodelStoreReleaseFlowStoreDetailsData,
    setRemodelStoreReleaseFlowStoreDetailsData,
  ] = useState([]);
  const [
    remodelStoreApprovedProductsColumn,
    setRemodelStoreApprovedProductsColumn,
  ] = useState([]);
  const [
    remodelStoreApprovedProductsData,
    setRemodelStoreApprovedProductsData,
  ] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const selectedStore = location.state;
  const globalClasses = globalStyles();

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setRemodelStoreReleaseFlowLoader(false);
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        props.setRemodelStoreReleaseFlowLoader(true);
        let storeDetailsCols = await getColumnsAg(
          "table_name=remodel_store_release_store_list" 
        )();
        let reserveCols = await getColumnsAg("table_name=remodel_store_release_product_list")();
        let storeDetailsData = await props.fetchRemodelStoreReleaseStoreDetails(
          selectedStore?.store_code
        );
        let reservedDetailsData = await props.fetchRemodelStoreReleaseApprovedList(
          selectedStore?.store_code
        );
        setRemodelStoreReleaseFlowStoreDetailsData(storeDetailsData.data?.data);
        setRemodelStoreApprovedProductsData(reservedDetailsData.data?.data);
        setRemodelStoreReleaseFlowStoreDetailsColumn(storeDetailsCols);
        setRemodelStoreApprovedProductsColumn(reserveCols);
        props.setRemodelStoreReleaseFlowLoader(false);
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

  const releaseArticles = async () => {
    try {
      props.setRemodelStoreReleaseFlowLoader(true);
      let reqBody = {
        store_code: selectedStore?.store_code,
        products: selectedRows.map((item) => {
          return {
            product_code: item.product_code,
            released_qty: item?.released_qty,
          };
        }),
      };
      let response = await props.releaseRemodelStoreApprovedProducts(reqBody);
      if (response.data?.status || response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success", () => {
          navigate(CONFIGURATION, {
            state: REMODEL_STORE_RELEASE_FLOW,
          });
        });
      }
      props.setRemodelStoreReleaseFlowLoader(false);
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
      label: "Remodel Store Release",
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
          onClick={releaseArticles}
          disabled={!selectedRows.length}
          sx={{
            marginLeft: "1rem",
          }}
          size="large"
        >
          Release
        </Button>
      </div>
    )
    return options;
  }
  return (
    <Loader loader={props.remodelStoreReleaseFlowLoader}>
      <div className={globalClasses.tableWrapper}>
        <div className={globalClasses.marginBottom}>
          <Breadcrumbs list={paths} />
        </div>
        <AgGridComponent
          columns={remodelStoreReleaseFlowStoreDetailsColumn}
          rowdata={remodelStoreReleaseFlowStoreDetailsData}
          sizeColumnsToFitFlag
          skipAutoSizeColumn
          uniqueRowId={"store_code"}
          noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
          tableHeader="Store Details"
        />
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={remodelStoreApprovedProductsColumn}
            rowdata={remodelStoreApprovedProductsData}
            sizeColumnsToFitFlag
            skipAutoSizeColumn
            uniqueRowId={"product_code"}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
            tableHeader="Approved Products"
            topRightOptions={topRightOptions()}
            downloadAsExcel={remodelStoreApprovedProductsData?.length ? true : false}
            paginationPageSize={props.pageSize || 10}
          />
        </div>
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        primaryButtonLabel={common.__ConfirmBtnText}
        secondaryButtonLabel={common.__RejectBtnText}
        onPrimaryButtonClick={() => {
            navigate(CONFIGURATION, {
              state: REMODEL_STORE_RELEASE_FLOW,
            });
            setShowGoBackDialog(false);
          }}
        onSecondaryButtonClick={() => setShowGoBackDialog(false)}
        handleClose={() => setShowGoBackDialog(false)}
        variant="error"
      >
        <Typography variant="h4">{GO_TO_REMODEL_STORE_DASHBOARD_MESSAGE}</Typography>
      </Prompt>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    remodelStoreReleaseFlowLoader:
      inventorysmartReducer.remodelStoreReleaseFlowService
        .remodelStoreReleaseFlowLoader,
    pageSize: inventorysmartReducer.inventorySmartCommonService.inventorysmartScreenConfig?.inventorysmart_page_count    
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setRemodelStoreReleaseFlowLoader: (data) =>
      dispatch(setRemodelStoreReleaseFlowLoader(data)),
    fetchRemodelStoreReleaseStoreDetails: (id) => dispatch(fetchRemodelStoreReleaseStoreDetails(id)),
    fetchRemodelStoreReleaseApprovedList: (id) => dispatch(fetchRemodelStoreReleaseApprovedList(id)),
    releaseRemodelStoreApprovedProducts: (body) => dispatch(releaseRemodelStoreApprovedProducts(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RemodelStoreReleaseFlow);