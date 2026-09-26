import React from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { withRouter } from "react-router-dom";
import ProductRuleTable from "./ProductRuleTable";

const ProductRuleTableWrapper = function (props) {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <div>
        <div className={classes.autoOverflowWrapper}>
          <ProductRuleTable
            isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
            module={props.module}
            handleErrorMessage={props.handleErrorMessage}
          />
        </div>
    </div>
  );
};

export default withRouter(ProductRuleTableWrapper);
