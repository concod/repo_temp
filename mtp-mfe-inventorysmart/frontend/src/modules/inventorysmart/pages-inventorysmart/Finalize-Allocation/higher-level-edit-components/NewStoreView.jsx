import React, { useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import NewArticleSummaryTableComponent from "./NewArticleSummaryTable";
import { addSnack } from "core/actions/snackbarActions";
import NewStoreDetailsTableComponent from "./NewStoreDetailsTable";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";

const NewStoreViewComponent = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [viewStoreDetailsTable, setViewStoreDetailsTable] = useState(false);
  const [viewArticlesTable, setViewArticlesTable] = useState(false);
  const [selectedStores, setSelectedStores] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const [openPopup, setOpenPopup] = useState(false);
  const [columnSelected, setColumnSelected] = useState(null);
  const [modalRows, setModalRows] = useState([]);

  const [displayArticle, setDisplayArticle] = useState(null);

  const toggleStoreDetailsTable = (data, columnName) => {
    const selectedArticle = data?.article;
    props.setFetchProductStoreDetails(null);
    setViewStoreDetailsTable(true);
    setSelectedArticle(selectedArticle);
    setDisplayArticle(data?.display_article);
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
    // psa_name: toggleStoreBandStoreDetailsTable,
    article: toggleStoreDetailsTable,
    display_article: toggleStoreDetailsTable,
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
    // here to add the edit and view logic
    <div>
      <NewArticleSummaryTableComponent tab={"store"} />
      <div className={globalClasses.marginTop}>
        <NewStoreDetailsTableComponent
          showInSetAll={props.showInSetAll}
          actionMap={actionMap}
          columnSelected={columnSelected}
          modalRows={modalRows}
          setOpenPopup={setOpenPopup}
          openPopup={openPopup}
          viewArticlesTable={viewArticlesTable}
          selectedStores={selectedStores}
          viewStoreDetailsTable={viewStoreDetailsTable}
          selectedArticle={selectedArticle}
          setViewArticlesTable={setViewArticlesTable}
          setViewStoreDetailsTable={setViewStoreDetailsTable}
          displayArticle={displayArticle}
        />
      </div>
    </div>
  );
};
const mapStateToProps = (store) => {
  return {
    showInSetAll:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.showInSetAll,
    isStoreBand:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isStoreBand,
  };
};
const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoreViewComponent);
