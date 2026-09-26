import { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { connect, useDispatch } from "react-redux";
import { Chips } from "impact-ui-v3";
import LoadingOverlay from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getTenantConfigApplicationLevel,
  updateModuleConfig,
  refreshTenantConfigs,
} from "core/actions/tenantConfigActions";
import CustomChipSet from "core/commonComponents/CustomChipSet";
import styles from "../designSystem.module.css";

const KPI_SECTIONS = ["store", "forecast"];
const APPLICATION_CODE = 1;
const ATTRIBUTE_NAME = "inventory_kpi";

const KpiSettings = (props) => {
  const [configData, setConfigData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  // Transform object to array for CustomChipSet
  // Sorts by display_order if available, otherwise uses object key order
  const objectToArray = useCallback((section) => {
    if (!configData?.[section] || typeof configData[section] !== "object") {
      return [];
    }
    
    const sectionData = configData[section];
    const entries = Object.keys(sectionData).map((key) => ({
      key,
      label: sectionData[key].label,
      visible: sectionData[key].visible,
      display_order: sectionData[key].display_order,
    }));
    
    // Sort by display_order if available
    const hasDisplayOrder = entries.some(item => item.display_order !== undefined && item.display_order !== null);
    if (hasDisplayOrder) {
      return entries.sort((a, b) => {
        const orderA = a.display_order !== undefined && a.display_order !== null ? a.display_order : 9999;
        const orderB = b.display_order !== undefined && b.display_order !== null ? b.display_order : 9999;
        return orderA - orderB;
      });
    }
    
    return entries;
  }, [configData]);

  // Transform array back to object for saving
  // Adds display_order based on current position in array
  const arrayToObject = useCallback((array) => {
    const obj = {};
    array.forEach((item, index) => {
      obj[item.key] = {
        label: item.label,
        visible: item.visible,
        display_order: index, // Add display_order based on current UI position
      };
    });
    return obj;
  }, []);

  const selectedCount = useMemo(() => {
    if (!configData) return { selected: 0, total: 0 };
    let selected = 0;
    let total = 0;

    KPI_SECTIONS.forEach((section) => {
      if (configData[section] && typeof configData[section] === "object") {
        Object.values(configData[section]).forEach((kpi) => {
          total++;
          if (kpi.visible) selected++;
        });
      }
    });

    if (configData.tickersList && typeof configData.tickersList === "object") {
      Object.values(configData.tickersList).forEach((ticker) => {
        total++;
        if (ticker.visible) selected++;
      });
    }

    return { selected, total };
  }, [configData]);

  // Handle chip toggle for a specific section
  const handleChipToggle = useCallback((section) => (key, index) => {
    setConfigData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: {
          ...prev[section][key],
          visible: !prev[section][key].visible,
        },
      },
    }));
  }, []);

  // Handle select all for a specific section
  const handleSelectAll = useCallback((section) => (selectAll) => {
    setConfigData((prev) => ({
      ...prev,
      [section]: Object.keys(prev[section]).reduce((acc, key) => {
        acc[key] = { ...prev[section][key], visible: selectAll };
        return acc;
      }, {}),
    }));
  }, []);


  // Handle chip reorder for a specific section
  const handleChipReorder = useCallback((section) => (reorderedArray) => {
    setConfigData((prev) => ({
      ...prev,
      [section]: arrayToObject(reorderedArray),
    }));
  }, [arrayToObject]);

  const saveKpiConfiguration = useCallback(async () => {
    try {
      // Transform configData to add display_order to each KPI based on current UI position
      const configDataWithOrder = { ...configData };
      KPI_SECTIONS.forEach((section) => {
        if (configDataWithOrder[section]) {
          const arrayData = objectToArray(section);
          configDataWithOrder[section] = arrayToObject(arrayData);
        }
      });
      
      const payload = {
        config: {
          attribute_value: {
            value: configDataWithOrder,
          },
          attribute_code: "5003",
          screen_code: "51",
          module_code: 3,
        },
      };
      
      console.log("payload", payload);
      await updateModuleConfig(payload)();
      await refreshTenantConfigs(APPLICATION_CODE);
      dispatch(
        addSnack({
          message: "KPI configuration saved successfully.",
          options: { variant: "success" },
        })
      );
      return true;
    } catch (error) {
      console.error("Error saving KPI configuration:", error);
      dispatch(
        addSnack({
          message: "Error saving KPI configuration.",
          options: { variant: "error" },
        })
      );
      return false;
    }
  }, [configData, dispatch]);

  const [portalTarget, setPortalTarget] = useState(null);

  useEffect(() => {
    const el = document.getElementById("workflow-panel-header");
    if (el) setPortalTarget(el);

    return () => {
      const headerEl = document.getElementById("workflow-panel-header");
      if (headerEl) {
        const badge = headerEl.querySelector("[data-kpi-badge]");
        if (badge) badge.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (props.setUpCallbacks) {
      props.setUpCallbacks({ nextNavFunc: saveKpiConfiguration });
    }
  }, [saveKpiConfiguration]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const resp = await getTenantConfigApplicationLevel(APPLICATION_CODE, {
          attribute_name: ATTRIBUTE_NAME,
        })();
        console.log("[KpiSettings] API response:", resp);
        const attributeValue = resp?.data?.data?.[0]?.attribute_value;
        console.log("[KpiSettings] attribute_value:", attributeValue);
        
        // Extract the actual config data from the nested value object
        const configValue = attributeValue?.value || attributeValue;
        console.log("[KpiSettings] extracted configValue:", configValue);
        
        // Log the exact key order for store KPIs
        if (configValue?.store) {
          console.log("[KpiSettings] Store KPI keys in order:", Object.keys(configValue.store));
        }
        if (configValue?.forecast) {
          console.log("[KpiSettings] Forecast KPI keys in order:", Object.keys(configValue.forecast));
        }
        
        if (configValue) {
          setConfigData(configValue);
        }
      } catch (error) {
        console.error("Error fetching KPI configuration:", error);
        dispatch(
          addSnack({
            message: "Error fetching KPI configuration.",
            options: { variant: "error" },
          })
        );
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Helper to clean ticker labels
  const getTickerDisplayLabel = useCallback((label) => {
    if (!label) return "";
    return label
      .replace(/\.\s*Refresh Date:/i, "")
      .replace(/\s*Refresh Date:/i, "")
      .trim();
  }, []);

  // Transform tickersList with cleaned labels
  const getTickersArray = useCallback(() => {
    if (!configData?.tickersList) return [];
    return Object.entries(configData.tickersList).map(([key, ticker]) => ({
      key,
      label: getTickerDisplayLabel(ticker.label),
      visible: ticker.visible,
    }));
  }, [configData, getTickerDisplayLabel]);


  return (
    <LoadingOverlay loader={isLoading} spinner>
      <div
        className={`${styles.tokens} ${styles.flex} ${styles.flexCol} ${styles.gap24}`}
        style={{ overflowY: "auto", maxHeight: "100%" }}
      >
        {portalTarget &&
          createPortal(
            <span
              data-kpi-badge
              className={`${styles.text14} ${styles.fontMedium}`}
              style={{ color: "#4259EE", marginBottom: "1rem" }}
            >
              Selected {String(selectedCount.selected).padStart(2, "0")}/
              {String(selectedCount.total).padStart(2, "0")}
            </span>,
            portalTarget
          )}

        {!isLoading && !configData && (
          <div
            className={`${styles.flex} ${styles.itemsCenter} ${styles.justifyCenter} ${styles.p24}`}
            style={{ color: "#60697D" }}
          >
            <span className={`${styles.text14} ${styles.fontMedium}`}>
              No KPI configuration found. Please ensure the &quot;inventory_kpi&quot;
              attribute is configured for this tenant.
            </span>
          </div>
        )}

        <div className={`${styles.flex} ${styles.flexCol} ${styles.gap8}`}>
          <span
            className={`${styles.text14} ${styles.fontBold}`}
            style={{ color: "#1F2B4D" }}
          >
            Date Ticker Configuration
          </span>
          <span
            className={`${styles.text12} ${styles.fontMedium}`}
            style={{ color: "#60697D" }}
          >
            Select data sources to display refresh timestamps on the dashboard.
          </span>
          <div
            className={`${styles.rounded12} ${styles.p16} ${styles.flex} ${styles.flexCol} ${styles.gap12}`}
            style={{ backgroundColor: "#EFF2FA" }}
          >
            <span
              className={`${styles.text12} ${styles.fontBold}`}
              style={{ color: "#1F2B4D" }}
            >
              Select Data Sources
            </span>
            <div
              className={`${styles.flex} ${styles.flexWrap} ${styles.gap8}`}
            >
              {configData?.tickersList &&
                Object.entries(configData.tickersList).map(([key, ticker]) => (
                  <Chips
                    key={`ticker-${key}`}
                    label={getTickerDisplayLabel(ticker.label)}
                    isActive={ticker.visible}
                    onClick={() => handleChipToggle("tickersList")(key)}
                    type="multi"
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Forecast KPIs */}
        {configData?.forecast && Object.keys(configData.forecast).length > 0 && (
          <div className={`${styles.flex} ${styles.flexCol} ${styles.gap8}`}>
            <span
              className={`${styles.text14} ${styles.fontBold}`}
              style={{ color: "#1F2B4D" }}
            >
              Forecast:
            </span>
            <CustomChipSet
              label="Out-Of-The-Box KPIs"
              chipData={objectToArray("forecast")}
              onChipToggle={handleChipToggle("forecast")}
              onSelectAll={handleSelectAll("forecast")}
              onChipReorder={handleChipReorder("forecast")}
              showSelectAll={true}
              backgroundColor="#EFF2FA"
              editable={true}
              draggable={true}
            />
          </div>
        )}

        {/* Store Inventory KPIs */}
        {configData?.store && Object.keys(configData.store).length > 0 && (
          <div className={`${styles.flex} ${styles.flexCol} ${styles.gap8}`}>
            <span
              className={`${styles.text14} ${styles.fontBold}`}
              style={{ color: "#1F2B4D" }}
            >
              Store Inventory:
            </span>
            <CustomChipSet
              label="Out-Of-The-Box KPIs"
              chipData={objectToArray("store")}
              onChipToggle={handleChipToggle("store")}
              onSelectAll={handleSelectAll("store")}
              onChipReorder={handleChipReorder("store")}
              showSelectAll={true}
              backgroundColor="#EFF2FA"
              editable={true}
              draggable={true}
            />
          </div>
        )}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (state) => ({});
const mapDispatchToProps = (dispatch) => ({
  addSnack: (messageProperties) => dispatch(addSnack(messageProperties)),
});

export default connect(mapStateToProps, mapDispatchToProps)(KpiSettings);
