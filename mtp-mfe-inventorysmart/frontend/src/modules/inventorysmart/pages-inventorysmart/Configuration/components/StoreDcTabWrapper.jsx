import React, { useState } from "react";
import { useLocation } from "react-router-dom-v5-compat";
import ProductToDCFC from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/store-To-dcfc";
import SetAllPanelForm from "modules/inventorysmart/pages-inventorysmart/Common/components/SetAllPanelForm";
import { alignStoreCodeColumnsRight } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import "../../Common/styles/storeCodeColumn.scss";

/**
 * Wrapper component for Store-DC tab (moved from level 3 to level 2)
 * This component handles the Store-DC mapping functionality
 */
const StoreDcTabWrapper = (props) => {
  const location = useLocation();
  const [flagEdit, setFlagEdit] = useState(false);

  /**
   * Update flag edit state (used for tracking unsaved changes)
   */
  const updateFlagEdit = (flag) => {
    setFlagEdit(flag);
  };

  return (
    <ProductToDCFC
      isredirect={
        location?.state && location?.state?.isRedirect
          ? location.state.isRedirect
          : null
      }
      updateFlagEdit={updateFlagEdit}
      module={props.module}
      roleBasedAccess={props.roleBasedAccess}
      screenName={props.screenName}
      handleErrorMessage={props.handleErrorMessage}
      transformColumns={alignStoreCodeColumnsRight}
      customSetAllComponent={SetAllPanelForm}
      setAllPanelWidth={600}
    />
  );
};

export default StoreDcTabWrapper;
