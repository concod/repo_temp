import React, { useState, useMemo, useEffect } from "react";
import { connect } from "react-redux";
import { Panel } from "impact-ui-v3";
import { Divider, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import OffCycleApprovalFlowTable from "./OffCycleApprovalFlowTable";
import { Select } from "core/commonComponents/filters";
import { cloneDeep } from "lodash";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  panelContainer: {
    width: "1000px",
    "& .ia_modalBody": {
      paddingTop: "8px",
    },
  },
  dcSelectContainer: {
    marginBottom: "1.5rem",
  },
}));

const OffCycleApprovalFlowDialog = ({
  setShowApprovalModal,
  draftId,
  selectedArticles,
  deepDiveFilters,
  getCheckConfigurationForProductDetails,
  deepDiveFiltersPayload,
  ...props
}) => {
  const classes = useStyles();

  const [selectedDC, setSelectedDC] = useState("");
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [localFilters, setLocalFilters] = useState(() =>
    cloneDeep(deepDiveFiltersPayload || [])
  );

  const displaySnackMessages = (message, variance, autoHideDuration = 5000) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  const onCancel = () => {
    props.reloadComponent(false);
    setShowApprovalModal(false);
  };

  const locCodeFilter = useMemo(() => {
    if (!deepDiveFilters || !Array.isArray(deepDiveFilters)) {
      return null;
    }
    return deepDiveFilters.find(
      (filter) =>
        filter.filter_id === "loc_code" || filter.column_name === "loc_code"
    );
  }, [deepDiveFilters]);

  useEffect(() => {
    setLocalFilters(cloneDeep(deepDiveFiltersPayload || []));
    setSelectedDC("");
    setSelectedOptions([]);
  }, [deepDiveFiltersPayload]);

  useEffect(() => {
    if (props?.deepDiveFiltersData && locCodeFilter) {
      try {
        const data = cloneDeep(props.deepDiveFiltersData);
        const columnName = locCodeFilter.column_name || locCodeFilter.filter_id;

        if (data[columnName] && Array.isArray(data[columnName])) {
          const dropdownData = {
            [columnName]: data[columnName].map((value) => ({
              label: replaceSpecialCharacter(value),
              value: value,
            })),
          };
          setCurrentSelectOptions(dropdownData);
        }
      } catch (error) {
        console.log("Error in setFilterData", error);
      }
    }
  }, [props?.deepDiveFiltersData, locCodeFilter]);

  const handleFilterChange = (columnName, options, params) => {
    const optionsArray = Array.isArray(options) ? options : [];
    const selectedValues = optionsArray.map((option) => option.value).filter(Boolean); 
    setSelectedOptions(optionsArray);

    if (selectedValues.length > 0) {
      setSelectedDC(selectedValues[0]);
    } else {
      setSelectedDC("");
    }

    // Update only local filters state (not Redux)
    setLocalFilters((prevFilters) => {
      let payloadObjectFound = false;
      let appliedFilters = cloneDeep(prevFilters);  
      const filterAttributeName = params?.filter_id || columnName;


      appliedFilters.forEach((item) => {
        // Check both columnName and filterAttributeName to handle all cases
        if (
          item?.attribute_name === columnName ||
          item?.attribute_name === filterAttributeName
        ) {
          item.values = [...selectedValues];
          payloadObjectFound = true;
        }
      });

      if (!payloadObjectFound && selectedValues.length > 0) {
        appliedFilters.push({
          filter_type: params?.filter_type,
          attribute_name: filterAttributeName,
          operator: "in",
          dimension: params?.dimension,
          values: [...selectedValues],
        });
      } else if (payloadObjectFound && selectedValues.length === 0) {
        // Remove filter if no values selected
        appliedFilters = appliedFilters.filter(
          (item) =>
            item?.attribute_name !== columnName &&
            item?.attribute_name !== filterAttributeName
        );
      }

      return appliedFilters;
    });
  };

  const getApprovalTitle = () => {
    return (
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <Typography h6 style={{ fontWeight: 800, fontSize: "16px" }}>
          Approve Order
        </Typography>
      </div>
    );
  };

  const columnName =
    locCodeFilter?.column_name || locCodeFilter?.filter_id || "loc_code";

  return (
    <Panel
      title={getApprovalTitle()}
      size="large"
      anchor="right"
      className={classes.panelContainer}
      aria-labelledby="offcycle-approval-dialog-title"
      open={true}
      onClose={() => onCancel()}
    >
      <div>
        {locCodeFilter && currentSelectOptions[columnName] && (
          <>
            <div className={classes.dcSelectContainer}>
              <Select
                label={locCodeFilter.label || "DC Name"}
                name={locCodeFilter.label || "DC Name"}
                selectAllLabel={locCodeFilter.label || "DC Name"}
                customPlaceholder={`Select ${locCodeFilter.label || "DC Name"}`}
                id={columnName}
                labelOrientation="top"
                filter_keyword={columnName}
                data-testid={`select${columnName}`}
                is_multiple_selection={
                  locCodeFilter.is_multiple_selection !== false
                }
                isClearable
                doNotUpdateDefaultValue
                initialData={currentSelectOptions[columnName]}
                selectedOptions={selectedOptions}
                updateDependency={(params, options) =>
                  handleFilterChange(columnName, options, params)
                }
                disabled={false}
                isDisabled={false}
                {...locCodeFilter}
              />
            </div>
            <Divider sx={{ margin: "1.5rem -16px" }} />
          </>
        )}

        <OffCycleApprovalFlowTable
          draftId={draftId}
          selectedDC={selectedDC}
          selectedArticles={selectedArticles}
          deepDiveFilters={localFilters}
          getCheckConfigurationForProductDetails={
            getCheckConfigurationForProductDetails
          }
          displaySnackMessages={displaySnackMessages}
          onCancel={onCancel}
          weekRange={props.weekRange}
        />
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {
    deepDiveFiltersData:
      store.omsReducer.offCycleOrderService.offCycleOrderDeepDiveFiltersData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleApprovalFlowDialog);
