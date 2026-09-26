import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button,Tooltip } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import globalStyles from "core/Styles/globalStyles";
import Form from "core/Utils/form";
import {
  setNewProductProfileLoader,
} from "../../../services-inventorysmart/Product-Profile/create-product-profile-service";
import {
  CONTRIBUTION_PERCENTAGE,
  ENTER_CONTRIBUTION_VAL_VALIDATION_MSG,
  NO_TABLE_DATA_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import { scrollIntoView } from "../../inventorysmart-utility";
import "../product-profile.css";

const useStyles = makeStyles(() => ({
  alignFormContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: "8px",
    gap: "12px",
  },
  formContainer: {
    marginBottom: 0,
    display: "flex",
    alignItems: "center",
  },
  labelText: {
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  infoIcon: {
    cursor: "pointer",
    fontSize: "16px",
    color: "#6B7280",
  },
}));

const prepareColumnsForFullWidth = (columns) => {
  return columns.map((col) => {
    col.flex = 1;
    col.suppressSizeToFit = false;
    col.extra = {
      ...col.extra,
      width: undefined,
    };
    return col;
  });
};

const SelectProductTableComponent = (props) => {
  const [selectProductTableColumn, setSelectProductTableColumn] = useState([]);
  const [selectProductTableData, setSelectProductTableData] = useState([]);
  const [contributionPercentage, setContributionPercentage] = useState({
    contributionPercentage: 0,
  });

  const classes = useStyles();
  const selectedProductsTableRef = useRef();
  const agGridInstance = useRef(null);
  const [render, setRender] = useState(false);

  useEffect(() => {
    (async () => {
      props.setNewProductProfileLoader(true);
      let styleColorColumnDef = [];
      styleColorColumnDef = await getColumnsAg(
        "table_name=create_product_profile_style_color_table"
      )();
      setSelectProductTableColumn(prepareColumnsForFullWidth(styleColorColumnDef));
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

  // pre select SKU's in edit flow
  useEffect(() => {
    if (
      !isEmpty(props.preSelectedArticles) &&
      !isEmpty(agGridInstance.current)
    ) {
      agGridInstance.current?.api?.forEachNode((node) => {
        if (
          props.preSelectedArticles.includes(node.data[props.uniqueArticleKey])
        ) {
          node.setSelected(true);
        }
      });
      agGridInstance.current?.api?.refreshCells({
        force: true,
      });
    }
  }, [props.preSelectedArticles, agGridInstance.current]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api
      .getSelectedRows()
      .map((item) => item[props.uniqueArticleKey]);
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

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
    setRender(true);
  };

  const renderContributionPercentage = () => {
    return (
      <div className={classes.alignFormContainer}>
          <div className={classes.labelText}>
            <span>Sales Contribution %</span>
            <Tooltip 
              variant="tertiary"
              title="Filters for products that cumulatively contribute up to the entered percentage of total sales."
              orientation="top"
            >
              <span className={classes.infoIcon}>ⓘ</span>
            </Tooltip>
          </div>
        <div className={classes.formContainer}>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={1}
            handleChange={handleChangeContributionPercentage}
            fields={CONTRIBUTION_PERCENTAGE}
            updateDefaultValue={false}
            defaultValues={contributionPercentage}
            labelWidthSpan={2}
            fieldTypeWidthSpan={3}
          ></Form>
        </div>
        <div>
          <Button
            size="large"
            type="default"
            variant="primary"
            onClick={() => onApply()}
            disabled={!props.listOfProducts?.length}
            className="marginLeft"
          >
            Apply
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={selectedProductsTableRef}
      className={globalClasses.marginVertical1rem}
    >
      <AgGridComponent
        rowdata={selectProductTableData}
        columns={selectProductTableColumn}
        selectAllHeaderComponent={true}
        onSelectionChanged={onSelectionChanged}
        uniqueRowId={props.uniqueArticleKey}
        sizeColumnsToFitFlag
        onGridChanged
        rowSelection={"multiple"}
        paginationPageSize={props.pageSize}
        noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
        loadTableInstance={loadTableInstance}
        tableHeader="Select Product"
        topRightOptions={renderContributionPercentage()}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newProductProfileLoader:
      inventorysmartReducer.createProductProfileReducer.newProductProfileLoader,
    listOfProducts:
      inventorysmartReducer.createProductProfileReducer.listOfProducts,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SelectProductTableComponent);
