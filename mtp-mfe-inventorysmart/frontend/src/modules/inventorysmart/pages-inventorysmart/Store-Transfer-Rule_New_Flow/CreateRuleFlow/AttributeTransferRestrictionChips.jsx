import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Chips, Loader as ImpactLoader } from "impact-ui-v3";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  buildAttributeFilterCrossFilterPayload,
  getAttributeFilterOptionsFromResponse,
} from "./storeSelectionUtils";
import FieldLabel from "./FieldLabel";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const AttributeTransferRestrictionChips = ({
  attributeFilters = [],
  selectedValues = [],
  onSelectedValuesChange,
  isDisabled = false,
}) => {
  const dispatch = useDispatch();
  const classes = useCreateRuleFlowStyles();
  const [chipOptions, setChipOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const fetchInFlightRef = useRef(false);
  const optionsLoadedRef = useRef(false);

  const attributeFilter = attributeFilters[0];
  const attributeColumn = attributeFilter?.column;

  const fetchAttributeOptions = useCallback(async () => {
    if (!attributeColumn || fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    setIsLoading(true);

    try {
      const payload = buildAttributeFilterCrossFilterPayload(attributeColumn);
      const response = await getCombinedCrossDimensionFiltersData(payload)();
      const values = response?.data?.data?.[attributeColumn] || [];
      const options = getAttributeFilterOptionsFromResponse(values);

      setChipOptions(options);
      optionsLoadedRef.current = true;
    } catch (error) {
      const errObj = error?.response?.data;
      dispatch(
        addSnack({
          message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          options: { variant: "error" },
        })
      );
      setChipOptions([]);
    } finally {
      fetchInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [attributeColumn, dispatch]);

  useEffect(() => {
    optionsLoadedRef.current = false;
    setChipOptions([]);
  }, [attributeColumn]);

  useEffect(() => {
    if (attributeColumn && !optionsLoadedRef.current) {
      fetchAttributeOptions();
    }
  }, [attributeColumn, fetchAttributeOptions]);

  const handleChipClick = (value) => {
    if (isDisabled) {
      return;
    }
    const nextValues = selectedValues.includes(value)
      ? selectedValues.filter((item) => item !== value)
      : [...selectedValues, value];
    onSelectedValuesChange?.(nextValues);
  };

  if (!attributeFilter) {
    return null;
  }

  return (
    <div className={classes.transferRestrictionField}>
      <FieldLabel isRequired>Restricts transfers within the selection</FieldLabel>
      {isLoading ? (
        <div className={classes.chipsLoader}>
          <ImpactLoader size="small" />
        </div>
      ) : (
        <div
          className={`${classes.geoRestrictionChips} ${
            isDisabled ? classes.chipsDisabled : ""
          }`}
        >
          {chipOptions.map((option) => (
            <Chips
              key={option.value}
              label={option.label}
              type="multi"
              isActive={selectedValues.includes(option.value)}
              onClick={() => handleChipClick(option.value)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AttributeTransferRestrictionChips;
