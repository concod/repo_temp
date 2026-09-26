import React, { useContext } from "react";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { useStoreViewStyles } from "./storeViewStyles";
import StoreKPISection from "./StoreKPISection";
import StoreDetailsTable from "./StoreDetailsTable";
import { finalizeAllocationContext } from "../../index";

const StoreView = function () {
  const sharedClasses = useStyles();
  const classes = useStoreViewStyles();
  const { selectedOption, sessionId } = useContext(finalizeAllocationContext);
  const isEditMode = selectedOption === "edit";

  return (
    <div className={`${sharedClasses.removeFrozenBorder} ${classes.page}`}>
      <StoreKPISection />
      <StoreDetailsTable isEditMode={isEditMode} sessionId={sessionId} />
    </div>
  );
};

export default StoreView;
