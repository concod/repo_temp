import React, { useContext } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import ProductKPISection from "./ProductKPISection";
import ProductDetailsTable from "./ProductDetailsTable";
import { finalizeAllocationContext } from "../../index";

const ProductView = function () {
  const classes = useStyles();
  const { selectedOption, sessionId } = useContext(finalizeAllocationContext);
  const isEditMode = selectedOption === "edit";

  return (
    <div className={classes.removeFrozenBorder}>
      <ProductKPISection />
      <div style={{ marginTop: "16px" }}>
        <ProductDetailsTable isEditMode={isEditMode} sessionId={sessionId} />
      </div>
    </div>
  );
};

export default ProductView;
