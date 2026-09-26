import React, { useRef, useState } from "react";
import { connect } from "react-redux";
import ArticleSummaryTable from "./ArticleSummaryTable";
import ProductDetailsTable from "./ProductDetailsTable";
import { addSnack } from "core/actions/snackbarActions";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { setFetchProductStoreDetails } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";

const ProductView = function (props) {
  const classes = useStyles();

  const storeDetailsTableInstance = useRef(null);
  const [viewStoreDetailsTable, setViewStoreDetailsTable] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  const setCellsToBeDisabled = (row) => {
    const isStoreSelected = storeDetailsTableInstance?.current?.api
      ?.getSelectedRows()
      .some((store) => row.store_id === store.store_id);
    return isStoreSelected ? false : true;
  };

  const toggleStoreDetailsTable = (data, columnName) => {
    const selectedArticle = data?.article;
    props.setFetchProductStoreDetails(null);
    setViewStoreDetailsTable(true);
    setSelectedArticle(selectedArticle);
    setSelectedData(data);
  };

  const actionMap = {
    article: toggleStoreDetailsTable,
    display_article: toggleStoreDetailsTable,
    size_six_b_allocated_qty: setCellsToBeDisabled,
    size_seven_b_allocated_qty: setCellsToBeDisabled,
    size_eight_b_allocated_qty: setCellsToBeDisabled,
    size_nine_b_allocated_qty: setCellsToBeDisabled,
    size_ten_b_allocated_qty: setCellsToBeDisabled,
    size_eleven_b_allocated_qty: setCellsToBeDisabled,
  };

  return (
    <div className={classes.removeFrozenBorder}>
      <ArticleSummaryTable tab={"product"} />
      <div className={classes.marginTop24}>
        <ProductDetailsTable
          actionMap={actionMap}
          selectedArticle={selectedArticle}
          selectedData={selectedData}
          viewStoreDetailsTable={viewStoreDetailsTable}
          setViewStoreDetailsTable={setViewStoreDetailsTable}
          displayArticle={selectedData?.display_article}
        />
      </div>
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  setFetchProductStoreDetails: (payload) =>
    dispatch(setFetchProductStoreDetails(payload)),
});

export default connect(null, mapDispatchToProps)(ProductView);
