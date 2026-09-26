import React, { useState, useEffect } from "react";
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
  onDialogClose,
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
    // Reset selection state in parent component
    if (onDialogClose) {
      onDialogClose();
    }
  };

  useEffect(() => {
    setLocalFilters(cloneDeep(deepDiveFiltersPayload || []));
    setSelectedDC("");
    setSelectedOptions([]);
  }, [deepDiveFiltersPayload]);

  const handleUniqueLocCodesReceived = (uniqueLocCodes) => {
    if (uniqueLocCodes && Array.isArray(uniqueLocCodes) && uniqueLocCodes.length > 0) {
      const columnName = "loc_code";
      const dropdownData = {
        [columnName]: uniqueLocCodes.map((value) => ({
          label: replaceSpecialCharacter(value),
          value: value,
        })),
      };
      setCurrentSelectOptions(dropdownData);
    }
  };

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

  const columnName = "loc_code";

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
        {currentSelectOptions[columnName]?.length > 0 && (
          <>
            <div className={classes.dcSelectContainer}>
              <Select
                label="DC Name"
                name="DC Name"
                selectAllLabel="DC Name"
                customPlaceholder="Select DC Name"
                id={columnName}
                labelOrientation="top"
                filter_keyword={columnName}
                data-testid={`select${columnName}`}
                is_multiple_selection={true}
                isClearable
                doNotUpdateDefaultValue
                initialData={currentSelectOptions[columnName] || []}
                selectedOptions={selectedOptions}
                updateDependency={(params, options) =>
                  handleFilterChange(columnName, options, params)
                }
                disabled={false}
                isDisabled={false}
                dropdownOpenCallback={(dispatch) => {
                  // Set the loaded options from table response
                  if (currentSelectOptions[columnName]?.length) {
                    dispatch({
                      type: "OPTION_SET",
                      payload: currentSelectOptions[columnName],
                    });
                  }
                }}
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
          onUniqueLocCodesReceived={handleUniqueLocCodesReceived}
        />
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {};
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleApprovalFlowDialog);
