import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form"; //For SetAll Multi Row to add dates
import ConflictResolutionModal from "core/pages/storeStatus/components/conflict-resolution-modal";
import { forwardRef, useState, useRef, useEffect, useMemo } from "react";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { connect } from "react-redux";
import {
  API_META_BODY,
  END_DATE,
  SKU_STORE_STATUS_START_DATE,
} from "config/constants";
import { getSetAllFormFields } from "core/pages/product-mapping/components/common-functions";
import { getModifyTablePayloadMeta } from "./common-mapping-functions";
import {
  mapStoreToProduct,
  setAllStoreMappingAPI,
} from "../services/storeMappingService";
import {
  mapProductToStore,
  setAllProductMappingAPI,
} from "core/pages/product-mapping/services-product-mapping/productMappingService";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isNil } from "lodash";
import { dateValidation } from "core/pages/storeStatus/utils";
import moment from "moment";

const SetAllComponent = forwardRef((props, ref) => {
  const [resolutionType, setResolutionType] = useState("hard_reset");
  const [isMultiStatus, setIsMultiStatus] = useState(true);
  const hasValidDates = useRef();

  useEffect(() => {
    hasValidDates.current = { value: true };
  }, []);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const formatSetAllData = (input, fieldRowId) => {
    let setAllOutput = [];
    for (let i = 0; i <= fieldRowId; i++) {
      const unique_delimiter = "_" + i;
      const attributeValue =
        input[
          (props.screenName === "store_mapping" ? "storecode" : "productcode") +
            unique_delimiter
        ];

      if (
        !isNil(attributeValue) ||
        props.screenName === "product_mapping_store_group"
      ) {
        const row = {
          attribute_name:
            props.screenName === "store_mapping" ? "store" : "product",
          start_date: input["start_date" + unique_delimiter]
            ? input["start_date" + unique_delimiter]
            : SKU_STORE_STATUS_START_DATE,
          end_date: input["end_date" + unique_delimiter]
            ? input["end_date" + unique_delimiter]
            : END_DATE,
        };
        if (Array.isArray(attributeValue)) {
          attributeValue.map((attribute) => {
            let tempRow = cloneDeep(row);
            tempRow["attribute_value"] = attribute;
            if (!dateValidation(row.start_date, row.end_date)) {
              throw Error("Date is not correct");
            }
            setAllOutput.push(tempRow);
          });
        } else {
          let tempRow = cloneDeep(row);
          tempRow["attribute_value"] = attributeValue;
          if (!dateValidation(row.start_date, row.end_date)) {
            throw Error("Date is not correct");
          }
          setAllOutput.push(tempRow);
        }
      }
    }
    let setAllOutPutDictionary = {};
    setAllOutput.forEach((item) => {
      const dateObj = {
        start_time: item.start_date,
        end_time: item.end_date,
      };
      if (setAllOutPutDictionary[item.attribute_value]) {
        setAllOutPutDictionary[item.attribute_value].push(dateObj);
      } else {
        setAllOutPutDictionary[item.attribute_value] = [dateObj];
      }
    });
    for (const setAllStoreKey in setAllOutPutDictionary) {
      // checking if conflict exists in date ranges
      const hasConflict = isDateRangeConflict(
        setAllOutPutDictionary[setAllStoreKey],
        "YYYY-MM-DD",
        "[]"
      );
      if (hasConflict) {
        displaySnackMessages("Please resolve overlapping date ranges", "error");
        throw Error("Date is overlapping");
      }
    }

    return setAllOutput;
  };

  const getSelectedObjects = (screenName) => {
    if (screenName === "store_mapping") {
      return props.selectedProductObjects;
    }
    if (screenName === "product_mapping") {
      return props.selectedStoreObjects;
    }
    if (screenName === "product_mapping_store_group") {
      return props.selectedStoreGroupObjects;
    }
  };

  const getColKey = (screenName) => {
    if (screenName === "store_mapping") {
      return "product_code";
    }
    if (screenName === "product_mapping") {
      return "store_code";
    }
    if (screenName === "product_mapping_store_group") {
      return "sg_code";
    }
  };

  const storeOrProductSetAllApply = async (formattedAttributes) => {
    let allselectedRowsIDs = [];
    let selectedProdOrStoreObjects = getSelectedObjects(props.screenName);
    let colKey = getColKey(props.screenName);
    hasValidDates.current = { value: true };
    if (
      selectedProdOrStoreObjects &&
      !Array.isArray(selectedProdOrStoreObjects)
    ) {
      allselectedRowsIDs = [selectedProdOrStoreObjects].map(
        (storeOrProdObj) => storeOrProdObj[colKey]
      );
    }
    if (
      selectedProdOrStoreObjects &&
      Array.isArray(selectedProdOrStoreObjects)
    ) {
      allselectedRowsIDs = selectedProdOrStoreObjects.map(
        (storeOrProdObj) => storeOrProdObj[colKey]
      );
    }
    let newValues = [];
    const hasNoDifference = formattedAttributes.some((attribute) => {
      let body = {
        select: Array.isArray(attribute.attribute_value)
          ? attribute.attribute_value
          : [attribute.attribute_value],
        valid_from: !props?.isUnmapSetAll ? attribute.start_date : null,
        valid_to: !props?.isUnmapSetAll ? attribute.end_date : null,
      };
      newValues.push(body);
      return !moment(attribute.start_date).diff(
        moment(attribute.end_date),
        "days"
      );
    });

    if (hasNoDifference) {
      hasValidDates.current = { value: false };
      throw Error("Please select dates with atleast a day difference");
    }
    try {
      const queryParams = props.isAggregated ? "aggregation" : "product";
      if (props.screenName === "store_mapping") {
        let body = {
          products: getModifyTablePayloadMeta(
            props.filterDependency,
            "store",
            props.selectedProducts,
            ref.current,
            0,
            API_META_BODY,
            allselectedRowsIDs,
            props.isAggregated,
            props.isBulkEdit
          ),
          stores: newValues,
          action: resolutionType,
        };
        const response = await setAllStoreMappingAPI(body, queryParams)();
        displaySnackMessages(response.message, "success");
      } else {
        let body = {
          stores: getModifyTablePayloadMeta(
            props.filterDependency,
            "product",
            props.selectedProducts,
            ref.current,
            0,
            API_META_BODY,
            allselectedRowsIDs,
            props.isAggregated,
            props.isBulkEdit
          ),
          products: newValues,
          action: resolutionType,
        };
        const response = await setAllProductMappingAPI(body, queryParams)();
        displaySnackMessages(response.message, "success");
      }
      props.onClickFilter();
    } catch (error) {
      //Any error on set all api will be catched here
      displaySnackMessages(
        error?.response?.data?.message || "Something went wrong",
        "error"
      );
      throw "Update failed"; //throwing error to block success message on set all multirow component
    }
  };

  /**
   * SetAllChanges function is a callback to setallchanges dialog
   * @param {dates} formattedAttributes
   */
  const setAllChanges = async (formattedAttributes) => {
    try {
      if (
        props.screenName === "store_mapping" ||
        props.screenName === "product_mapping"
      ) {
        await storeOrProductSetAllApply(formattedAttributes);
      } else {
        props.storeGroupSetAllApply(formattedAttributes);
      }
    } catch (err) {
      throw Error(err.message || "Something went wrong", "error");
    }
  };

  const setAllFormFields = useMemo(() => {
    const data = getSetAllFormFields(
      props.setAllPopUpFields,
      props.selectedProducts,
      props.commonSetAllStores,
      props.screenName,
      props.referenceStore,
      props.isTimePeriodPresent
    );
    setIsMultiStatus(!data?.[0]?.hideRowLabel);
    return data;
  }, []);

  return (
    <>
      {props.showSetAllPopUp && (
        <SetAllMultiRow
          updateDefaultValue={false}
          setDefaultDateFieldValues={true}
          onApply={setAllChanges}
          fieldList={setAllFormFields}
          handleModalClose={() => {
            if (props?.isUnmapSetAll) {
              props.setIsUnmapClicked(false);
            }
            props.setshowSetAllPopUp(false);
          }}
          formatMultiRowData={formatSetAllData}
          additionalContainer={
            props.screenName !== "product_mapping_store_group" &&
            props.isTimePeriodPresent ? (
              <ConflictResolutionModal
                resolutionType={resolutionType}
                setResolutionType={setResolutionType}
              />
            ) : null
          }
          isMultipleStatus={isMultiStatus}
        />
      )}
    </>
  );
});
const mapActionsToProps = {
  mapStoreToProduct,
  mapProductToStore,
  addSnack,
};
export default connect(null, mapActionsToProps, null, { forwardRef: true })(
  SetAllComponent
);
