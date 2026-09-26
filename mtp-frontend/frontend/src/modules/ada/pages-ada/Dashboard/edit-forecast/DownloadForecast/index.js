import DownloadIcon from "@mui/icons-material/Download";
import { Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import {
  errorHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import classNames from "classnames";
import { Prompt } from "impact-ui";
import { downloadAdaForecastReport } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DailyForecastConfirmPopup from "./DailyForecastConfirmPopup";
import { cloneDeep } from "lodash";

const DownloadForecast = () => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [showPrompt, setShowPrompt] = useState(false);
  const [forecastLevel, setForecastLevel] = useState(false);
  const [showDailyForecastPrompt, setShowDailyForecastPrompt] = useState(false);

  const dispatch = useDispatch();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const downloadForecast = async () => {
    const payload = cloneDeep(chartDataPayload(adaReducer));
    delete payload.filters.graph;
    payload.filters.agg_level = "l0";
    payload.filters.agg_hierarchy = {};
    let productGroup = adaReducer?.productStoreGroup?.productGroup;
    if (productGroup?.length) {
      let formattedProductGroup = productGroup?.map((elem) => elem?.value);
      delete payload.filters.product_hierarchy.product_code;
      payload.filters.product_hierarchy.product_group = formattedProductGroup;
    }
    let storeGroup = adaReducer?.productStoreGroup?.storeGroup;
    if (storeGroup?.length) {
      let formattedStoreGroup = storeGroup?.map((elem) => elem?.value);

      delete payload.filters.store_hierarchy.store_code;
      payload.filters.store_hierarchy.store_group = formattedStoreGroup;
    }

    if (forecastLevel === "D") {
      payload.filters.aggregation_level = "D";
    }

    try {
      await downloadAdaForecastReport(payload);

      successHandler(
        dispatch,
        "Download Request is running in background. You will get a notification once it is ready to download"
      );
    } catch (err) {
      errorHandler(dispatch, "Error while downloading");
    }
  };

  return (
    <div
      className={classNames(
        globalClasses.flexRow,
        globalClasses.verticalAlignCenter
      )}
    >
      <Button
        className={classes.downloadForecast}
        variant="outlined"
        onClick={() => {
          let fiscalIds = adaReducer?.predictedFiscalWeeks || [];
          let showDayLevelPrompt =
            adaReducer?.clientConfig?.attribute_value?.show_features
              ?.show_day_level_prompt;
          let isWeekLevel = adaReducer?.switchTimeLine?.[0]?.value === "W";
          if (showDayLevelPrompt && isWeekLevel && fiscalIds.length < 12) {
            setShowDailyForecastPrompt(true);
          } else {
            setShowPrompt(true);
          }
        }}
        startIcon={<DownloadIcon />}
      >
        Download
      </Button>
      <DailyForecastConfirmPopup
        setShowPrompt={setShowPrompt}
        showDailyForecastPrompt={showDailyForecastPrompt}
        setShowDailyForecastPrompt={setShowDailyForecastPrompt}
        setForecastLevel={setForecastLevel}
      />
      <Prompt
        isOpen={showPrompt}
        title="Download Forecast"
        subHeading="Only saved forecast will be downloaded, please save all the forecast before downloading"
        infoList={[]}
        primaryButtonProps={{
          children: "Download Forecast",
          onClick: () => {
            downloadForecast();
            setShowPrompt(false);
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => setShowPrompt(false),
        }}
      />
    </div>
  );
};

export default DownloadForecast;

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiPaper-root": {
      padding: "0.5rem 4rem",
    },
  },
  title: {
    alignSelf: "center",
  },
  infoContainer: {
    background: theme.palette.background.warningInfo,
    padding: "0.6rem 0 1rem 1rem",
    marginTop: "1.5rem",
    border: `1px solid ${theme.palette.warning.main}`,
  },
  dialogContentText: {
    padding: "0 3rem",
  },
  downloadForecast: {
    marginTop: 10,
    marginRight: 10,
  },
}));
