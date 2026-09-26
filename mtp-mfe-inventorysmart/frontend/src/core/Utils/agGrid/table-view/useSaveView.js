import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import { getEnableMultiTableViewsConfig } from "core/actions/tenantConfigActions";
import { SET_MULTI_TABLE_VIEW_ENABLED_APPS } from "core/actions/types";
import { displaySnackMessages } from "core/Utils/utils";
import {
  getTableViewConfigData,
  saveTableView,
  deleteTableView,
  setDefaultTableView,
} from "./table-view-panel-service";
import {
  mapApiViewsToSavedViewOptions,
  mapSaveViewToApiPayload,
  mapSetDefaultViewPayload,
  findViewInOptions,
} from "./save-view-mapper";
import { isUndefined } from "lodash";

/**
 * Custom hook to manage Save View functionality for OldTable (impact-ui-v3).
 */
const useSaveView = ({
  disableSaveView,
  tableName,
  agGrid,
  gridColumns,
  onApplyTableView,
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const applicationCode = useSelector(
    (state) => state?.commonChatReducer?.appDetails?.applicationCode
  );
  const multiTableViewEnabledApps = useSelector(
    (state) => state?.tableReducer?.multiTableViewEnabledApps
  );

  const effectiveSaveViewEnabled = !disableSaveView && (multiTableViewEnabledApps?.[applicationCode] ?? false);

  const [savedViewOptions, setSavedViewOptions] = useState([]);
  const [isSaveViewLoading, setIsSaveViewLoading] = useState(false);
  const [isDeleteViewLoading, setIsDeleteViewLoading] = useState(false);

  const fetchSavedViews = useCallback(
    async (activeViewName) => {
      try {
        const viewData = await getTableViewConfigData(tableName);
        const formattedViews = mapApiViewsToSavedViewOptions(viewData).map(
          (v) => ({
            ...v,
            isActive: activeViewName
              ? v.viewName === activeViewName
              : v.isActive,
          })
        );
        setSavedViewOptions(formattedViews);
      } catch (error) {
        console.error("Error fetching saved views", error);
      }
    },
    [tableName]
  );


  useEffect(() => {
    if (applicationCode &&  isUndefined(multiTableViewEnabledApps?.[applicationCode])) {
      (async () =>{
        try {
          const enabled = await getEnableMultiTableViewsConfig(applicationCode);
          dispatch({
            type: SET_MULTI_TABLE_VIEW_ENABLED_APPS,
            payload: { [applicationCode]: enabled },
          });
        } catch (error) {
          console.error("fetchMultiTableViewConfig error", error);
        }
      })()
    }
  }, [applicationCode]);

  useEffect(() => {
    if (effectiveSaveViewEnabled && tableName) {
      fetchSavedViews();
    }
  }, [effectiveSaveViewEnabled, tableName, fetchSavedViews]);

  const getCurrentGridPreference = useCallback(() => {
    const columnState = agGrid?.columnApi?.getColumnState() || [];

    const stateMap = {};
    columnState.forEach((state, index) => {
      stateMap[state.colId] = {
        ...state,
        order_of_display: index,
      };
    });

    const preference = {};

    gridColumns?.forEach((column) => {
      if (column.column_name && column.column_name !== "Selection") {
        const state = stateMap[column.column_name] || {};

        preference[column.column_name] = {
          ...column,
          order_of_display: state.order_of_display ?? column.order_of_display,
          width: state.width ?? column.width,
          is_hidden: !!state.hide,
          is_frozen: !!state.pinned,
          pinned: state.pinned,
        };
      }
    });
    return preference;
  }, [agGrid, gridColumns]);

  const handleSaveAndApply = useCallback(
    async (newView, replaceWith) => {
      setIsSaveViewLoading(true);
      try {
        const preference = getCurrentGridPreference();
        const existingView = replaceWith
          ? findViewInOptions(savedViewOptions, replaceWith)
          : null;

        const payload = mapSaveViewToApiPayload(
          newView,
          tableName,
          preference,
          existingView
        );

        await saveTableView(payload)();
        await fetchSavedViews(newView.viewName);

        displaySnackMessages(
          existingView
            ? t("snackbarMessages.tableViewUpdatedSuccess")
            : t("snackbarMessages.tableViewSavedSuccess"),
          "success",
          dispatch
        );
      } catch (err) {
        displaySnackMessages(
          err?.response?.data?.message ||
            t("snackbarMessages.somethingWentWrongSavingView"),
          "error",
          dispatch
        );
      } finally {
        setIsSaveViewLoading(false);
      }
    },
    [
      savedViewOptions,
      tableName,
      getCurrentGridPreference,
      dispatch,
    ]
  );

  const handleSavedViewClick = useCallback(
    (view) => {
      if (view?.preference) {
        onApplyTableView(view.viewName, view.preference);
      }
      setSavedViewOptions((prev) =>
        prev.map((v) => ({
          ...v,
          isActive:
            v.viewName === view.viewName && v.viewType === view.viewType,
        }))
      );
    },
    [onApplyTableView]
  );

  const handleEditSaveView = useCallback(
    async (newView, prevView) => {
      setIsSaveViewLoading(true);

      try {
        const existingView = findViewInOptions(savedViewOptions, prevView);
        const preference =
          existingView?.preference || getCurrentGridPreference();

        const payload = mapSaveViewToApiPayload(
          newView,
          tableName,
          preference,
          existingView
        );

        await saveTableView(payload)();
        await fetchSavedViews(newView.viewName)
     
        displaySnackMessages(
          t("snackbarMessages.tableViewUpdatedSuccess"),
          "success",
          dispatch
        );
      } catch (err) {
        displaySnackMessages(
          err?.response?.data?.message ||
            t("snackbarMessages.somethingWentWrongUpdatingView"),
          "error",
          dispatch
        );
      } finally {
        setIsSaveViewLoading(false);
      }
    },
    [
      savedViewOptions,
      tableName,
      getCurrentGridPreference,
      dispatch,
    ]
  );

  const handleDeleteViewClick = useCallback(
    async (view) => {
      if (!view) return;

      setIsDeleteViewLoading(true);
      try {
        const existingView = findViewInOptions(savedViewOptions, view);

        if (existingView?.id) {
          await deleteTableView(existingView.id);
        }

        await fetchSavedViews();
        displaySnackMessages(
          t("snackbarMessages.tableViewDeletedSuccess"),
          "success",
          dispatch
        );
      } catch (error) {
        displaySnackMessages(
          error?.response?.data?.message ||
            t("snackbarMessages.somethingWentWrongDeletingView"),
          "error",
          dispatch
        );
      } finally {
        setIsDeleteViewLoading(false);
      }
    },
    [savedViewOptions]
  );

  const handleSetDefaultView = useCallback(
    async (view) => {
      setIsSaveViewLoading(true);

      try {
        const existingView = findViewInOptions(savedViewOptions, view);

        if (!existingView?.id) {
          displaySnackMessages(t("snackbarMessages.viewNotFound"), "error", dispatch);
          return;
        }

        const newDefaultState = !existingView.isDefaultView;

        const payload = mapSetDefaultViewPayload(
          existingView.id,
          tableName,
          newDefaultState
        );

        await setDefaultTableView(payload);
        await fetchSavedViews(view.viewName)

        displaySnackMessages(
          newDefaultState
            ? t("snackbarMessages.viewSetAsDefaultSuccess")
            : t("snackbarMessages.defaultViewRemovedSuccess"),
          "success",
          dispatch
        );
      } catch (err) {
        displaySnackMessages(
          err?.response?.data?.message || t("snackbarMessages.somethingWentWrong"),
          "error",
          dispatch
        );
      } finally {
        setIsSaveViewLoading(false);
      }
    },
    [savedViewOptions, tableName, dispatch]
  );

  return {
    savedViewOptions,
    isSaveViewLoading,
    isDeleteViewLoading,
    handleSaveAndApply,
    handleSavedViewClick,
    handleEditSaveView,
    handleDeleteViewClick,
    handleSetDefaultView,
    effectiveSaveViewEnabled,
  };
};

export default useSaveView;
