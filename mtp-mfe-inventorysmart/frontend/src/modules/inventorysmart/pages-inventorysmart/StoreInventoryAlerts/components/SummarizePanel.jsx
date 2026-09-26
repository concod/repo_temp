import { useState, useEffect } from "react";
import { Panel } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import SummarizePanelContent from "./SummarizePanelContent";
import { getAggregatedSummary } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";
import { getAlanSummary } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { ERROR_TYPES, ERROR_MESSAGES, LOADER_TEXT } from "./SummarizePanelContent.constants";

const useStyles = makeStyles(() => ({
  summarizePanel: {
    width: "1000px",
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "1000px",
    },
  },
  errorMessage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "48px 24px",
    fontFamily: "Manrope",
    textAlign: "center",
  },
  errorTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  errorSubtitle: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0,
    maxWidth: "380px",
    lineHeight: 1.6,
  },
}));

const { ERROR_422, ERROR_500, ERROR_NETWORK } = ERROR_TYPES;

const SummarizePanel = ({ open, onClose, filters, summaryPlan, FilterPlan }) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [error, setError] = useState(null);       // null | "422" | "network"
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    if (!open) return;

    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      setErrorDetail(null);
      setSummaryData(null);

      try {
        const formattedFilters = (filters || [])
          .filter(
            (f) =>
              f.dimension !== "store" &&
              Array.isArray(f.values) &&
              f.values.length > 0
          )
          .map(({ filter_id, values }) => ({
            filter_id,
            values,
          }));

        const payload = {
          feature: "aggregated_insights",
          filters: formattedFilters,
        };

        const data =
          summaryPlan && FilterPlan
            ? await getAggregatedSummary(payload)
            : (await getAlanSummary(payload)())?.data;
        setSummaryData(data);
      } catch (err) {
        console.error("Failed to fetch aggregated summary:", err);
        const status = err.status || err.response?.status;
        if (status === 422) {
          setError(ERROR_422);
          setErrorDetail(err.detail || null);
        } else if (status === 500) {
          setError(ERROR_500);
        } else {
          setError(ERROR_NETWORK);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [open, summaryPlan, FilterPlan]);

  return (
    <Panel
      title="Aggregated Auto Allocation Summary"
      size="large"
      anchor="right"
      open={open}
      onClose={onClose}
      className={classes.summarizePanel}
    >
      {loading ? (
        <Loader
          loader={true}
          size="medium"
          text={LOADER_TEXT}
          minHeight="300px"
          showSkeleton={true}
        />
      ) : error === ERROR_422 ? (
        <div className={classes.errorMessage}>
          <p className={classes.errorTitle}>{ERROR_MESSAGES[ERROR_422].title}</p>
          {errorDetail && (
            <p className={classes.errorSubtitle}>{errorDetail}</p>
          )}
        </div>
      ) : error === ERROR_500 ? (
        <div className={classes.errorMessage}>
          <p className={classes.errorTitle}>{ERROR_MESSAGES[ERROR_500].title}</p>
          <p className={classes.errorSubtitle}>{ERROR_MESSAGES[ERROR_500].subtitle}</p>
        </div>
      ) : error === ERROR_NETWORK ? (
        <div className={classes.errorMessage}>
          <p className={classes.errorTitle}>{ERROR_MESSAGES[ERROR_NETWORK].title}</p>
          <p className={classes.errorSubtitle}>{ERROR_MESSAGES[ERROR_NETWORK].subtitle}</p>
        </div>
      ) : (
        <SummarizePanelContent data={summaryData} />
      )}
    </Panel>
  );
};

export default SummarizePanel;
