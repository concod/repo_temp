import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Typography } from "@mui/material";

import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { fetchApprovalFlowStoreList } from "modules/inventorysmart/services-inventorysmart/New-Store/new-store-approval-flow";

import {
  STORE_DETAILS_COLUMN_FETCH_ERROR,
  STORE_DETAILS_DATA_FETCH_ERROR,
  STORE_GROUP_COLUMN_FETCH_ERROR,
  STORE_TABLE_NAME,
  STORE_GROUP_TABLE_NAME,
  displaySnackMessagesByType,
  SNACK_MSG_VARIANTS,
} from "../../utils";
import StoreGroupDetails from "../storeGroupDetails";

const StoreDetails = (props) => {
  const {
    storeCode,
    addSnack,
    fetchColumns,
    fetchApprovalFlowStoreList,
  } = props;

  const [isStoreGroupDialogOpen, setIsStoreGroupDialogOpen] = useState(false);
  const [storeDetailsLoader, setStoreDetailsLoader] = useState(0);
  const [storeDetailsColumns, setStoreDetailsColumns] = useState([]);
  const [storeDetailsData, setStoreDetailsData] = useState([]);
  const [storeGroupLoader, setStoreGroupLoader] = useState(0);
  const [storeGroupColumns, setStoreGroupColumns] = useState([]);
  const [storeGroupData, setStoreGroupData] = useState([]);

  const displayError = displaySnackMessagesByType(
    addSnack,
    SNACK_MSG_VARIANTS.ERROR
  );

  const onStoreNameClick = (row) => {
    const { store_groups_names = [] } = row;

    setStoreGroupData(store_groups_names);

    setIsStoreGroupDialogOpen(true);
  };

  const dashboardActions = {
    store_groups_count: onStoreNameClick,
  };

  const fetchStoreColumns = () => {
    fetchColumns(
      STORE_TABLE_NAME,
      STORE_DETAILS_COLUMN_FETCH_ERROR,
      dashboardActions,
      setStoreDetailsLoader,
      setStoreDetailsColumns
    );
  };

  const fetchStoreData = async () => {
    setStoreDetailsLoader((prev) => prev + 1);

    try {
      const storeDetailsResponse = await fetchApprovalFlowStoreList(storeCode);
      const storeDetails = storeDetailsResponse?.data?.data || [];

      setStoreDetailsData(storeDetails);
    } catch {
      setStoreDetailsData([]);

      displayError(STORE_DETAILS_DATA_FETCH_ERROR);
    }

    setStoreDetailsLoader((prev) => prev - 1);
  };

  const fetchStoreGroupColumns = () => {
    fetchColumns(
      STORE_GROUP_TABLE_NAME,
      STORE_GROUP_COLUMN_FETCH_ERROR,
      null,
      setStoreGroupLoader,
      setStoreGroupColumns
    );
  };

  useEffect(() => {
    // Store

    fetchStoreColumns();

    fetchStoreData();

    // Store Group

    fetchStoreGroupColumns();
  }, []);

  const onStoreGroupDialogClose = () => {
    setIsStoreGroupDialogOpen(false);
  };

  return (
    <>
      <Typography variant="h4">Store Details</Typography>
      <div>
        <Loader loader={storeDetailsLoader}>
          <AgGridComponent
            columns={storeDetailsColumns}
            rowdata={storeDetailsData}
            pagination={false}
            sideBar={{ hiddenByDefault: true }}
          />
        </Loader>
      </div>
      <StoreGroupDetails
        open={isStoreGroupDialogOpen}
        loader={storeGroupLoader}
        columns={storeGroupColumns}
        data={storeGroupData}
        onClose={onStoreGroupDialogClose}
      />
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchApprovalFlowStoreList: (body) =>
      dispatch(fetchApprovalFlowStoreList(body)),
    addSnack: (body) => dispatch(addSnack(body)),
  };
};

export default connect(null, mapDispatchToProps)(StoreDetails);
