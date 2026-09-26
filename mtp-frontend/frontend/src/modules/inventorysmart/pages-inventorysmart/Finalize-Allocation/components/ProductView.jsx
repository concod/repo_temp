import React, { useRef, useState } from "react";
import { connect } from "react-redux";
import Paper from "@mui/material/Paper";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import ArticleSummaryTable from "./ArticleSummaryTable";
import ProductDetailsTable from "./ProductDetailsTable";
import { Typography } from "@mui/material";
import ProductStoreDetailsTable from "./ProductStoreDetailsTable";
import { addSnack } from "core/actions/snackbarActions";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

const ProductView = function (props) {
  const globalClasses = globalStyles();

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
    setViewStoreDetailsTable(true);
    setSelectedArticle(selectedArticle);
    setSelectedData(data);
  };

  const actionMap = {
    article: toggleStoreDetailsTable,
    size_six_b_allocated_qty: setCellsToBeDisabled,
    size_seven_b_allocated_qty: setCellsToBeDisabled,
    size_eight_b_allocated_qty: setCellsToBeDisabled,
    size_nine_b_allocated_qty: setCellsToBeDisabled,
    size_ten_b_allocated_qty: setCellsToBeDisabled,
    size_eleven_b_allocated_qty: setCellsToBeDisabled,
  };

  return (
    <LoadingOverlay loader={props.plansmartDashboardLoader}>
      <Paper className={globalClasses.paperWrapper}>
        <div className={globalClasses.marginTop}>
          <ArticleSummaryTable tab={"product"} />
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
            {dynamicLabelsBasedOnTenant("article")} Details
          </Typography>
          <ProductDetailsTable actionMap={actionMap} tab={"product"}/>
        </Paper>
      </div>
      {viewStoreDetailsTable && (
        <div className={globalClasses.marginTop}>
          <Paper className={globalClasses.paperWrapper}>
            <Typography
              style={{ flex: 1 }}
              variant="h6"
              className={globalClasses.marginBottom}
              gutterBottom
            >
              {dynamicLabelsBasedOnTenant("article")} Store Details of{" "}
              {selectedArticle} {" - Net DC Available"}
            </Typography>
            <ProductStoreDetailsTable
              selectedArticle={selectedArticle}
              selectedData={selectedData}
            />
          </Paper>
        </div>
      )}
    </LoadingOverlay>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(null, mapDispatchToProps)(ProductView);
