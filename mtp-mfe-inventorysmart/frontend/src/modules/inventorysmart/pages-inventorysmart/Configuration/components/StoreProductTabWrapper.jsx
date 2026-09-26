import React, { useState, useRef } from "react";
import StoreProductBand from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/store-product-band";
import ModifyMapping from "modules/inventorysmart/pages-inventorysmart/Store-Mapping/components/modify-mapping";

/**
 * Wrapper component for Store-Product tab (moved from level 3 to level 2)
 * This component handles filters, modify mapping, and all necessary state management
 * for the StoreProductBand component
 */
const StoreProductTabWrapper = (props) => {
  const [modifyMapping, setModifyMapping] = useState(false);
  const [selectedStores, setSelectedStores] = useState([]);
  const [selectAllDependency, setSelectAllDependency] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  const [flagEdit, setFlagEdit] = useState(false);
  const isRedirectedFromMappedDialog = useRef(false);

  /**
   * Update flag edit state (used for unsaved changes prompt)
   */
  const updateFlagEdit = (flag) => {
    setFlagEdit(flag);
  };

  /**
   * Toggle modify mapping modal for selected stores
   */
  const toggleModifyMapping = (data, payload, isRedirected = false) => {
    if (isRedirected) {
      isRedirectedFromMappedDialog.current = true;
    }
    setSelectAllDependency(payload);
    setSelectAll(false);
    setSelectedStores(data.selectedStores);
    setModifyMapping(true);
  };

  /**
   * Toggle modify mapping modal for select all
   */
  const toggleSelectAllModify = async (payload, isRedirected = false) => {
    if (isRedirected) {
      isRedirectedFromMappedDialog.current = true;
    }
    setSelectAllDependency(payload);
    setSelectAll(true);
    setModifyMapping(true);
  };

  return (
    <>
      {modifyMapping && (
        <ModifyMapping
          ref={isRedirectedFromMappedDialog}
          selectedDimension={"store"}
          selectedProducts={selectedStores}
          dependency={selectAllDependency}
          isSelectAll={selectAll}
          updateFlagEdit={updateFlagEdit}
          closeModify={() => {
            setModifyMapping(false);
            setSelectedStores([]);
          }}
          screenName={props.screenName}
          handleErrorMessage={props.handleErrorMessage}
        />
      )}
      {!modifyMapping && (
        <StoreProductBand
          updateFlagEdit={updateFlagEdit}
          toggleModifyMapping={toggleModifyMapping}
          toggleSelectAllModify={toggleSelectAllModify}
          module={props.module}
          roleBasedAccess={props.roleBasedAccess}
          screenName={props.screenName}
          handleErrorMessage={props.handleErrorMessage}
        />
      )}
    </>
  );
};

export default StoreProductTabWrapper;
