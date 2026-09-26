import React, { useEffect } from "react";
import { connect } from "react-redux";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import { setOrderDetailsFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const OrderDetailsFilters = ({
  currentSelectOptions,
  setCurrentSelectOptions,
  selectedOptions,
  setSelectedOptions,
  ...props
}) => {
  const handleFilterChange = (columnName, options, params) => {
    let selectedOptions = options.map((option) => option.value);
    let payloadObjectFound = false;
    let appliedFilters = cloneDeep(
      props?.orderDetailsFiltersPayload?.filters || []
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
    props?.setOrderDetailsFiltersPayload({
      filters: appliedFilters,
    });
  };

  useEffect(() => {
    if (props?.setResetFilters && props?.resetFilters) {
      props?.setResetFilters(false);
    }
  }, [props?.resetFilters]);

  return (
    <div>
      <Select
        label={props?.label}
        name={props?.label}
        selectAllLabel={props?.label}
        customPlaceholder={`Select ${props?.label}`}
        id={props?.columnName}
        labelOrientation="left"
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
        disabled={props?.isFiltersLoading}
        isDisabled={props?.isFiltersLoading}
        reset={props?.resetFilters}
        {...props?.filterProps}
      />
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderDetailsFiltersPayload:
      store.omsReducer.orderManagementVendorToStoreService
        .orderDetailsFiltersPayload,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderDetailsFiltersPayload: (payload) =>
    dispatch(setOrderDetailsFiltersPayload(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderDetailsFilters);
