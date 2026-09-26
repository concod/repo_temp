import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { LogisticsConfigSection } from "./components/LogisticsConfigSection";
import { LogisticsConfigurationPanel } from "./components/LogisticsConfigurationPanel";
import { LOGISTICS_CONFIG_SECTIONS } from "./logisticsConfigConstants";
import {
  buildLogisticsConfigurationSavePayload,
  getSectionDataFromLogistics,
} from "./logisticsConfigUtils";
import { useLogisticsConfigurationStyles } from "./logisticsConfigurationStyles";
import globalStyles from "core/Styles/globalStyles";
import {
  getLogisticConfiguration,
  getLogisticConfigurationOptions,
  saveLogisticConfiguration,
} from "../../services-inventorysmart/Logistics-Configuration/logistics-configuration-service";
import {
  displaySnackMessages,
  handleErrorMessage,
} from "../inventorysmart-utility";

export const LogisticsConfiguration = ({
  getLogisticConfiguration,
  getLogisticConfigurationOptions,
  saveLogisticConfiguration,
  addSnack,
}) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useLogisticsConfigurationStyles();
  const [logisticsData, setLogisticsData] = useState(null);
  const [geographyOptions, setGeographyOptions] = useState([]);
  const [configurationOptions, setConfigurationOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    const fetchLogisticConfiguration = async () => {
      try {
        setLoading(true);
        const [configResponse, optionsResponse] = await Promise.all([
          getLogisticConfiguration(),
          getLogisticConfigurationOptions(),
        ]);

        if (configResponse?.data?.status) {
          setLogisticsData(configResponse.data);
        } else {
          displaySnackMessages(
            configResponse?.data?.message ||
              t("inventorysmart.logisticsConfigLoadFailed"),
            "error",
            { addSnack }
          );
        }

        if (optionsResponse?.data?.status) {
          const optionsData = optionsResponse.data?.data || {};
          setGeographyOptions(optionsData.geography || []);
          setConfigurationOptions(optionsData);
        } else {
          displaySnackMessages(
            optionsResponse?.data?.message ||
              t("inventorysmart.logisticsConfigOptionsLoadFailed"),
            "error",
            { addSnack }
          );
        }
      } catch (error) {
        handleErrorMessage(error, { addSnack });
      } finally {
        setLoading(false);
      }
    };

    fetchLogisticConfiguration();
  }, [getLogisticConfiguration, getLogisticConfigurationOptions, addSnack]);

  const openPanel = (sectionId) => {
    setActiveSectionId(sectionId);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setActiveSectionId(null);
  };

  const refreshLogisticsConfiguration = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const configResponse = await getLogisticConfiguration();
      if (configResponse?.data?.status) {
        setLogisticsData(configResponse.data);
        return true;
      }

      displaySnackMessages(
        configResponse?.data?.message ||
          t("inventorysmart.logisticsConfigLoadFailed"),
        "error",
        { addSnack }
      );
      return false;
    } catch (error) {
      handleErrorMessage(error, { addSnack });
      return false;
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleSave = async (panelData) => {
    try {
      setIsSaving(true);
      const payload = buildLogisticsConfigurationSavePayload(panelData);
      const response = await saveLogisticConfiguration(payload);

      if (!response?.data?.status) {
        displaySnackMessages(
          response?.data?.message ||
            t("inventorysmart.logisticsConfigSaveFailed"),
          "error",
          { addSnack }
        );
        return;
      }

      displaySnackMessages(
        response.data.message || t("inventorysmart.logisticsConfigSaveSuccess"),
        "success",
        { addSnack }
      );

      closePanel();
      await refreshLogisticsConfiguration({ showLoader: true });
    } catch (error) {
      handleErrorMessage(error, { addSnack });
    } finally {
      setIsSaving(false);
    }
  };

  const isSectionActionsEnabled = (sectionId) => {
    if (sectionId === "lead_time") {
      return configurationOptions.lead_time_visible === true;
    }
    return true;
  };

  return (
    <div className={globalClasses.marginTop_8}>
      <Loader loader={loading}>
        <div className={classes.container}>
          <div className={classes.sectionsGrid}>
            {LOGISTICS_CONFIG_SECTIONS.map((section) => (
              <LogisticsConfigSection
                key={section.id}
                section={section}
                sectionData={getSectionDataFromLogistics(logisticsData, section.id)}
                isActionsEnabled={isSectionActionsEnabled(section.id)}
                onConfigure={() => openPanel(section.id)}
                onEdit={() => openPanel(section.id)}
              />
            ))}
          </div>
        </div>
      </Loader>

      <LogisticsConfigurationPanel
        key={activeSectionId || "logistics-panel-closed"}
        open={panelOpen}
        sectionId={activeSectionId}
        sectionData={getSectionDataFromLogistics(logisticsData, activeSectionId)}
        geographyOptions={geographyOptions}
        isSaving={isSaving}
        onClose={closePanel}
        onSave={handleSave}
      />
    </div>
  );
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  getLogisticConfiguration: () => dispatch(getLogisticConfiguration()),
  getLogisticConfigurationOptions: () =>
    dispatch(getLogisticConfigurationOptions()),
  saveLogisticConfiguration: (payload) =>
    dispatch(saveLogisticConfiguration(payload)),
});

export default connect(null, mapDispatchToProps)(LogisticsConfiguration);
