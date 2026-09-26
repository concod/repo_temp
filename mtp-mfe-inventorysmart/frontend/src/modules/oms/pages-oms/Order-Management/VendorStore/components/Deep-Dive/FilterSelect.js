import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import { setDeepDiveFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const FilterSelect = ({
  currentSelectOptions,
  setCurrentSelectOptions,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  const handleFilterChange = (columnName, options, params) => {
    if (props?.customFilterChangeFunc) {
      props?.customFilterChangeFunc(columnName, options, params);
      return;
    }
    let selectedOptions = options.map((option) => option.value);
    let payloadObjectFound = false;
    let appliedFilters = cloneDeep(
      props?.deepDiveFiltersPayload?.filters || []
    );
    appliedFilters.map((item) => {
      if (item?.attribute_name === columnName) {
        item.values = [...selectedOptions];
        payloadObjectFound = true;
      }
    });
    if (!payloadObjectFound) {
      appliedFilters.push({
        filter_type: params?.filter_type,
        attribute_name: params?.filter_id,
        operator: "in",
        dimension: params?.dimension,
        values: [...selectedOptions],
      });
    }
    props?.setDeepDiveFiltersPayload({
      filters: appliedFilters,
    });
  };

  useEffect(() => {
    if (props?.setResetFilters && props?.reset) {
      props?.setResetFilters(false);
    }
  }, [props?.reset]);

  return currentSelectOptions?.length === 0 ? null : (
    <div>
      <Select
        label={props?.label}
        name={props?.label}
        selectAllLabel={props?.label}
        customPlaceholder={`Select ${props?.label}`}
        id={props?.columnName}
        filter_keyword={props?.columnName}
        data-testid={`select${props?.columnName}`}
        is_multiple_selection
        isClearable
        doNotUpdateDefaultValue
        initialData={currentSelectOptions}
        selectedOptions={props?.isDefaultSelectionNeeded ? selectedOptions : []}
        updateDependency={(params, options) =>
          handleFilterChange(props?.columnName, options, params)
        }
        reset={props?.reset}
        {...props?.filterProps}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(FilterSelect);
