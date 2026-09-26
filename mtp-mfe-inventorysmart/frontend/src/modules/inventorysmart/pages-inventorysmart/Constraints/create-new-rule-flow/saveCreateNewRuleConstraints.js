import { cloneDeep } from "lodash";
import { CONSTRAINTS } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  saveCreateNewRuleRcl,
  saveCreateNewRuleSetAllDataForRCL,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { validateConstraintFields } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import { getCreateNewRuleTableName } from "./createNewRuleFlowSession";
import { LANDING_SCREEN_TAB } from "../landing-screen/landingScreenConstants";
/**
 * Persists constraint edits and finalizes the RCL — same sequence as Add RCL
 * (set-all per edited row, then save).
 */
export async function saveCreateNewRuleConstraints({
  savedEditedRcls,
  selectedRclProductLevel,
  tableName: tableNameProp,
  setRulesCreateLoader,
  saveEditedRCL,
  snackProps,
  history,
  location,
  redirectTo,
  resetFlowState,
  setInvalidKeys,
  enable_validation_on_save
}) {
  const tableName = tableNameProp ?? getCreateNewRuleTableName();
  if (!tableName) {
    displaySnackMessages(
      "Constraints table is not ready. Please wait for the grid to load.",
      "error",
      snackProps
    );
    return;
  }

  const finalizeSave = async () => {
    let payload = {
      table_name: tableName,
      filters: [...(selectedRclProductLevel || [])],
    };
    if(enable_validation_on_save){
      payload = {
        ...payload,
        validation_enabled: true
      }
    }
    try{
    const savedResponse = await saveCreateNewRuleRcl(payload);
    if (savedResponse?.data?.message) {
      displaySnackMessages(savedResponse?.data?.message, "success", snackProps);
    }
    
    // Clear invalidKeys on successful save
    if (setInvalidKeys) {
      setInvalidKeys([]);
    }
    if (!redirectTo) {
      resetFlowState?.();
    } else {
      saveEditedRCL([]);
    }
    setTimeout(() => {
      const returnPath = redirectTo || CONSTRAINTS;
      history?.push({
        pathname: returnPath,
        state: {
          redirectedFromNetworkTab:
            location?.state?.redirectedFromNetworkTab || false,
          ...(returnPath === CONSTRAINTS
            ? {
                preselectedTab:
                  location?.state?.preselectedTab ||
                  LANDING_SCREEN_TAB.ALL_RULES,
              }
            : {}),
        },
      });
    }, 1000);
  }catch(error) {
    const invalid_keys = error?.response?.data?.data?.invalid_keys;
    const errorMessage = error?.response?.data?.message
    // Display snack message for invalid keys
    if (invalid_keys && invalid_keys.length > 0 && snackProps) {
      displaySnackMessages(
        errorMessage || "Failed to save rules",
        "error",
        snackProps
      );
      
      // Set invalidKeys in Redux state to trigger status icon updates
      if (setInvalidKeys) {
        setInvalidKeys(invalid_keys);
      }
    }
  }

}

  setRulesCreateLoader(true);

  try {
    if (savedEditedRcls?.length > 0) {
      const constraintValidationChecks = validateConstraintFields(
        cloneDeep(savedEditedRcls)
      );
      if (constraintValidationChecks?.inValidDate?.length > 0) {
        displaySnackMessages(
          `Invalid Date found in ${constraintValidationChecks.inValidDate} in one or more rules`,
          "error",
          snackProps
        );
        return;
      }
      if (constraintValidationChecks?.nullValues?.length > 0) {
        displaySnackMessages(
          `Null values found in ${constraintValidationChecks.nullValues}`,
          "error",
          snackProps
        );
        return;
      }

      const constraintsToSave = [...savedEditedRcls];
      const saveCalls = constraintsToSave.map(async (editedRow) => {
        try {
          const response = await saveCreateNewRuleSetAllDataForRCL(
            editedRow,
            false
          );
          if (response?.data?.show_message) {
            displaySnackMessages(
              response?.data?.message,
              "success",
              snackProps
            );
          }
        } catch (error) {
          handleErrorMessage(error, snackProps);
          throw error;
        }
      });

      await Promise.all(saveCalls);
    }

    await finalizeSave();
  } catch (error) {
    handleErrorMessage(error, snackProps);
  } finally {
    setRulesCreateLoader(false);
  }
}
