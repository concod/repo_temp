import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { Button, Divider } from "@mui/material";

import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  CONFIGURATION,
  REVIEW_NEW_STORE_ALLOCATION,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

import {
  SNACK_MSG_VARIANTS,
  displaySnackMessagesByType,
  getBreadCrumbWithAction,
  getStoreId,
} from "./utils";
import StoreDetails from "./components/storeDetails";
import MappedProducts from "./components/mappedProducts";

import styles from "./index.module.scss";

function ReviewNewStoreAllocation(props) {
  const { addSnack } = props;

  const navigate = useNavigate();
  const location = useLocation();

  const navigateToNewStoreLandingPage = () =>
    navigate(CONFIGURATION, { state: REVIEW_NEW_STORE_ALLOCATION });

  const storeId = getStoreId(location);

  if (!isFinite(storeId) || storeId <= 0 || storeId % 1 !== 0) {
    navigateToNewStoreLandingPage();

    return null;
  }

  const storeCode = parseInt(storeId);

  const breadcrumb = getBreadCrumbWithAction(navigateToNewStoreLandingPage);

  const displayError = displaySnackMessagesByType(
    addSnack,
    SNACK_MSG_VARIANTS.ERROR
  );

  const tableColumnApiCall = (tableName, dashboardActions) => {
    const queryParam = `table_name=${tableName}`;

    return getColumnsAg(queryParam, null, dashboardActions)();
  };

  const fetchColumns = async (
    tableName,
    errMsg,
    dashboardActions,
    setLoader,
    setColumns
  ) => {
    setLoader((prev) => prev + 1);

    try {
      const columnsResponse = await tableColumnApiCall(
        tableName,
        dashboardActions
      );

      setColumns(columnsResponse);
    } catch {
      setColumns([]);

      displayError(errMsg);
    }

    setLoader((prev) => prev - 1);
  };

  const onBackClick = () => {
    navigateToNewStoreLandingPage();
  };

  return (
    <>
      <HeaderBreadCrumbs options={breadcrumb}></HeaderBreadCrumbs>
      <div className={styles["container"]}>
        <StoreDetails storeCode={storeCode} fetchColumns={fetchColumns} />
        <MappedProducts storeCode={storeCode} fetchColumns={fetchColumns} />
        <Divider />
        <div>
          <Button variant="outlined" onClick={onBackClick}>
            Back
          </Button>
        </div>
      </div>
    </>
  );
}

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
  };
};

export default connect(null, mapDispatchToProps)(ReviewNewStoreAllocation);
