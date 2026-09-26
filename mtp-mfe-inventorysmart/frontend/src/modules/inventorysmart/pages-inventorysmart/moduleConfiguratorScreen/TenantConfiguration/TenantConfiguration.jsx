import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Breadcrumbs, Select, Checkbox, Input } from "impact-ui-v3";
import { useTranslation } from "impact-ui-v3";
import HomeIcon from "@mui/icons-material/Home";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import localizationIcon from "assets/configurator-icons/icon-localization.png";
import localizationPinIcon from "assets/configurator-icons/icon-localization-pin.png";
import masterDataDbIcon from "assets/configurator-icons/icon-masterdata-db.svg?url";
import rclRegistryIcon from "assets/configurator-icons/icon-rclregistry.png";
import tickGreenIcon from "assets/configurator-icons/icon-tick-green.svg?url";
import tickGrayIcon from "assets/configurator-icons/icon-tick-gray.svg?url";
import styles from "../designSystem.module.css";
import { useStyles } from "./styles";
import { getTenantConfigApplicationLevel, updateTenantConfig, getProductStoreAttributesList, refreshTenantConfigs } from "core/actions/tenantConfigActions";
import { storeTenantCurrencySymbol, CURRENCIES } from "core/commonComponents/coreComponentScreen/utils";
import MasterDataStep from "./MasterDataStep";
import LoadingOverlay from "core/Utils/Loader/loader";

const LocalizationIcon = () => (
  <div style={{ width: 28, height: 28, position: "relative", borderRadius: 7, overflow: "hidden", background: "linear-gradient(180deg, #DFBBF7 0%, #931CE3 100%)" }}>
    <div style={{ position: "absolute", left: 0, top: 5, width: 23, height: 24, background: "white", borderBottomLeftRadius: 5, borderTopRightRadius: 7 }}>
      <img src={localizationPinIcon} alt="" style={{ position: "absolute", left: 0, top: 2, width: 20, height: 20, objectFit: "contain" }} />
    </div>
  </div>
);

const MasterDataIcon = () => (
  <div style={{ width: 28, height: 28, position: "relative", borderRadius: 7, overflow: "hidden", background: "linear-gradient(180deg, #9FC0FF 0%, #1172E4 100%)" }}>
    <div style={{ position: "absolute", left: 6, top: 7, width: 23, height: 24, background: "white", borderTopLeftRadius: 7, borderBottomRightRadius: 7 }}>
      <img src={masterDataDbIcon} alt="" style={{ position: "absolute", left: 4, top: 4, width: 17, height: 17 }} />
    </div>
  </div>
);

const STEPS = [
  {
    id: "localization",
    titleKey: "moduleConfigurator.tenant.localization.title",
    subtitleKey: "moduleConfigurator.tenant.localization.subtitle",
    icon: null,
    IconComponent: LocalizationIcon,
    gradientEnd: "rgba(190, 119, 238, 0.08)",
    borderColor: "#D6C8FF",
    arrowColor: "#D6C8FF",
  },
  {
    id: "master-data",
    titleKey: "moduleConfigurator.tenant.masterData.title",
    subtitleKey: "moduleConfigurator.tenant.masterData.subtitle",
    icon: null,
    IconComponent: MasterDataIcon,
    gradientEnd: "rgba(17, 114, 228, 0.08)",
    borderColor: "#A3C9FF",
    arrowColor: "#A3C9FF",
  },
  // {
  //   id: "rcl-registry",
  //   title: "RCL Registry",
  //   subtitle: "Pick and rank active fields to set priority hierarchy",
  //   icon: rclRegistryIcon,
  //   gradientEnd: "rgba(212, 135, 10, 0.08)",
  //   borderColor: "#F5D89A",
  //   arrowColor: "#F5D89A",
  // },
];

const REGIONS = [
  { id: "region_1", value: "global", label: "Global" },
  { id: "region_2", value: "north_america", label: "North America" },
  { id: "region_3", value: "asia", label: "Asia" },
  { id: "region_4", value: "australia", label: "Australia" },
  { id: "region_5", value: "new_zealand", label: "New Zealand" },
  { id: "region_5", value: "uk", label: "UK" },
];

