import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Select } from "impact-ui-v3";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { fetchStoreTransferFilterValues } from "modules/inventorysmart/services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import { STORE_TRANSFER_STORE_GROUP_FILTER_PAYLOAD } from "../constants";
import {
  extractStoreTransferFilterValues,
  mapStoreTransferFilterOptions,
} from "./storeSelectionUtils";
import FieldLabel from "./FieldLabel";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const StoreGroupSelectField = ({
  selectedStoreGroup = [],
  onStoreGroupChange,
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const classes = useCreateRuleFlowStyles();
  const [storeGroupOptions, setStoreGroupOptions] = useState([]);
  const [originalStoreGroupOptions, setOriginalStoreGroupOptions] = useState(
    []
  );
  const [isStoreGroupOpen, setIsStoreGroupOpen] = useState(false);
  const [isStoreGroupLoading, setIsStoreGroupLoading] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const fetchInFlightRef = useRef(false);

  const fetchStoreGroupOptions = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setIsStoreGroupLoading(true);

    try {
      const response = await dispatch(
        fetchStoreTransferFilterValues(STORE_TRANSFER_STORE_GROUP_FILTER_PAYLOAD)
      );

      if (response?.data?.status) {
        const options = mapStoreTransferFilterOptions(
          extractStoreTransferFilterValues(response?.data)
        );
        setStoreGroupOptions(options);
        setOriginalStoreGroupOptions(options);
        return;
      }

      dispatch(
        addSnack({
          message: response?.data?.message || ERROR_MESSAGE,
          options: { variant: "error" },
        })
      );
    } catch (error) {
      const errObj = error?.response?.data;
      dispatch(
        addSnack({
          message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          options: { variant: "error" },
        })
      );
    } finally {
      fetchInFlightRef.current = false;
      setIsStoreGroupLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!selectedStoreGroup.length || !storeGroupOptions.length) {
      setIsSelectAll(false);
      return;
    }

    setIsSelectAll(selectedStoreGroup.length === storeGroupOptions.length);
  }, [selectedStoreGroup, storeGroupOptions]);

  const handleDropdownOpen = () => {
    if (originalStoreGroupOptions.length === 0 && !isStoreGroupLoading) {
      fetchStoreGroupOptions();
    }
  };

  const handleChange = (options) => {
    onStoreGroupChange(options || []);
  };

  return (
    <div className={classes.storeGroupField}>
      <FieldLabel isRequired>Store group</FieldLabel>
      <Select
        placeholder="Select"
        isMulti
        isClearable
        isWithSearch
        withPortal
        toggleSelectAll
        isDisabled={isDisabled}
        isOpen={isDisabled ? false : isStoreGroupOpen}
        setIsOpen={setIsStoreGroupOpen}
        onDropdownOpen={handleDropdownOpen}
        isLoading={isStoreGroupLoading}
        currentOptions={storeGroupOptions}
        initialOptions={originalStoreGroupOptions}
        selectedOptions={selectedStoreGroup}
        setSelectedOptions={handleChange}
        handleChange={handleChange}
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        minWidth="289px"
        width="289px"
      />
    </div>
  );
};

export default StoreGroupSelectField;
