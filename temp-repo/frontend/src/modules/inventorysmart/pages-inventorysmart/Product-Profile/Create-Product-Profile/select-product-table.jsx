import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";

import { Paper, Typography, Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";

import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import Form from "core/Utils/form";

import {
  setProductsToSelectForProductProfile,
  getProductsToSelectForProductProfile,
  setNewProductProfileLoader,
} from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import {
  CONTRIBUTION_PERCENTAGE,
  ENTER_CONTRIBUTION_VAL_VALIDATION_MSG,
} from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView } from "../../inventorysmart-utility";

import { cloneDeep, isEmpty } from "lodash";

const useStyles = makeStyles(() => ({
  alignFormContainer: {
    display: "flex",
    margin: "1rem",
    width: "15%",
    alignItems: "center",
    "& .MuiGrid-root>.MuiGrid-item": {
      paddingTop: "10px",
    },
  },
}));

const SelectProductTableComponent = (props) => {
  const [selectProductTableColumn, setSelectProductTableColumn] = useState([]);
  const [selectProductTableData, setSelectProductTableData] = useState([]);
  const [contributionPercentage, setContributionPercentage] = useState({
    contributionPercentage: 0,
  });

  const classes = useStyles();
  const selectedProductIdsRef = useRef([]);
  const selectedProductsTableRef = useRef();

  useEffect(() => {
    (async () => {
      props.setNewProductProfileLoader(true);
      let styleColorColumnDef = await getColumnsAg(
        "table_name=create_product_profile_style_color_table"
      )();
      setSelectProductTableColumn(styleColorColumnDef);
    })();
  }, []);

  // preselected values on edit to be set
  useEffect(() => {
    if (!isEmpty(props.listOfProducts)) {
      setSelectProductTableData(props.listOfProducts);
      setContributionPercentage({ contributionPercentage: 100 });
      scrollIntoView(selectedProductsTableRef);
    }
  }, [props.listOfProducts]);

  useEffect(() => {
    if (!isEmpty(props.preSelectedArticles)) {
      selectedProductIdsRef.current = props.preSelectedArticles;
    }
  }, [props.preSelectedArticles]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows().map((item) => item.article);
    selectedProductIdsRef.current = selections;
    props.selectedArticles(selections);
  };

  const globalClasses = globalStyles();

  const handleChangeContributionPercentage = (value) => {
    setContributionPercentage(value);
  };

  const onApply = () => {
    if (contributionPercentage.contributionPercentage) {
      let val = Number(contributionPercentage.contributionPercentage);
      let sum = 0,
        rows = [];
      let styleColorRows = cloneDeep(props.listOfProducts);
      styleColorRows.every((item) => {
        sum = sum + item.contribution;
        if (sum <= val) {
          rows.push(item);
        }
        if (sum > val) return false;
        else return true;
      });
      setSelectProductTableData(rows);
    } else {
      props.displaySnackMessages(
        ENTER_CONTRIBUTION_VAL_VALIDATION_MSG,
        "warning"
      );
    }
  };

  return (
    <div className={globalClasses.marginAround}>
      <Paper ref={selectedProductsTableRef}>
        <Typography variant="h5" className={globalClasses.paperHeader}>
          Select Product
        </Typography>
        <div className={classes.alignFormContainer}>
          <Form
            layout={"vertical"}
            maxFieldsInRow={1}
            handleChange={handleChangeContributionPercentage}
            fields={CONTRIBUTION_PERCENTAGE}
            updateDefaultValue={false}
            defaultValues={contributionPercentage}
            labelWidthSpan={2}
            fieldTypeWidthSpan={3}
          ></Form>
          <div>
            <Button
              color="primary"
              variant="text"
              onClick={() => onApply()}
              disabled={!props.listOfProducts?.length}
            >
              Apply
            </Button>
          </div>
        </div>
        <div className={globalClasses.evenPaddingAround}>
          <AgGridComponent
            rowdata={selectProductTableData}
            columns={selectProductTableColumn}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            uniqueRowId={"article"}
            sizeColumnsToFitFlag
            onGridChanged
            rowSelection={"multiple"}
            selectedRows={selectedProductIdsRef.current}
          />
        </div>
      </Paper>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newProductProfileLoader:
      inventorysmartReducer.createProductProfileReducer.newProductProfileLoader,
    newProductProfileFilterConfiguration:
      inventorysmartReducer.createProductProfileReducer
        .newProductProfileFilterConfiguration,
    listOfProducts:
      inventorysmartReducer.createProductProfileReducer.listOfProducts,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
    setProductsToSelectForProductProfile: (body) =>
      dispatch(setProductsToSelectForProductProfile(body)),
    getProductsToSelectForProductProfile: (body) =>
      dispatch(getProductsToSelectForProductProfile(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SelectProductTableComponent);