const TIME_ZONES = [
  { id: "tz_1", value: "UTC", label: "(UTC+00:00) Coordinated Universal Time" },
  { id: "tz_2", value: "America/Los_Angeles", label: "(UTC-08:00) Pacific Time - Los Angeles, Vancouver" },
  { id: "tz_3", value: "America/Chicago", label: "(UTC-06:00) Central Time - Chicago, Winnipeg" },
  { id: "tz_4", value: "America/New_York", label: "(UTC-05:00) Eastern Time - New York, Toronto" },
  { id: "tz_5", value: "Asia/Hong_Kong", label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi" },
  { id: "tz_6", value: "Australia/Melbourne", label: "(UTC+11:00) Canberra, Melbourne, Sydney" },
  { id: "tz_7", value: "Pacific/Auckland", label: "(UTC+13:00) Auckland, Wellington" },
  { id: "tz_8", value: "GMT", label: "(UTC+00:00) Greenwich Mean Time" },
];

const DATE_FORMATS = [
  { id: "df_1", value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
  { id: "df_2", value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
  { id: "df_3", value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];



const TenantConfiguration = () => {
  const classes = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionOptions, setRegionOptions] = useState(REGIONS);
  const [regionOpen, setRegionOpen] = useState(false);

  const [selectedTimezone, setSelectedTimezone] = useState(null);
  const [tzOptions, setTzOptions] = useState(TIME_ZONES);
  const [tzOpen, setTzOpen] = useState(false);

  const [selectedDateFormat, setSelectedDateFormat] = useState(null);
  const [dfOptions, setDfOptions] = useState(DATE_FORMATS);
  const [dfOpen, setDfOpen] = useState(false);

  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [curOptions, setCurOptions] = useState(CURRENCIES);
  const [curOpen, setCurOpen] = useState(false);

  const [productHierarchyOptions, setProductHierarchyOptions] = useState([]);
  const [cnaProductOptions, setCnaProductOptions] = useState([]);
  const [selectedProductHierarchy, setSelectedProductHierarchy] = useState([]);
  const [productHierarchyOpen, setProductHierarchyOpen] = useState(false);
  const [productSelectAll, setProductSelectAll] = useState(false);

  const [storeHierarchyOptions, setStoreHierarchyOptions] = useState([]);
  const [selectedStoreHierarchy, setSelectedStoreHierarchy] = useState([]);
  const [storeHierarchyOpen, setStoreHierarchyOpen] = useState(false);
  const [storeSelectAll, setStoreSelectAll] = useState(false);

  const [selectedStoreCapacity, setSelectedStoreCapacity] = useState([]);
  const [storeCapacityOptions, setStoreCapacityOptions] = useState([]);
  const [storeCapacityOpen, setStoreCapacityOpen] = useState(false);
  const [storeCapacitySelectAll, setStoreCapacitySelectAll] = useState(false);

  const [selectedStoreCluster, setSelectedStoreCluster] = useState([]);
  const [storeClusterOptions, setStoreClusterOptions] = useState([]);
  const [storeClusterOpen, setStoreClusterOpen] = useState(false);
  const [storeClusterSelectAll, setStoreClusterSelectAll] = useState(false);

  const [selectedStoreGrade, setSelectedStoreGrade] = useState([]);
  const [storeGradeOptions, setStoreGradeOptions] = useState([]);
  const [storeGradeOpen, setStoreGradeOpen] = useState(false);
  const [storeGradeSelectAll, setStoreGradeSelectAll] = useState(false);

  const [dcValidFlow, setDcValidFlow] = useState(true);
  const [poValidFlow, setPoValidFlow] = useState(false);
  const [asnValidFlow, setAsnValidFlow] = useState(false);
  const [poChannelIncluded, setPoChannelIncluded] = useState(false);
  const [asnChannelIncluded, setAsnChannelIncluded] = useState(false);

  const [enableOb, setEnableOb] = useState(false);
  const [keyOverrides, setKeyOverrides] = useState({});

  const [tenantTimeConfig, setTenantTimeConfig] = useState(null);
  const [userHierarchiesConfig, setUserHierarchiesConfig] = useState(null);
  const [cnaTenantConfig, setCnaTenantConfig] = useState(null);
  const masterDataRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localizationLoading, setLocalizationLoading] = useState(true);

  useEffect(() => {
    const fetchTenantTimeConfig = async () => {
      try {
        const resp = await getTenantConfigApplicationLevel(3, {
          attribute_name: "tenant_time_config",
        })();
        const attributeValue = resp?.data?.data?.[0]?.attribute_value;
        setTenantTimeConfig(attributeValue);
        const configValue = attributeValue?.value;
        if (configValue) {
          if (configValue.time_zone) {
            const matchedTz = TIME_ZONES.find(
              (tz) => tz.value.toLowerCase() === configValue.time_zone.toLowerCase()
            );
            if (matchedTz) setSelectedTimezone(matchedTz);
          }
          if (configValue.time_format) {
            const matchedDf = DATE_FORMATS.find(
              (df) => df.value.toLowerCase() === configValue.time_format.toLowerCase()
            );
            if (matchedDf) setSelectedDateFormat(matchedDf);
          }
          if (configValue.region) {
            const matchedRegion = REGIONS.find(
              (r) => r.value.toLowerCase() === configValue.region.toLowerCase()
            );
            if (matchedRegion) setSelectedRegion(matchedRegion);
          }
          if (configValue.currency) {
            const matchedCur = CURRENCIES.find(
              (c) => c.value.toLowerCase() === configValue.currency.toLowerCase()
            );
            if (matchedCur) setSelectedCurrency(matchedCur);
          }
        }
      } catch (error) {
        console.error("Failed to fetch tenant time config:", error);
      }
    };
    const filterByKeys = (list, keys = []) => {
      if (!keys.length) return list;
      return list.filter((item) => keys.every((key) => item[key]));
    };
    const fetchProductStoreList = async (filters = []) => {
      try {
        const responseData = await getProductStoreAttributesList()();
        const productOpts = filterByKeys(responseData?.product || [], filters);
        const storeOpts = filterByKeys(responseData?.store || [], filters);
        setProductHierarchyOptions(productOpts);
        setStoreHierarchyOptions(storeOpts);
        
        const cnaOpts = productOpts.map(opt => ({
          ...opt,
          label: opt.value
        }));
        setCnaProductOptions(cnaOpts);
        setStoreCapacityOptions(cnaOpts);
        setStoreClusterOptions(cnaOpts);
        setStoreGradeOptions(cnaOpts);
        
        return { productOpts, storeOpts };
      } catch (error) {
        console.error("Failed to fetch product-store list:", error);
        return { productOpts: [], storeOpts: [] };
      }
    };

    const fetchUserHierarchies = async (productOpts, storeOpts) => {
      try {
        const resp = await getTenantConfigApplicationLevel(6, {
          attribute_name: "user_hierarchies",
        })();
        const configValue = resp?.data?.data?.[0]?.attribute_value;
        setUserHierarchiesConfig(configValue);
        if (configValue) {
          if (configValue.product) {
            const matchedProduct = configValue.product
              .map((h) =>
                productOpts.find(
                  (opt) => opt.value.toLowerCase() === h.name.toLowerCase()
                )
              )
              .filter(Boolean);
            if (matchedProduct.length) {
              setSelectedProductHierarchy(matchedProduct);
              setProductSelectAll(matchedProduct.length === productOpts.length);
            }
          }
          if (configValue.store) {
            const matchedStore = configValue.store
              .map((h) =>
                storeOpts.find(
                  (opt) => opt.value.toLowerCase() === h.name.toLowerCase()
                )
              )
              .filter(Boolean);
            if (matchedStore.length) {
              setSelectedStoreHierarchy(matchedStore);
              setStoreSelectAll(matchedStore.length === storeOpts.length);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch user hierarchies:", error);
      }
    };

    const fetchCnaTenantConfig = async () => {
      try {
        const resp = await getTenantConfigApplicationLevel(1, {
          attribute_name: "inventory_specific_tenant_configs",
        })();
        const attributeValue = resp?.data?.data?.[0]?.attribute_value;
        setCnaTenantConfig(attributeValue);
        const configValue = attributeValue?.value || attributeValue || {};
        if (configValue.enable_ob !== undefined) {
          setEnableOb(configValue.enable_ob);
        }
        if (configValue.key_overrides) {
          setKeyOverrides(configValue.key_overrides);
        }
        
        return attributeValue;
      } catch (error) {
        console.error("Failed to fetch CNA tenant config:", error);
        return null;
      }
    };

    const initUamDropdowns = async () => {
      const { productOpts, storeOpts } = await fetchProductStoreList();
      await fetchUserHierarchies(productOpts, storeOpts);
      return productOpts;
    };

    const initCnaDropdowns = async (productOpts, cnaConfig) => {
      if (!cnaConfig || !productOpts?.length) return;

      const cnaOpts = productOpts.map(opt => ({
        ...opt,
        label: opt.value
      }));

      const configValue = cnaConfig.value || cnaConfig;
      if (configValue) {
        if (configValue.store_capacity_level_mapping?.length) {
          const matchedCapacity = configValue.store_capacity_level_mapping
            .map((val) => cnaOpts.find((opt) => opt.value.toLowerCase() === val.toLowerCase()))
            .filter(Boolean);
          if (matchedCapacity.length) {
            setSelectedStoreCapacity(matchedCapacity);
            setStoreCapacitySelectAll(matchedCapacity.length === cnaOpts.length);
          }
        }
        if (configValue.store_cluster_level_mapping?.length) {
          const matchedCluster = configValue.store_cluster_level_mapping
            .map((val) => cnaOpts.find((opt) => opt.value.toLowerCase() === val.toLowerCase()))
            .filter(Boolean);
          if (matchedCluster.length) {
            setSelectedStoreCluster(matchedCluster);
            setStoreClusterSelectAll(matchedCluster.length === cnaOpts.length);
          }
        }
        if (configValue.store_grade_level_mapping?.length) {
          const matchedGrade = configValue.store_grade_level_mapping
            .map((val) => cnaOpts.find((opt) => opt.value.toLowerCase() === val.toLowerCase()))
            .filter(Boolean);
          if (matchedGrade.length) {
            setSelectedStoreGrade(matchedGrade);
            setStoreGradeSelectAll(matchedGrade.length === cnaOpts.length);
          }
        }
        
        if (configValue.allocation_types) {
          const allocTypes = configValue.allocation_types;
          if (allocTypes.dc) {
            setDcValidFlow(allocTypes.dc.valid_flow ?? true);
          }
          if (allocTypes.po) {
            setPoValidFlow(allocTypes.po.valid_flow ?? false);
            setPoChannelIncluded(allocTypes.po.is_channel_included ?? false);
          }
          if (allocTypes.asn) {
            setAsnValidFlow(allocTypes.asn.valid_flow ?? false);
            setAsnChannelIncluded(allocTypes.asn.is_channel_included ?? false);
          }
        }
      }
    };

    setLocalizationLoading(true);
    Promise.all([fetchTenantTimeConfig(), initUamDropdowns(), fetchCnaTenantConfig()])
      .then(([_, productOpts, cnaConfig]) => {
        initCnaDropdowns(productOpts, cnaConfig);
      })
      .finally(() => {
        setLocalizationLoading(false);
      });
  }, [refreshKey]);

  const handleSave = async () => {
    try {
      // Master Data step save
      if (activeStep === 1) {
        await masterDataRef.current?.save();
        return;
      }
      setLocalizationLoading(true);

      // Merge tenant_time_config: preserve original keys, override only changed values
      const originalTimeValue = tenantTimeConfig?.value || {};
      const mergedTimeConfig = {
        ...tenantTimeConfig,
        value: {
          ...originalTimeValue,
          time_zone: selectedTimezone?.value || originalTimeValue.time_zone || "",
          time_format: selectedDateFormat?.value || originalTimeValue.time_format || "",
          ...(selectedRegion?.value && { region: selectedRegion.value }),
          ...(selectedCurrency?.value && { currency: selectedCurrency.value }),
        },
      };

      // Merge user_hierarchies: preserve extra keys from original config for existing items
      const originalProduct = userHierarchiesConfig?.product || [];
      const originalStore = userHierarchiesConfig?.store || [];

      const productHierarchies = selectedProductHierarchy.map((opt) => {
        const original = originalProduct.find(
          (item) => item.name.toLowerCase() === opt.value.toLowerCase()
        );
        return original
          ? { ...original, label: opt.label }
          : { name: opt.value, label: opt.label };
      });

      const storeHierarchies = selectedStoreHierarchy.map((opt) => {
        const original = originalStore.find(
          (item) => item.name.toLowerCase() === opt.value.toLowerCase()
        );
        return original
          ? { ...original, label: opt.label }
          : { name: opt.value, label: opt.label };
      });

      const mergedUserHierarchies = {
        ...userHierarchiesConfig,
        store: storeHierarchies,
        product: productHierarchies,
      };

      // Merge inventory_specific_tenant_configs
      const originalCnaValue = cnaTenantConfig?.value || cnaTenantConfig || {};
      const { allocation_types: _unused, ...restCnaValue } = originalCnaValue;
      
      const mergedCnaConfig = {
        ...restCnaValue,
        store_capacity_level_mapping: selectedStoreCapacity.map(opt => opt.value),
        store_cluster_level_mapping: selectedStoreCluster.map(opt => opt.value),
        store_grade_level_mapping: selectedStoreGrade.map(opt => opt.value),
        enable_ob: enableOb,
        key_overrides: keyOverrides,
        allocation_types: {
          dc: {
            valid_flow: dcValidFlow,
            is_channel_included: false,
          },
          po: {
            valid_flow: poValidFlow,
            is_channel_included: poChannelIncluded,
          },
          asn: {
            valid_flow: asnValidFlow,
            is_channel_included: asnChannelIncluded,
          },
        },
      };

      const payload = {
        tenant_attribute_master: [
          {
            name: "tenant_time_config",
            attribute_type: "TENANT",
            application_code: 3,
            description: "Time configuration for tenant",
            status: true,
            attribute_value: mergedTimeConfig,
          },
          {
            name: "user_hierarchies",
            attribute_type: "APPLICATION",
            application_code: 6,
            description: "User Hierarchies",
            status: true,
            attribute_value: mergedUserHierarchies,
          },
          {
            name: "inventory_specific_tenant_configs",
            attribute_type: "TENANT",
            application_code: 1,
            description: "CNA tenant configurations",
            status: true,
            attribute_value: mergedCnaConfig,
          },
        ],
      };
      await updateTenantConfig(payload)();

      // Immediately update localStorage so the new currency symbol is reflected
      // in the current session without requiring a page reload.
      if (selectedCurrency?.value) {
        storeTenantCurrencySymbol(selectedCurrency.value);
      }

      await refreshTenantConfigs(3);
      await refreshTenantConfigs(6);
      await refreshTenantConfigs(1);
      setRefreshKey((prev) => prev + 1);

      dispatch(
        addSnack({
          message: t("moduleConfigurator.tenant.savedSuccess"),
          options: { variant: "success" },
        })
      );
    } catch (error) {
      dispatch(
        addSnack({
          message: t("moduleConfigurator.tenant.savedError"),
          options: { variant: "error" },
        })
      );
      setLocalizationLoading(false);
    }
  };

  const handleBack = () => {
    const backPath = location.pathname.replace(
      /\/tenant-configuration$/,
      "/application-configurator"
    );
    navigate(backPath);
  };

  return (
    <div className={`${styles.tokens} ${classes.pageContainer}`}>
      {/* Breadcrumbs */}
      <div style={{ padding: "12px 24px 0 24px" }}>
        <Breadcrumbs
          aria-label="breadcrumb"
          list={[
            { label: t("moduleConfigurator.breadcrumb.home"), icon: <HomeIcon /> },
            { label: t("moduleConfigurator.breadcrumb.applicationConfigurator") },
            { label: t("moduleConfigurator.breadcrumb.tenantConfigurator") },
          ]}
        />
      </div>

      {/* Main Content */}
      <div className={classes.contentWrapper}>
        {/* Step Tabs */}
        <div className={classes.stepsContainer}>
          <div className={classes.stepsRow}>
            {STEPS.map((step, idx) => (
              <div
                key={step.id}
                className={classes.stepTab}
                onClick={() => setActiveStep(idx)}
              >
                <div
                  className={`${classes.stepTabInner} ${
                    activeStep === idx ? classes.stepTabActive : ""
                  }`}
                  style={
                    activeStep === idx
                      ? {
                          background: `linear-gradient(90deg, #FFFFFF 0%, #FFFFFF 40%, ${step.gradientEnd} 100%)`,
                          borderColor: step.borderColor,
                        }
                      : undefined
                  }
                >
                  <div className={classes.stepTabContent}>
                    <div className={classes.stepIconWrapper}>
                      {step.icon ? (
                        <img
                          src={step.icon}
                          alt={t(step.titleKey)}
                          className={classes.stepIcon}
                        />
                      ) : step.IconComponent ? (
                        <step.IconComponent />
                      ) : null}
                    </div>
                    <div className={classes.stepTextGroup}>
                      <p className={classes.stepTitle}>{t(step.titleKey)}</p>
                      <p className={classes.stepSubtitle}>{t(step.subtitleKey)}</p>
                    </div>
                  </div>
                  <img
                    src={activeStep === idx ? tickGreenIcon : tickGrayIcon}
                    alt="completed"
                    className={classes.stepTick}
                  />
                </div>
                {activeStep === idx && (
                  <div
                    className={classes.stepArrow}
                    style={{ borderTopColor: step.arrowColor }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 0: Localization */}
        {activeStep === 0 && (
          <LoadingOverlay loader={localizationLoading} text={localizationLoading && refreshKey > 0 ? t("moduleConfigurator.tenant.savingConfigs") : t("moduleConfigurator.tenant.loadingConfigs")} size="medium" minHeight="400px">
          <div className={classes.formCard}>
            <p className={classes.sectionTitle}>
              {t("moduleConfigurator.tenant.localizationDisplayStandards")}
            </p>
            <div className={classes.formRow}>
              <Select
                label={t("moduleConfigurator.tenant.region")}
                placeholder={t("moduleConfigurator.tenant.selectRegion")}
                initialOptions={REGIONS}
                currentOptions={regionOptions}
                setCurrentOptions={setRegionOptions}
                selectedOptions={selectedRegion}
                setSelectedOptions={setSelectedRegion}
                isOpen={regionOpen}
                setIsOpen={setRegionOpen}
                isClearable
                onClearAll={() => setSelectedRegion(null)}
              />
              <Select
                label={t("moduleConfigurator.tenant.timeZone")}
                placeholder={t("moduleConfigurator.tenant.selectTimezone")}
                initialOptions={TIME_ZONES}
                currentOptions={tzOptions}
                setCurrentOptions={setTzOptions}
                selectedOptions={selectedTimezone}
                setSelectedOptions={setSelectedTimezone}
                isOpen={tzOpen}
                setIsOpen={setTzOpen}
                isClearable
                isWithSearch
                onClearAll={() => setSelectedTimezone(null)}
              />
              <Select
                label={t("moduleConfigurator.tenant.dateFormat")}
                placeholder={t("moduleConfigurator.tenant.selectFormat")}
                initialOptions={DATE_FORMATS}
                currentOptions={dfOptions}
                setCurrentOptions={setDfOptions}
                selectedOptions={selectedDateFormat}
                setSelectedOptions={setSelectedDateFormat}
                isOpen={dfOpen}
                setIsOpen={setDfOpen}
                isClearable
                onClearAll={() => setSelectedDateFormat(null)}
              />
              <Select
                label={t("moduleConfigurator.tenant.currency")}
                placeholder={t("moduleConfigurator.tenant.selectCurrency")}
                initialOptions={CURRENCIES}
                currentOptions={curOptions}
                setCurrentOptions={setCurOptions}
                selectedOptions={selectedCurrency}
                setSelectedOptions={setSelectedCurrency}
                isOpen={curOpen}
                setIsOpen={setCurOpen}
                isClearable
                isWithSearch
                onClearAll={() => setSelectedCurrency(null)}
              />
            </div>

            <div className={classes.divider} />

            <p className={classes.sectionTitle} style={{ margin: "0 0 16px 0" }}>
              {t("moduleConfigurator.tenant.uamConfigAccessLevels")}
            </p>
            <div className={classes.formRow}>
              <Select
                label={t("moduleConfigurator.tenant.productHierarchy")}
                placeholder={t("moduleConfigurator.tenant.selectProductHierarchy")}
                initialOptions={productHierarchyOptions}
                currentOptions={productHierarchyOptions}
                setCurrentOptions={setProductHierarchyOptions}
                selectedOptions={selectedProductHierarchy}
                setSelectedOptions={setSelectedProductHierarchy}
                isOpen={productHierarchyOpen}
                setIsOpen={setProductHierarchyOpen}
                isMulti
                isClearable
                isSelectAll={productSelectAll}
                setIsSelectAll={setProductSelectAll}
                onClearAll={() => {
                  setSelectedProductHierarchy([]);
                  setProductSelectAll(false);
                }}
              />
              <Select
                label={t("moduleConfigurator.tenant.storeHierarchy")}
                placeholder={t("moduleConfigurator.tenant.selectStoreHierarchy")}
                initialOptions={storeHierarchyOptions}
                currentOptions={storeHierarchyOptions}
                setCurrentOptions={setStoreHierarchyOptions}
                selectedOptions={selectedStoreHierarchy}
                setSelectedOptions={setSelectedStoreHierarchy}
                isOpen={storeHierarchyOpen}
                setIsOpen={setStoreHierarchyOpen}
                isMulti
                isClearable
                isSelectAll={storeSelectAll}
                setIsSelectAll={setStoreSelectAll}
                onClearAll={() => {
                  setSelectedStoreHierarchy([]);
                  setStoreSelectAll(false);
                }}
              />
            </div>

            <div className={classes.divider} />

            <p className={classes.sectionTitle} style={{ margin: "0 0 16px 0" }}>
              {t("moduleConfigurator.tenant.cnaTenantConfigs")}
            </p>
            <div style={{ display: "flex", gap: "0", alignItems: "stretch" }}>
              <div style={{ flex: 0.8 }}>
                <div className={classes.formRow}>
                  <Select
                    label={t("moduleConfigurator.tenant.storeCapacityLevelMapping")}
                    placeholder={t("moduleConfigurator.tenant.selectHierarchyLevel")}
                    initialOptions={cnaProductOptions}
                    currentOptions={storeCapacityOptions}
                    setCurrentOptions={setStoreCapacityOptions}
                    selectedOptions={selectedStoreCapacity}
                    setSelectedOptions={setSelectedStoreCapacity}
                    isOpen={storeCapacityOpen}
                    setIsOpen={setStoreCapacityOpen}
                    isMulti
                    isClearable
                    isWithSearch
                    isRequired
                    isSelectAll={storeCapacitySelectAll}
                    setIsSelectAll={setStoreCapacitySelectAll}
                    onClearAll={() => {
                      setSelectedStoreCapacity([]);
                      setStoreCapacitySelectAll(false);
                    }}
                  />
                  <Select
                    label={t("moduleConfigurator.tenant.storeClusterLevelMapping")}
                    placeholder={t("moduleConfigurator.tenant.selectHierarchyLevel")}
                    initialOptions={cnaProductOptions}
                    currentOptions={storeClusterOptions}
                    setCurrentOptions={setStoreClusterOptions}
                    selectedOptions={selectedStoreCluster}
                    setSelectedOptions={setSelectedStoreCluster}
                    isOpen={storeClusterOpen}
                    setIsOpen={setStoreClusterOpen}
                    isMulti
                    isClearable
                    isWithSearch
                    isRequired
                    isSelectAll={storeClusterSelectAll}
                    setIsSelectAll={setStoreClusterSelectAll}
                    onClearAll={() => {
                      setSelectedStoreCluster([]);
                      setStoreClusterSelectAll(false);
                    }}
                  />
                  <Select
                    label={t("moduleConfigurator.tenant.storeGradeLevelMapping")}
                    placeholder={t("moduleConfigurator.tenant.selectHierarchyLevel")}
                    initialOptions={cnaProductOptions}
                    currentOptions={storeGradeOptions}
                    setCurrentOptions={setStoreGradeOptions}
                    selectedOptions={selectedStoreGrade}
                    setSelectedOptions={setSelectedStoreGrade}
                    isOpen={storeGradeOpen}
                    setIsOpen={setStoreGradeOpen}
                    isMulti
                    isClearable
                    isWithSearch
                    isRequired
                    isSelectAll={storeGradeSelectAll}
                    setIsSelectAll={setStoreGradeSelectAll}
                    onClearAll={() => {
                      setSelectedStoreGrade([]);
                      setStoreGradeSelectAll(false);
                    }}
                  />
                </div>
                
                <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #E8E8E8", marginRight: "16px" }}>
                  <Checkbox
                    label={t("moduleConfigurator.tenant.enableOrderBatching")}
                    checked={enableOb}
                    onChange={(e) => setEnableOb(e.target.checked)}
                  />
                </div>
              </div>

              <div style={{ 
                flex: 1.2,
                padding: "0 0 0 16px",
                borderLeft: "1px solid #E8E8E8",
                display: "flex",
                gap: "0"
              }}>
                <div style={{ flex: 1, paddingRight: "16px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A1A", margin: "0 0 16px 0" }}>
                    {t("moduleConfigurator.tenant.supplySourcesAggregation")}
                  </p>
                  
                  <div style={{ marginBottom: "20px" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#666", marginBottom: "10px" }}>
                      {t("moduleConfigurator.tenant.typesOfAllocations")}
                    </p>
                    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                      <Checkbox
                        label="DC"
                        checked={dcValidFlow}
                        disabled={true}
                        onChange={() => {}}
                      />
                      <Checkbox
                        label="PO"
                        checked={poValidFlow}
                        onChange={(e) => {
                          setPoValidFlow(e.target.checked);
                          if (!e.target.checked) {
                            setPoChannelIncluded(false);
                          }
                        }}
                      />
                      <Checkbox
                        label="ASN"
                        checked={asnValidFlow}
                        onChange={(e) => {
                          setAsnValidFlow(e.target.checked);
                          if (!e.target.checked) {
                            setAsnChannelIncluded(false);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {(poValidFlow || asnValidFlow) && (
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#666", marginBottom: "10px" }}>
                        {t("moduleConfigurator.tenant.levelOfJoin")}
                      </p>
                      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                        <Checkbox
                          label="Article"
                          checked={true}
                          disabled={true}
                          onChange={() => {}}
                        />
                        {poValidFlow && (
                          <Checkbox
                            label="Channel (PO)"
                            checked={poChannelIncluded}
                            onChange={(e) => setPoChannelIncluded(e.target.checked)}
                          />
                        )}
                        {asnValidFlow && (
                          <Checkbox
                            label="Channel (ASN)"
                            checked={asnChannelIncluded}
                            onChange={(e) => setAsnChannelIncluded(e.target.checked)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  flex: 1,
                  paddingLeft: "16px",
                  borderLeft: "1px solid #E8E8E8"
                }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#1A1A1A", margin: "0 0 16px 0" }}>
                    {t("moduleConfigurator.tenant.keyOverrides")}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {Object.entries(keyOverrides).map(([key, value]) => (
                      <Input
                        key={key}
                        label={key}
                        value={value}
                        onChange={(e) => setKeyOverrides({ ...keyOverrides, [key]: e.target.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          </LoadingOverlay>
        )}

        {/* Step 1: Master Data */}
        {activeStep === 1 && <MasterDataStep ref={masterDataRef} />}
      </div>

      {/* Footer */}
      <div className={classes.footer}>
        <button className={classes.backLink} onClick={handleBack}>
          <ChevronLeftIcon style={{ fontSize: 18 }} />
          {t("moduleConfigurator.tenant.backToAppConfigurator")}
        </button>
        <button className={classes.saveButton} onClick={handleSave}>
          {t("moduleConfigurator.tenant.saveAndContinue")}
          <ChevronRightIcon style={{ fontSize: 18 }} />
        </button>
      </div>
    </div>
  );
};

export default TenantConfiguration;
