import IA_DOWNLOAD from "assets/IA_DOWNLOAD.svg";
import { Button, useTranslation } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import {
  errorHandler,
  successHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import classNames from "classnames";
import { Prompt } from "impact-ui-v3";
import {
  checkLengthDownloadAdaVisualTable,
  downloadAdaForecastReport,
  setFilterFullScreenLoaderCount,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import { chartDataPayload } from "modules/ada/utils-ada/utilityFunctions";
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import DailyForecastConfirmPopup from "./DailyForecastConfirmPopup";
import { cloneDeep, isEmpty } from "lodash";
import { Tooltip } from "impact-ui-v3";
import DownloadRowLimitPrompt from "modules/ada/utils-ada/DownloadRowLimitPrompt";

const DownloadForecast = ({ disabled }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const { t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [forecastLevel, setForecastLevel] = useState(false);
  const [showDailyForecastPrompt, setShowDailyForecastPrompt] = useState(false);
  const [downloadFileRows, setDownloadFileRows] = useState("-");
  const [showLengthFileExceedPrompt, setShowLengthFileExceedPrompt] = useState(
    false
  );

  const dispatch = useDispatch();
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const downloadForecast = async () => {
    const payload = cloneDeep(chartDataPayload(adaReducer));
    const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;
    delete payload.filters.graph;
    payload.filters.agg_level = "l0";
    payload.filters.agg_hierarchy = {};

    // Only in demand selction table download the mfp key will go as true
    payload.filters.mfp && (payload.filters.mfp = false);

    if (!isEmpty(historicalDataFiscalWeek)) {
      payload.filters.snapshot = historicalDataFiscalWeek.start_fw;
    }
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
      dispatch(setFilterFullScreenLoaderCount(1));

      let response = await checkLengthDownloadAdaVisualTable(payload);
      const rowCount = response?.data?.data?.row_count ?? 0;
      if (rowCount > 100000) {
        setDownloadFileRows(rowCount);
        setShowLengthFileExceedPrompt(true);
      } else {
        await downloadAdaForecastReport(payload);
        successHandler(dispatch, t("ada.common.downloadRequestRunning"));
      }
    } catch (err) {
      errorHandler(dispatch, t("ada.common.errorWhileDownloading"));
    } finally {
      dispatch(setFilterFullScreenLoaderCount(-1));
    }
  };

  return (
    <div
      className={classNames(
        globalClasses.flexRow,
        globalClasses.verticalAlignCenter
      )}
    >
      <Tooltip
        title={t("ada.downloadForecast.download")}
        orientation="top"
        variant="tertiary"
      >
        <Button
          className={classes.downloadForecast}
          // variant="text"
          onClick={() => {
            let fiscalIds = adaReducer?.xAxisStaticDates?.fiscal_ids || [];
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
          disabled={disabled}
          icon={<IA_DOWNLOAD />}
          iconPlacement="left"
          type="default"
          variant="tertiary"
          sx={{ background: "#f5f6fa !important", border: "none !important" }}
        ></Button>
      </Tooltip>
      <DailyForecastConfirmPopup
        setShowPrompt={setShowPrompt}
        showDailyForecastPrompt={showDailyForecastPrompt}
        setShowDailyForecastPrompt={setShowDailyForecastPrompt}
        setForecastLevel={setForecastLevel}
      />
      {/* <Prompt
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
      /> */}
      <Prompt
        isOpen={showPrompt}
        children={<>{t("ada.downloadForecast.subHeading")}</>}
        infoList={[]}
        primaryButtonLabel={t("ada.downloadForecast.downloadForecastButton")}
        secondaryButtonLabel={t("ada.downloadForecast.cancel")}
        onPrimaryButtonClick={() => {
          downloadForecast();
          setShowPrompt(false);
        }}
        onSecondaryButtonClick={() => setShowPrompt(false)}
      />
      <DownloadRowLimitPrompt
        isOpen={showLengthFileExceedPrompt}
        rowCount={downloadFileRows}
        onPrimaryButtonClick={() => {
          setShowLengthFileExceedPrompt(false);
          setDownloadFileRows("-");
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
    marginBottom: "20px !important",
  },
}));
