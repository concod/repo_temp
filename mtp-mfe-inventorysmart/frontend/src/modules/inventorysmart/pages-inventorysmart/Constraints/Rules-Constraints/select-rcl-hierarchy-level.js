import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { Typography, Box } from "@mui/material";
import { Chips, useTranslation } from "impact-ui-v3";
import {
  fetchSelectedRclHeirarchies,
  getRclHierarchy,
  isAllFiltersSelectedForRCLProduct,
  setHierarchyList,
  setRCLProductFilterCOnfig,
  setRclSelectedLevel,
  setRclSelectedProductLevel,
  setRulesTableLoader,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { cloneDeep, isEmpty } from "lodash";
import { handleErrorMessage } from "./add-rcl-component";
import { displaySnackMessages } from "../../inventorysmart-utility";
import globalStyles from "core/Styles/globalStyles";

const SelectRclLevel = (props) => {
  const { t } = useTranslation();
  const isConstraintsFlow =
    sessionStorage.getItem("isConstraintsFlow") === "true";
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const [hierarchyOptions, setHierarchyOptions] = useState([]);

  useEffect(() => {
    const fetchHeirarchy = async () => {
      try {
        props?.setRulesCreateLoader(true);
        let response;

        let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;
        const is_po_strategy_flow =
          JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;
        if (!isEmpty(props?.selectedRclForAddHierarchies)) {
          response = await fetchSelectedRclHeirarchies(
            props?.selectedRclForAddHierarchies?.rcl_code,
            isConstraintsFlow,
            isOMSConstraintsFlow,
            isDCNetworkFlow
          );
        } else {
          response = await getRclHierarchy(
            isConstraintsFlow,
            isOMSConstraintsFlow,
            isDCNetworkFlow,
            is_po_strategy_flow
          );
        }
        if (response?.data?.show_message) {
          displaySnackMessages(response?.data?.message, "success", props);
        }
        let tempAttributeData = cloneDeep(response?.data?.data);
        tempAttributeData = tempAttributeData.filter(
          (item) => item?.attribute_dimension !== "store"
        );
        if (isEmpty(props?.selectedRclLevel)) {
          const selectedOptions = tempAttributeData
            ?.filter((option) => option.is_mandatory)
            .map((option) => option.column_name);
          props.setRclSelectedLevel(selectedOptions);
        }

        const formattedOptions =
          tempAttributeData?.length > 0
            ? tempAttributeData.map((key) => {
                return {
                  ...key,
                  value: key?.column_name,
                  label: key?.label || key?.column_name,
                  isDisabled:
                    key?.is_mandatory ||
                    props?.selectedRclForAddHierarchies?.is_default,
                };
              })
            : [];

        setHierarchyOptions(formattedOptions);
        props?.setHierarchyList(formattedOptions);
        props?.setRulesCreateLoader(false);
      } catch (error) {
        props?.setRulesCreateLoader(false);
        handleErrorMessage(error, props);
      }
    };
    fetchHeirarchy();
  }, []);

  const handleChipClick = (option) => {
    if (option.isDisabled) {
      return;
    }

    const currentSelected = props?.selectedRclLevel || [];
    const isSelected = currentSelected.includes(option.column_name);

    let updatedSelection;
    if (isSelected) {
      updatedSelection = currentSelected.filter(
        (item) => item !== option.column_name
      );
    } else {
      updatedSelection = [...currentSelected, option.column_name];
    }

    props.setRclSelectedLevel(updatedSelection);
    props?.isAllFiltersSelectedForRCLProduct(false);
    props?.setRclSelectedProductLevel([]);
    props?.setRCLProductFilterCOnfig([]);
  };

  return (
    <Box>
      <Loader minHeight={100} loader={props.createRulesTableLoader}>
        <Box
          sx={{
            backgroundColor: "#ffffff",
            width: "100%",
            height: "auto",
            borderRadius: "8px",
            paddingTop: "12px",
            paddingBottom: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              margin: 0,
              paddingLeft: "16px",
              paddingRight: "16px",
              fontWeight: "bold",
            }}
          >
            {t("inventorysmart.rclSelectHierarchyLevel")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "center",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            {hierarchyOptions.map((option) => {
              const isSelected =
                props?.selectedRclLevel?.includes(option.column_name) || false;
              return (
                <Chips
                  key={option.column_name}
                  label={option.label || option.column_name}
                  isActive={isSelected}
                  onClick={() => handleChipClick(option)}
                  type="multi"
                  disabled={option.isDisabled}
                />
              );
            })}
          </Box>
        </Box>
      </Loader>
    </Box>
  );
};

SelectRclLevel.propTypes = {
  createRulesTableLoader: PropTypes.any,
  selectedRclLevel: PropTypes.any,
  setRclSelectedLevel: PropTypes.func,
  setRulesCreateLoader: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedRclLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclLevel,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    selectedRclForAddHierarchies:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.selectedRclForAddHierarchies,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setRulesCreateLoader: (payload) => dispatch(setRulesTableLoader(payload)),
    setRclSelectedLevel: (payload) => dispatch(setRclSelectedLevel(payload)),
    setRCLProductFilterCOnfig: (payload) =>
      dispatch(setRCLProductFilterCOnfig(payload)),
    setRclSelectedProductLevel: (payload) =>
      dispatch(setRclSelectedProductLevel(payload)),
    isAllFiltersSelectedForRCLProduct: (payload) =>
      dispatch(isAllFiltersSelectedForRCLProduct(payload)),
    setHierarchyList: (payload) => dispatch(setHierarchyList(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SelectRclLevel);
