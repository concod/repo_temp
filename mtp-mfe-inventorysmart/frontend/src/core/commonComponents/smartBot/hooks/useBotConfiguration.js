import { useCallback } from "react";
import { refreshAndUpdateUserManualApi } from "../services/chatbot-services";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { addSnack } from "core/actions/snackbarActions";

export const useBotConfiguration = (
  setRefreshLoader,
  setEnableRefreshAction,
  dispatch
) => {
  const displaySnackMessages = useCallback(
    (message, variant) => {
      try {
        dispatch(
          addSnack({
            message: message,
            options: {
              variant: variant,
            },
          })
        );
      } catch (error) {
        console.error("displaySnackMessages error", error);
      }
    },
    [dispatch]
  );

  const refreshAndUpdateUserManual = useCallback(async () => {
    try {
      setRefreshLoader(true);
      let body = {
        document_id: "1n6Sh07Tqhq5R8OI5Smm3KDHka21-VwMxtD0DBT7GB1o",
      };
      let response = await refreshAndUpdateUserManualApi(body);
      if (response?.data?.data?.status) {
        displaySnackMessages("Refresh Successful", "success");
      } else {
        displaySnackMessages("Refresh Failed", "error");
      }
    } catch (error) {
      displaySnackMessages("Refresh Failed", "error");
      console.error("refreshAndUpdateUserManual error", error);
    } finally {
      setRefreshLoader(false);
    }
  }, []);

  const configureBotActions = useCallback(async () => {
    try {
      const APP = "Workflow Input Center",
        MODULE = "Chatbot Module";

      let accessDataResponse = await getModuleLevelAccessUtility({
        app: APP,
        module: [MODULE],
        skipHierarchyCall: true,
      })();

      let rolesBasedModulesPermission = Object.fromEntries(
        Object.entries(accessDataResponse).map(([module, actions]) => [
          module,
          Object.keys(actions),
        ])
      );

      const actionEnabled = rolesBasedModulesPermission[
        "chatbot module"
      ]?.includes("edit");

      setEnableRefreshAction(actionEnabled);
    } catch (error) {
      console.error("configureBotActions error", error);
    }
  }, []);

  return {
    refreshAndUpdateUserManual,
    configureBotActions,
    displaySnackMessages,
  };
};
