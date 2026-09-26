import {
  errorHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import { orderBy } from "lodash";
import { useLoading } from "../../LoaderWrapper";
import {
  setApiTriggerAfterSave,
  setOnCompareSave,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { setSaveOperationPerformedCounter } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-multiplier-services";
import moment from "moment";
import { useRef } from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

export const useSaveForecastStatus = (
  saveApiCountRef,
  isSaveInProgressRef,
  showScenario,
  showScenario2, // handle scenario 2 for getting user save status with websocket (TBD)
  savePerformedTab,
  deepDiveTabChanged,
  setDeepDiveTabChanged,
  setDisableAllowEditOnSave,
  disableAllowEditOnSaveRef,
  comparisonSaveRow,
  setComparisonSaveRow,
  setResetDriversCounter
) => {
  const allNotificationData = useSelector(
    (store) => store?.notificationReducer?.allNotificationData
  );
  const dispatch = useDispatch();
  const { setLoading } = useLoading();

  let activeUpdateTransactionId = useRef(0);
  useEffect(() => {
    if (!allNotificationData?.length) return;

    let now = moment(new Date()); //todays date

    let statusUpdatesNotifications = allNotificationData?.filter((elem) => {
      let end = moment(elem?.updated_at);
      let duration = moment.duration(now.diff(end));
      let minutes = duration.minutes();

      return elem?.subject === "Ada Visual Update Status" && +minutes <= 20;
    });

    let inProgressSaveUpdates = false;

    const sortedStatusUpdatesNotifications = orderBy(
      statusUpdatesNotifications,
      ["updated_at"],
      ["desc"]
    );

    let currentnotification = sortedStatusUpdatesNotifications?.[0];
    if (currentnotification?.extra_attributes?.status === "PENDING") {
      inProgressSaveUpdates = true;
      setDisableAllowEditOnSave(true);
      disableAllowEditOnSaveRef.current = true;
      activeUpdateTransactionId.current =
        currentnotification?.extra_attributes?.transaction_id;
    }

    if (
      activeUpdateTransactionId &&
      currentnotification?.extra_attributes?.status === "FAILED"
    ) {
      errorHandler(dispatch, "Forecast update failed. Please try again");

      if (saveApiCountRef.current) {
        saveApiCountRef.current -= 1;
        isSaveInProgressRef.current -= 1;
      }
      activeUpdateTransactionId.current = 0;
      return;
    }

    if (!inProgressSaveUpdates) {
      if (saveApiCountRef.current) {
        saveApiCountRef.current -= 1;
        isSaveInProgressRef.current -= 1;
        if (!isSaveInProgressRef.current) {
          let message = "Forecast Saved successfully. ";
          if (deepDiveTabChanged) {
            message += "Please reload to view the latest data";
          }
          setDeepDiveTabChanged(false);
          setDisableAllowEditOnSave(false);
          disableAllowEditOnSaveRef.current = false;

          successHandler(dispatch, message);
          if (savePerformedTab === 3) {
            if (comparisonSaveRow === "Original IA Forecast") {
              dispatch(setOnCompareSave(true));
              setComparisonSaveRow("");
              setResetDriversCounter((prev) => prev + 1);
            } else {
              dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
              dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            }
          }
          if (showScenario) {
            if (savePerformedTab === 1) {
              dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
            }
            if (savePerformedTab === 2) {
              dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
            }
          }

          //   if (id === "scenario1" || id?.current === 'Scenario 1 IA Forecast"') {
          //     dispatch(setApiTriggerAfterSave({ key: "adjusted", value: 1 }));
          //   }
          //   if (id === "adjusted" || id?.current === 'Adjusted IA Forecast"') {
          //     dispatch(setApiTriggerAfterSave({ key: "scenario1", value: 1 }));
          //   }

          dispatch(setSaveOperationPerformedCounter());
          //   callBack();
        }
      }
    }
    setLoading(inProgressSaveUpdates);
  }, [allNotificationData]);
};
