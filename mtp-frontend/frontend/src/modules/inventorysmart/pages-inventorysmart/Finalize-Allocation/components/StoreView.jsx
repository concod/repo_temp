import React, { useState } from "react";
import { connect } from "react-redux";
import Paper from "@mui/material/Paper";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import ArticleSummaryTable from "./ArticleSummaryTable";
import { Typography } from "@mui/material";
import ProductStoreDetailsTable from "./ProductStoreDetailsTable";
import { addSnack } from "core/actions/snackbarActions";
import ProductDetailsTable from "./ProductDetailsTable";
import StoreDetailsTable from "./StoreDetailsTable";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const StoreView = function (props) {
  const globalClasses = globalStyles();

  const [viewStoreDetailsTable, setViewStoreDetailsTable] = useState(false);
  const [viewArticlesTable, setViewArticlesTable] = useState(false);
  const [selectedStores, setSelectedStores] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const [openPopup, setOpenPopup] = useState(false);
  const [columnSelected, setColumnSelected] = useState(null);
  const [modalRows, setModalRows] = useState([]);
  const [selectedData, setSelectedData] = useState(null);

  const toggleStoreDetailsTable = (data, columnName) => {
    const selectedArticle = data?.article;
    setViewStoreDetailsTable(true);
    setSelectedArticle(selectedArticle);
    setSelectedData(data);
  };

  const toggleArticlesTable = (data, columnName) => {
    const selectedStore = data?.store || data?.store_code;
    setViewArticlesTable(true);
    setSelectedStores(selectedStore);
  };

  const onClickHandlerForLink = (p_data, p_column, p_columnConfig) => {
    let l_mappingKeyForData = p_columnConfig?.extra?.mapping;
    let l_rowData = [p_data];
    setColumnSelected(p_column);
    if (l_mappingKeyForData) {
      l_rowData = p_data?.[l_mappingKeyForData];
      l_rowData[0]["store_code"] = p_data?.["store_code"];
    }
    setModalRows(l_rowData);
    setOpenPopup(true);
  };

  const actionMap = {
    store: toggleArticlesTable,
    store_id: toggleArticlesTable,
    store_code: toggleArticlesTable,
    article: toggleStoreDetailsTable,
    oo: onClickHandlerForLink,
    oh: onClickHandlerForLink,
    it: onClickHandlerForLink,
  };

  const onSetDates = () => {
    if (selectedStores?.length === 0) {
      displaySnackMessages(
        "Please select atleast one store to set dates",
        "error"
      );
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  return (
    <LoadingOverlay loader={props.plansmartDashboardLoader}>
      <Paper className={globalClasses.paperWrapper}>
        <div className={globalClasses.marginTop}>
          <ArticleSummaryTable tab={"store"} />
        </div>
      </Paper>
      <div className={globalClasses.marginTop}>
        <Paper className={globalClasses.paperWrapper}>
          <Typography
            style={{ flex: 1 }}
            variant="h6"
            className={globalClasses.marginBottom}
            gutterBottom
          >
            Store Details
          </Typography>
          <StoreDetailsTable
            showInSetAll={props.showInSetAll}
            actionMap={actionMap}
            columnSelected={columnSelected}
            modalRows={modalRows}
            setOpenPopup={setOpenPopup}
            openPopup={openPopup}
          />
        </Paper>
      </div>
      {viewArticlesTable && (
        <div className={globalClasses.marginTop}>
          <Paper className={globalClasses.paperWrapper}>
            <Typography
              style={{ flex: 1 }}
              variant="h6"
              className={globalClasses.marginBottom}
              gutterBottom
            >
              {dynamicLabelsBasedOnTenant("article")} Details
            </Typography>
            <ProductDetailsTable
              actionMap={actionMap}
              selectedStores={selectedStores}
            />
          </Paper>
        </div>
      )}

      {viewStoreDetailsTable && (
        <div className={globalClasses.marginTop}>
          <Paper className={globalClasses.paperWrapper}>
            <Typography
              style={{ flex: 1 }}
              variant="h6"
              className={globalClasses.marginBottom}
            >
              {dynamicLabelsBasedOnTenant("article")} Store Details of{" "}
              {selectedArticle} {" - Net DC Available"}
            </Typography>
            <ProductStoreDetailsTable
              selectedStores={selectedStores}
              selectedArticle={selectedArticle}
              tab={"store_view"}
              selectedData={selectedData}
            />
          </Paper>
        </div>
      )}
    </LoadingOverlay>
  );
};
const mapStateToProps = (store) => {
  return {
    showInSetAll:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.showInSetAll,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(StoreView);
