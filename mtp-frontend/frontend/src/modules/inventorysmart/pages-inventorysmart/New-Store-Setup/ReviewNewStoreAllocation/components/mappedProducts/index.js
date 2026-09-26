import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Button, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

import { addSnack } from "core/actions/snackbarActions";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import {
  downloadNewStoreMappedProducts,
  fetchNewStoreMappedProducts,
} from "modules/inventorysmart/services-inventorysmart/New-Store/new-store-approval-flow";
import { CACHE_BLOCKSIZE_STRATEGY } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import {
  displaySnackMessagesByType,
  SNACK_MSG_VARIANTS,
  SELECTED_PRODUCTS_COLUMN_FETCH_ERROR,
  SELECTED_PRODUCTS_DATA_FETCH_ERROR,
  SELECTED_PRODUCTS_TABLE_NAME,
  SELECTED_PRODUCTS_DATA_DOWNLOAD_INFO,
  SELECTED_PRODUCTS_DATA_DOWNLOAD_ERROR,
} from "../../utils";

import styles from "./index.module.scss";

const MappedProducts = (props) => {
  const {
    storeCode,
    addSnack,
    fetchColumns,
    fetchNewStoreMappedProducts,
    downloadNewStoreMappedProducts,
  } = props;

  const [selectedMaterialsLoader, setSelectedMaterialsLoader] = useState(0);
  const [selectedMaterialsColumns, setSelectedMaterialsColumns] = useState([]);

  const displayInfo = displaySnackMessagesByType(
    addSnack,
    SNACK_MSG_VARIANTS.INFO
  );

  const displayError = displaySnackMessagesByType(
    addSnack,
    SNACK_MSG_VARIANTS.ERROR
  );

  const fetchSelectedMaterialsColumns = () => {
    fetchColumns(
      SELECTED_PRODUCTS_TABLE_NAME,
      SELECTED_PRODUCTS_COLUMN_FETCH_ERROR,
      null,
      setSelectedMaterialsLoader,
      setSelectedMaterialsColumns
    );
  };

  useEffect(() => {
    // Selected products

    fetchSelectedMaterialsColumns();
  }, []);

  const onDownloadClick = () => {
    const body = {
      store_code: storeCode,
    };

    try {
      downloadNewStoreMappedProducts(body);

      displayInfo(SELECTED_PRODUCTS_DATA_DOWNLOAD_INFO);
    } catch {
      displayError(SELECTED_PRODUCTS_DATA_DOWNLOAD_ERROR);
    }
  };

  const fetchSelectedMaterials = async (manualbody, pageIndex, _params) => {
    let finalData = [];

    try {
      const reqBody = {
        filters: [],
        meta: {
          ...manualbody,
          limit: { limit: CACHE_BLOCKSIZE_STRATEGY, page: pageIndex + 1 },
        },
      };
      const response = await fetchNewStoreMappedProducts(storeCode, reqBody);

      finalData = response?.data?.data || [];
    } catch (error) {
      displayError(SELECTED_PRODUCTS_DATA_FETCH_ERROR);
    }

    return {
      data: finalData,
    };
  };

  return (
    <>
      <div className={styles["title-container"]}>
        <Typography variant="h4">Selected Products</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onDownloadClick}
        >
          Download
        </Button>
      </div>
      <div>
        <Loader loader={selectedMaterialsLoader}>
          <AgGridComponent
            columns={selectedMaterialsColumns}
            manualCallBack={fetchSelectedMaterials}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            downloadAsExcel
          />
        </Loader>
      </div>
    </>
  );
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    fetchNewStoreMappedProducts: (storeCode, body) =>
      dispatch(fetchNewStoreMappedProducts(storeCode, body)),
    downloadNewStoreMappedProducts: (body) =>
      dispatch(downloadNewStoreMappedProducts(body)),
  };
};

export default connect(null, mapDispatchToProps)(MappedProducts);
