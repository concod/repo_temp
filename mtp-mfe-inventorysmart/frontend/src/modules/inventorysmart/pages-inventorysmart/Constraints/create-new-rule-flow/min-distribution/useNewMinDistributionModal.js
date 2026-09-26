import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "impact-ui-v3";
import { isEmpty } from "lodash";
import {
  getStyleDistributionStrategy,
  calculateStylePreview,
  getSizeDistributionStrategy,
  calculateSizePreview,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { handleErrorMessage } from "../../Rules-Constraints/add-rcl-component";
import { displaySnackMessages } from "../../../inventorysmart-utility";
import {
  formatMinDistributionDisplayValue,
  parseMinDistributionFromRow,
  buildStyleMinDistributionPayload,
  buildSizeMinDistributionPayload,
  extractStyleTableName,
  extractStyleArticleOptions,
  extractArticleMinFromStylePreview,
  buildXUnitsPerArticle,
  buildXUnitsPerSize,
  extractSizeGroups,
  flattenSizeGroups,
  buildGroupedSizeOptions,
  toSizeSelectOption,
  normalizeStylePreviewRows,
  normalizeSizePreviewRows,
} from "../createNewRuleConstraintsUtils";
import { flattenSelectedSizeOptions } from "./sizeSelectHelpers";

export const useNewMinDistributionModal = (props) => {
  const { t } = useTranslation();
  const [minValue, setMinValue] = useState(null);
  const [selectedStyleType, setSelectedStyleType] = useState("same_min");
  const [selectedSizeType, setSelectedSizeType] = useState("same_min");
  const [sizeSelectionData, setSizeSelectionData] = useState({});
  const [styleUnitsData, setStyleUnitsData] = useState({});
  const [styleTempTable, setStyleTempTable] = useState(null);
  const [styleArticleOptions, setStyleArticleOptions] = useState([]);
  const [styleUnitsPerArticle, setStyleUnitsPerArticle] = useState("");
  const [showStylePreview, setShowStylePreview] = useState(false);
  const [stylePreviewRows, setStylePreviewRows] = useState([]);
  const [stylePreviewLoader, setStylePreviewLoader] = useState(false);
  const [showSizePreview, setShowSizePreview] = useState(false);
  const [sizePreviewLoader, setSizePreviewLoader] = useState(false);
  const [selectedSizeArticle, setSelectedSizeArticle] = useState(null);
  const [sizePreviewRows, setSizePreviewRows] = useState([]);
  const [sizePreviewSizes, setSizePreviewSizes] = useState([]);
  const [sizeUnitsPerSize, setSizeUnitsPerSize] = useState("");
  const [selectedSizeOptions, setSelectedSizeOptions] = useState([]);
  const [sizeGroups, setSizeGroups] = useState({ alpha: [], numeric: [] });
  const [sizeSelectOpen, setSizeSelectOpen] = useState(false);
  const [sizeSelectAll, setSizeSelectAll] = useState(false);
  const [sizeFieldsTouched, setSizeFieldsTouched] = useState(false);
  const [sizeArticleMin, setSizeArticleMin] = useState(null);
  const sizeArticleMinCacheRef = useRef({ key: "", min: null });
  const lastPreviewedStyleUnitsRef = useRef(null);
  const lastPreviewedSizeSelectionRef = useRef("");
  const selectedSizeArticleRef = useRef(null);
  const selectedSizeValuesRef = useRef([]);
  const sizePreviewRequestIdRef = useRef(0);
  const ignoreArticleChangeRef = useRef(false);
  /** Cached GET size distribution strategy (keyed by request payload / article). */
  const sizeStrategyCacheRef = useRef(new Map());

  const styleArticles = styleArticleOptions.map((item) => item.article);
  const availableSizes = useMemo(() => flattenSizeGroups(sizeGroups), [
    sizeGroups,
  ]);
  const sizeSelectOptions = useMemo(() => buildGroupedSizeOptions(sizeGroups), [
    sizeGroups,
  ]);
  // Selected sizes live as Select option objects; the string list is derived so
  // option identity stays stable across renders (required for clear/select-all).
  const selectedSizeValues = useMemo(
    () =>
      selectedSizeOptions
        .map((option) => option?.value ?? option?.id)
        .filter(Boolean),
    [selectedSizeOptions]
  );
  selectedSizeArticleRef.current = selectedSizeArticle;
  selectedSizeValuesRef.current = selectedSizeValues;

  // The Select calls `setSelectedOptions` and/or `handleChange` depending on the
  // interaction (pick, clear, select-all), so both route through here.
  const updateSelectedSizeOptions = (next) => {
    const resolved = flattenSelectedSizeOptions(
      typeof next === "function" ? next(selectedSizeOptions) : next
    );
    const values = resolved
      .map((option) => option?.value ?? option?.id)
      .filter(Boolean);
    selectedSizeValuesRef.current = values;
    setSelectedSizeOptions(resolved);
    setSizeFieldsTouched(true);
    setSizeSelectionData(
      buildXUnitsPerSize({ sizes: values, units: sizeUnitsPerSize })
    );
    if (!values.length) {
      lastPreviewedSizeSelectionRef.current = "";
      setShowSizePreview(false);
    }
  };

  useEffect(() => {
    setSizeSelectAll(
      availableSizes.length > 0 &&
        selectedSizeValues.length === availableSizes.length
    );
  }, [selectedSizeValues, availableSizes]);

  const getParentRow = () =>
    props.rowData?.node?.parent?.data ||
    props.rowData?.node?.parent?.parent?.data;

  const buildSizeDistributionPayload = (article) => {
    const parentRow = getParentRow();
    const storeCode =
      props.flow === "exceptions"
        ? parentRow?.store_code || props.rowData?.data?.store_code
        : undefined;
    return buildSizeMinDistributionPayload(parentRow, article, storeCode);
  };

  const getSizeStrategyCacheKey = (article) =>
    JSON.stringify(buildSizeDistributionPayload(article));

  const clearSizeStrategyCache = () => {
    sizeStrategyCacheRef.current.clear();
  };

  const fetchSizeDistributionStrategyForArticle = async (article) => {
    const cacheKey = getSizeStrategyCacheKey(article);
    const cached = sizeStrategyCacheRef.current.get(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await getSizeDistributionStrategy(
      buildSizeDistributionPayload(article)
    );
    if (!handleApiResponse(response)) {
      return { sizeTableName: null, groups: { alpha: [], numeric: [] } };
    }
    const sizeTableName = extractStyleTableName(response?.data);
    const groups = extractSizeGroups(response?.data?.data || response?.data);
    const entry = { sizeTableName, groups };
    sizeStrategyCacheRef.current.set(cacheKey, entry);
    return entry;
  };

  const isMinInvalid =
    minValue === "" || minValue == null || Number(minValue) < 1;

  const minCap =
    Number.isFinite(Number(minValue)) && Number(minValue) > 0
      ? Number(minValue)
      : undefined;

  const articleCount = styleArticleOptions.length;
  const selectedSizeCount = selectedSizeValues.length;

  // Units are handed to every recipient, so Min has to cover them all: style-color
  // IDs for the style section, selected sizes for the size section. Until the
  // recipients are known, Min itself is the ceiling.
  const buildUnitsCap = (divisor, baseMin = minCap) => {
    const cap = Number(baseMin);
    if (!Number.isFinite(cap) || cap <= 0 || divisor <= 0) return undefined;
    return Math.floor(cap / divisor);
  };

  const invalidateSizeArticleMin = () => {
    setSizeArticleMin(null);
    sizeArticleMinCacheRef.current = { key: "", min: null };
  };

  const buildUnitsCapHelperText = (cap, divisor, noun, baseMin = minCap) => {
    if (cap === undefined) return "";
    const base = Number(baseMin);
    if (divisor <= 0) {
      return Number.isFinite(base) ? `Cannot exceed Min (${base}).` : "";
    }
    return `Cannot exceed ${cap} (Min ${base} / ${divisor} ${noun}${
      divisor === 1 ? "" : "s"
    }).`;
  };

  const isOverCap = (value, cap) =>
    cap !== undefined && value !== "" && value != null && Number(value) > cap;

  const styleUnitsCap = buildUnitsCap(articleCount);
  const styleUnitsCapHelperText = buildUnitsCapHelperText(
    styleUnitsCap,
    articleCount,
    "style-color ID"
  );

  const sizeUnitsCapBase =
    selectedSizeType === "x_units_per_size" ? sizeArticleMin : minCap;
  const sizeUnitsCap = buildUnitsCap(selectedSizeCount, sizeUnitsCapBase);
  const sizeUnitsCapHelperText = buildUnitsCapHelperText(
    sizeUnitsCap,
    selectedSizeCount,
    "selected size",
    sizeUnitsCapBase
  );

  const isStyleUnitsOverCap =
    selectedStyleType === "x_units_per_article" &&
    isOverCap(styleUnitsPerArticle, styleUnitsCap);

  const isSizeUnitsOverCap =
    selectedSizeType === "x_units_per_size" &&
    isOverCap(sizeUnitsPerSize, sizeUnitsCap);

  const isSizeUnitsInvalid =
    sizeUnitsPerSize === "" ||
    sizeUnitsPerSize == null ||
    Number(sizeUnitsPerSize) < 1;

  const isXUnitsPerSizeInvalid =
    isSizeUnitsInvalid || selectedSizeValues.length === 0;

  const isStyleUnitsInvalid =
    styleUnitsPerArticle === "" ||
    styleUnitsPerArticle == null ||
    Number(styleUnitsPerArticle) < 1;

  const handleApiResponse = (response) => {
    if (response?.data?.show_message && response?.data?.message) {
      displaySnackMessages(response.data.message, "error", props, true);
      return false;
    }
    return true;
  };

  const showInvalidMin = () => {
    displaySnackMessages(
      t("inventorysmart.rclEnterValidMinValue"),
      "error",
      props,
      true
    );
  };

  const showInvalidStyleUnits = () => {
    displaySnackMessages(
      "Enter units per style-color ID.",
      "error",
      props,
      true
    );
  };

  const showInvalidSizeUnits = () => {
    setSizeFieldsTouched(true);
    displaySnackMessages(
      "Enter units and select at least one size.",
      "error",
      props,
      true
    );
  };

  const showUnitsOverCap = (helperText) => {
    displaySnackMessages(helperText, "error", props, true);
  };

  const resetPreviewState = () => {
    setShowStylePreview(false);
    setStylePreviewRows([]);
    lastPreviewedStyleUnitsRef.current = null;
    setShowSizePreview(false);
    setSelectedSizeArticle(null);
    selectedSizeArticleRef.current = null;
    setSizePreviewRows([]);
    setSizePreviewSizes([]);
    lastPreviewedSizeSelectionRef.current = "";
    invalidateSizeArticleMin();
  };

  const resetSizeUnitsFields = () => {
    setSizeUnitsPerSize("");
    setSelectedSizeOptions([]);
    selectedSizeValuesRef.current = [];
    setSizeGroups({ alpha: [], numeric: [] });
    setSizeSelectOpen(false);
    setSizeFieldsTouched(false);
    lastPreviewedSizeSelectionRef.current = "";
    invalidateSizeArticleMin();
  };

  const resetStyleStrategy = () => {
    clearSizeStrategyCache();
    setStyleTempTable(null);
    setStyleArticleOptions([]);
    setSelectedSizeArticle(null);
  };

  useEffect(() => {
    if (!props.isModalOpen) return;

    if (
      props.rowData?.data?.min_stock !== null &&
      props.rowData?.data?.min_stock !== undefined
    ) {
      setMinValue(props.rowData.data.min_stock);
    } else {
      setMinValue(null);
    }

    const {
      style_distribution,
      size_distribution,
    } = parseMinDistributionFromRow(props.rowData?.data);
    setSelectedStyleType(style_distribution?.distribution_type || "same_min");
    setSelectedSizeType(size_distribution?.distribution_type || "same_min");
    const savedStyleUnitsMap =
      style_distribution?.x_units_per_article ||
      props.rowData?.data?.x_units_per_article ||
      {};
    setStyleUnitsData(savedStyleUnitsMap);

    // Restore scalar Units field from the saved map (all entries share the same value)
    const savedStyleUnitValues = Object.values(savedStyleUnitsMap);
    const restoredStyleUnits =
      savedStyleUnitValues.length > 0 &&
      savedStyleUnitValues.every((v) => v === savedStyleUnitValues[0])
        ? String(savedStyleUnitValues[0])
        : "";
    setStyleUnitsPerArticle(
      style_distribution?.distribution_type === "x_units_per_article"
        ? restoredStyleUnits
        : ""
    );

    const savedSizeUnitsMap =
      size_distribution?.x_units_per_size ||
      props.rowData?.data?.x_units_per_size ||
      {};
    setSizeSelectionData(savedSizeUnitsMap);

    // Restore scalar Units + selected sizes from the saved map
    const savedSizeEntries = Object.entries(savedSizeUnitsMap);
    const restoredSizeValues = savedSizeEntries.map(([size]) => size);
    const savedSizeUnitValues = savedSizeEntries.map(([, v]) => v);
    const restoredSizeUnits =
      savedSizeUnitValues.length > 0 &&
      savedSizeUnitValues.every((v) => v === savedSizeUnitValues[0])
        ? String(savedSizeUnitValues[0])
        : "";

    if (size_distribution?.distribution_type === "x_units_per_size") {
      setSizeUnitsPerSize(restoredSizeUnits);
      setSelectedSizeOptions(restoredSizeValues.map(toSizeSelectOption));
      selectedSizeValuesRef.current = restoredSizeValues;
      setSizeFieldsTouched(restoredSizeValues.length > 0);
    } else {
      setSizeUnitsPerSize("");
      setSelectedSizeOptions([]);
      selectedSizeValuesRef.current = [];
      setSizeFieldsTouched(false);
    }

    setSizeGroups({ alpha: [], numeric: [] });
    resetPreviewState();
    resetStyleStrategy();

    const sizeType = size_distribution?.distribution_type || "same_min";
    (async () => {
      const fetched = await fetchStyleDistributionStrategy();
      if (sizeType === "x_units_per_size") {
        await fetchSizeOptions({ options: fetched.options });
      }
    })();
  }, [props.rowData, props.isModalOpen]);

  const fetchStyleDistributionStrategy = async () => {
    const payload = buildStyleMinDistributionPayload(getParentRow());
    if (isEmpty(payload)) {
      resetStyleStrategy();
      return { tableName: null, options: [] };
    }
    try {
      const response = await getStyleDistributionStrategy(payload);
      if (!handleApiResponse(response)) {
        resetStyleStrategy();
        return { tableName: null, options: [] };
      }
      const strategyData = response?.data?.data || response?.data;
      const tableName = extractStyleTableName(response?.data);
      const options = extractStyleArticleOptions(strategyData);
      setStyleTempTable(tableName);
      setStyleArticleOptions(options);
      setSelectedSizeArticle((current) => {
        const currentArticle = current || selectedSizeArticleRef.current;
        const match = options.find(
          (item) => String(item.article) === String(currentArticle)
        );
        if (match) return match.article;
        return currentArticle || options[0]?.article || null;
      });
      return { tableName, options };
    } catch (error) {
      handleErrorMessage(error, props);
      resetStyleStrategy();
      return { tableName: null, options: [] };
    }
  };

  const fetchSizeOptions = async ({
    options = styleArticleOptions,
    article: articleOverride,
  } = {}) => {
    let articleOptions = options;
    if (!articleOptions.length) {
      const fetched = await fetchStyleDistributionStrategy();
      articleOptions = fetched.options || [];
    }
    const article =
      articleOverride ||
      selectedSizeArticleRef.current ||
      selectedSizeArticle ||
      articleOptions[0]?.article;
    if (!article) {
      setSizeGroups({ alpha: [], numeric: [] });
      return [];
    }
    try {
      const { groups } = await fetchSizeDistributionStrategyForArticle(article);
      setSizeGroups(groups);
      return flattenSizeGroups(groups);
    } catch (error) {
      handleErrorMessage(error, props);
      setSizeGroups({ alpha: [], numeric: [] });
      return [];
    }
  };

  /** Style preview for one article — cached; used for x_units_per_size cap and size preview min. */
  const resolveSizeArticleMin = async (
    articleOverride,
    { styleType = selectedStyleType, styleUnits = styleUnitsPerArticle } = {}
  ) => {
    if (isMinInvalid) return null;

    let styleTableName = styleTempTable;
    let options = styleArticleOptions;
    if (!styleTableName || !options.length) {
      const fetched = await fetchStyleDistributionStrategy();
      styleTableName = fetched.tableName;
      options = fetched.options || [];
    }
    if (!styleTableName) return null;

    const article =
      articleOverride ||
      selectedSizeArticleRef.current ||
      selectedSizeArticle ||
      options[0]?.article;
    if (!article) return null;

    const cacheKey = `${article}|${styleType}|${minValue}|${
      styleType === "x_units_per_article" ? styleUnits : ""
    }`;
    const cache = sizeArticleMinCacheRef.current;
    if (cache.key === cacheKey && cache.min != null) {
      setSizeArticleMin(cache.min);
      return cache.min;
    }

    const payload = {
      distribution_type: styleType,
      table_name: styleTableName,
      min: Number(minValue),
      article,
    };
    if (styleType === "x_units_per_article") {
      payload.x_units_per_article = buildXUnitsPerArticle({
        articles: options.map((item) => item.article),
        units: styleUnits,
        existing: styleUnitsData,
      });
    }

    try {
      const response = await calculateStylePreview(payload);
      if (!handleApiResponse(response)) {
        invalidateSizeArticleMin();
        return null;
      }
      const resolvedMin =
        extractArticleMinFromStylePreview(
          response?.data?.data || response?.data,
          article
        ) ?? Number(minValue);
      sizeArticleMinCacheRef.current = { key: cacheKey, min: resolvedMin };
      setSizeArticleMin(resolvedMin);
      return resolvedMin;
    } catch (error) {
      handleErrorMessage(error, props);
      invalidateSizeArticleMin();
      return null;
    }
  };

  const closeModal = () => {
    props.setIsModalOpen(false);
    setMinValue(null);
    setSelectedStyleType("same_min");
    setSelectedSizeType("same_min");
    setSizeSelectionData({});
    setStyleUnitsData({});
    setStyleUnitsPerArticle("");
    resetPreviewState();
    resetStyleStrategy();
    resetSizeUnitsFields();
  };

  const loadStylePreview = async (distributionType, unitsOverride) => {
    if (isMinInvalid) {
      showInvalidMin();
      return;
    }
    let tableName = styleTempTable;
    let articles = styleArticles;
    if (!tableName) {
      setStylePreviewLoader(true);
      const fetched = await fetchStyleDistributionStrategy();
      tableName = fetched.tableName;
      articles = (fetched.options || []).map((item) => item.article);
      if (!tableName) {
        setStylePreviewLoader(false);
        displaySnackMessages(
          "Style distribution data is not available.",
          "error",
          props,
          true
        );
        return;
      }
    }
    const units =
      unitsOverride !== undefined && unitsOverride !== null
        ? unitsOverride
        : styleUnitsPerArticle;
    if (
      distributionType === "x_units_per_article" &&
      (units === "" || Number(units) < 1)
    ) {
      showInvalidStyleUnits();
      return;
    }
    if (
      distributionType === "x_units_per_article" &&
      isOverCap(units, styleUnitsCap)
    ) {
      showUnitsOverCap(styleUnitsCapHelperText);
      return;
    }

    const xUnitsPerArticle = buildXUnitsPerArticle({
      articles,
      units,
      existing: styleUnitsData,
    });
    setStyleUnitsData(xUnitsPerArticle);

    const payload = {
      distribution_type: distributionType,
      table_name: tableName,
      min: Number(minValue),
    };
    if (distributionType === "x_units_per_article") {
      payload.x_units_per_article = xUnitsPerArticle;
    }

    try {
      setStylePreviewLoader(true);
      setShowStylePreview(true);
      const response = await calculateStylePreview(payload);
      if (!handleApiResponse(response)) {
        setStylePreviewRows([]);
        setShowStylePreview(false);
        return;
      }
      setStylePreviewRows(
        normalizeStylePreviewRows(response?.data?.data || response?.data)
      );
      if (distributionType === "x_units_per_article") {
        lastPreviewedStyleUnitsRef.current = Number(units);
      }
    } catch (error) {
      handleErrorMessage(error, props);
      setShowStylePreview(false);
    } finally {
      setStylePreviewLoader(false);
    }
  };

  const handleStyleTypeChange = (value) => {
    setSelectedStyleType(value);
    if (value === "x_units_per_article") {
      setStyleUnitsPerArticle("");
      lastPreviewedStyleUnitsRef.current = null;
      setShowStylePreview(false);
      setStylePreviewRows([]);
      return;
    }
    if (showStylePreview) {
      loadStylePreview(value);
    } else {
      setStylePreviewRows([]);
    }
    if (showSizePreview) {
      loadSizePreview({ styleType: value });
    }
  };

  const handleStyleUnitsChange = (e) => {
    // Allow users to enter values greater than min; validate on save/preview instead.
    setStyleUnitsPerArticle(e.target.value);
  };

  const handleStyleUnitsBlur = (e) => {
    const value = e.target.value;
    if (value === "" || Number(value) < 1) {
      return;
    }
    const nextUnits = value;
    setStyleUnitsPerArticle(nextUnits);
    if (
      selectedStyleType === "x_units_per_article" &&
      Number(nextUnits) !== lastPreviewedStyleUnitsRef.current &&
      showStylePreview
    ) {
      loadStylePreview(selectedStyleType, nextUnits);
      if (showSizePreview) {
        loadSizePreview({ units: nextUnits });
      }
    }
    if (selectedSizeType === "x_units_per_size") {
      invalidateSizeArticleMin();
      void resolveSizeArticleMin();
    }
  };

  const handleStylePreviewToggle = async () => {
    if (showStylePreview) {
      setShowStylePreview(false);
      return;
    }
    if (selectedStyleType === "x_units_per_article" && isStyleUnitsInvalid) {
      showInvalidStyleUnits();
      return;
    }
    await loadStylePreview(selectedStyleType);
  };

  const loadSizePreview = async ({
    article: articleOverride,
    distributionType = selectedSizeType,
    styleType = selectedStyleType,
    units = styleUnitsPerArticle,
    xUnitsPerSize,
    sizeUnits = sizeUnitsPerSize,
    sizeValues = selectedSizeValues,
  } = {}) => {
    if (isMinInvalid) {
      showInvalidMin();
      return;
    }

    const nextXUnits =
      xUnitsPerSize ||
      (distributionType === "x_units_per_size"
        ? buildXUnitsPerSize({ sizes: sizeValues, units: sizeUnits })
        : sizeSelectionData);
    if (distributionType === "x_units_per_size") {
      const hasSizes = Object.values(nextXUnits || {}).some(
        (value) => Number(value) > 0
      );
      if (sizeUnits === "" || Number(sizeUnits) < 1 || !hasSizes) {
        showInvalidSizeUnits();
        return;
      }
      const unitsCapBase =
        distributionType === "x_units_per_size" ? sizeArticleMin : minCap;
      if (
        isOverCap(
          sizeUnits,
          buildUnitsCap((sizeValues || []).length, unitsCapBase)
        )
      ) {
        showUnitsOverCap(sizeUnitsCapHelperText);
        return;
      }
      setSizeSelectionData(nextXUnits);
    }

    setSizePreviewLoader(true);
    setShowSizePreview(true);
    const requestId = ++sizePreviewRequestIdRef.current;

    try {
      let styleTableName = styleTempTable;
      let articles = styleArticles;
      let options = styleArticleOptions;
      if (!styleTableName || !options.length) {
        const fetched = await fetchStyleDistributionStrategy();
        styleTableName = fetched.tableName;
        options = fetched.options;
        articles = (options || []).map((item) => item.article);
      }

      const article =
        articleOverride ||
        selectedSizeArticleRef.current ||
        selectedSizeArticle ||
        options[0]?.article ||
        articles[0];
      if (!article) {
        displaySnackMessages(
          "Style Color ID is not available.",
          "error",
          props,
          true
        );
        setShowSizePreview(false);
        return;
      }
      selectedSizeArticleRef.current = article;
      setSelectedSizeArticle(article);

      const { sizeTableName, groups } =
        await fetchSizeDistributionStrategyForArticle(article);
      if (flattenSizeGroups(groups).length) {
        setSizeGroups(groups);
      }
      if (!sizeTableName) {
        displaySnackMessages(
          "Size distribution data is not available.",
          "error",
          props,
          true
        );
        return;
      }

      let articleMin = Number(minValue);
      if (styleTableName) {
        const resolved = await resolveSizeArticleMin(article, {
          styleType,
          styleUnits: units,
        });
        if (resolved == null) {
          setSizePreviewRows([]);
          setSizePreviewSizes([]);
          setShowSizePreview(false);
          return;
        }
        articleMin = resolved;
      }

      const previewPayload = {
        distribution_type: distributionType,
        table_name: sizeTableName,
        min: articleMin,
      };
      if (distributionType === "x_units_per_size") {
        previewPayload.x_units_per_size = nextXUnits || {};
      }

      const previewResponse = await calculateSizePreview(previewPayload);
      
      if (requestId !== sizePreviewRequestIdRef.current) {
        return;
      }
      if (!handleApiResponse(previewResponse)) {
        setSizePreviewRows([]);
        setSizePreviewSizes([]);
        setShowSizePreview(false);
        return;
      }
      const { rows, sizes } = normalizeSizePreviewRows(
        previewResponse?.data?.data || previewResponse?.data
      );
      setSizePreviewRows(
        rows.map((row) => ({
          ...row,
          key: `${distributionType}-${article}-${row.key}`,
        }))
      );
      setSizePreviewSizes(sizes);
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      setSizePreviewLoader(false);
    }
  };

  const handleSizeTypeChange = (value) => {
    setSelectedSizeType(value);
    const article = selectedSizeArticleRef.current;
    ignoreArticleChangeRef.current = true;
    if (value === "x_units_per_size") {
      setSizeUnitsPerSize("");
      setSelectedSizeOptions([]);
      selectedSizeValuesRef.current = [];
      lastPreviewedSizeSelectionRef.current = "";
      setSizeFieldsTouched(false);
      setSizeSelectionData({});
      setShowSizePreview(false);
      setSizePreviewRows([]);
      fetchSizeOptions({ article });
      window.setTimeout(() => {
        ignoreArticleChangeRef.current = false;
      }, 300);
      return;
    }
    if (showSizePreview) {
      loadSizePreview({ distributionType: value, article }).finally(() => {
        window.setTimeout(() => {
          ignoreArticleChangeRef.current = false;
        }, 300);
      });
      return;
    }
    ignoreArticleChangeRef.current = false;
  };

  const applySizeSelection = (sizeValues, units) => {
    const nextXUnits = buildXUnitsPerSize({
      sizes: sizeValues,
      units,
    });
    setSizeSelectionData(nextXUnits);
    return nextXUnits;
  };

  const commitSizePreview = () => {
    const values = selectedSizeValuesRef.current;
    const units = sizeUnitsPerSize;
    const selectionKey = `${units}|${[...values].sort().join("|")}`;
    if (selectionKey === lastPreviewedSizeSelectionRef.current) {
      return;
    }
    lastPreviewedSizeSelectionRef.current = selectionKey;
    setSizeFieldsTouched(true);
    if (!values.length || units === "" || Number(units) < 1) {
      setSizeSelectionData(buildXUnitsPerSize({ sizes: values, units }));
      setShowSizePreview(false);
      return;
    }
    const nextXUnits = applySizeSelection(values, units);
    if (showSizePreview) {
      loadSizePreview({
        xUnitsPerSize: nextXUnits,
        sizeValues: values,
        sizeUnits: units,
      });
    }
  };

  const handleSizeUnitsChange = (e) => {
    // Allow entering units greater than min; validation happens on preview/save.
    setSizeUnitsPerSize(e.target.value);
  };

  const handleSizeUnitsBlur = (e) => {
    const value = e.target.value;
    setSizeFieldsTouched(true);
    if (value === "" || Number(value) < 1) {
      return;
    }
    const nextUnits = value;
    setSizeUnitsPerSize(nextUnits);
    if (selectedSizeValues.length && showSizePreview) {
      const nextXUnits = applySizeSelection(selectedSizeValues, nextUnits);
      loadSizePreview({
        xUnitsPerSize: nextXUnits,
        sizeUnits: nextUnits,
        sizeValues: selectedSizeValues,
      });
    }
  };

  const handleSelectedSizesChange = updateSelectedSizeOptions;

  const handleSizeArticleChange = (article) => {
    if (ignoreArticleChangeRef.current) {
      return;
    }
    if (
      !article ||
      String(article) === String(selectedSizeArticleRef.current)
    ) {
      return;
    }
    selectedSizeArticleRef.current = article;
    setSelectedSizeArticle(article);
    if (showSizePreview) {
      loadSizePreview({ article });
      return;
    }
    if (selectedSizeType === "x_units_per_size") {
      void resolveSizeArticleMin(article);
      void fetchSizeOptions({ article });
    }
  };

  const handleSizePreviewToggle = async () => {
    if (showSizePreview) {
      setShowSizePreview(false);
      return;
    }
    if (selectedSizeType === "x_units_per_size" && isXUnitsPerSizeInvalid) {
      showInvalidSizeUnits();
      return;
    }
    await loadSizePreview();
  };

  const handleMinChange = (e) => {
    setMinValue(e.target.value);
    resetPreviewState();
  };

  useEffect(() => {
    if (!props.isModalOpen || selectedSizeType !== "x_units_per_size") return;
    if (isMinInvalid) {
      invalidateSizeArticleMin();
      return;
    }
    void resolveSizeArticleMin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isModalOpen, selectedSizeType, minValue, selectedStyleType]);

  const handleSave = async () => {
    if (isMinInvalid) {
      showInvalidMin();
      return;
    }

    const clonedXunits =
      selectedSizeType === "x_units_per_size"
        ? buildXUnitsPerSize({
            sizes: selectedSizeValues,
            units: sizeUnitsPerSize,
          })
        : {};
    const clonedStyleUnits =
      selectedStyleType === "x_units_per_article"
        ? buildXUnitsPerArticle({
            articles: (styleArticleOptions || []).map((it) => it.article),
            units: styleUnitsPerArticle,
            existing: styleUnitsData,
          })
        : {};
    const nextRowFields = {
      ...props.rowData?.data,
      min_stock: Number(minValue),
      x_units_per_size: clonedXunits,
      x_units_per_article: clonedStyleUnits,
      style_distribution: {
        distribution_type: selectedStyleType,
        x_units_per_article: clonedStyleUnits,
      },
      size_distribution: {
        distribution_type: selectedSizeType,
        x_units_per_size: clonedXunits,
      },
    };
    const displayValue = formatMinDistributionDisplayValue(nextRowFields);
    const newData = {
      ...nextRowFields,
      min_distribution: displayValue,
    };
    const node = props.rowData?.node;
    if (node) {
      node.setData({ ...node.data, ...newData });
    }
    if (props.handleMinDistributionSave) {
      props.handleMinDistributionSave(props.rowData, newData);
    } else if (props.addDataToEditableState) {
      props.addDataToEditableState(props.rowData, newData);
    }
    closeModal();
  };

  return {
    minValue,
    isMinInvalid,
    styleUnitsCap,
    styleUnitsCapHelperText,
    sizeUnitsCap,
    sizeUnitsCapHelperText,
    isStyleUnitsOverCap,
    isSizeUnitsOverCap,
    selectedStyleType,
    selectedSizeType,
    styleUnitsPerArticle,
    showStylePreview,
    stylePreviewRows,
    stylePreviewLoader,
    showSizePreview,
    sizePreviewLoader,
    selectedSizeArticle,
    sizePreviewRows,
    sizePreviewSizes,
    sizeUnitsPerSize,
    selectedSizeValues,
    selectedSizeOptions,
    setSelectedSizeOptions: updateSelectedSizeOptions,
    sizeSelectOptions,
    sizeSelectOpen,
    setSizeSelectOpen,
    sizeSelectAll,
    setSizeSelectAll,
    sizeFieldsTouched,
    isSizeUnitsInvalid,
    isStyleUnitsInvalid,
    styleArticleOptions,
    closeModal,
    handleMinChange,
    handleSave,
    handleStyleTypeChange,
    handleStylePreviewToggle,
    handleStyleUnitsChange,
    handleStyleUnitsBlur,
    handleSizeTypeChange,
    handleSizePreviewToggle,
    handleSizeUnitsChange,
    handleSizeUnitsBlur,
    handleSelectedSizesChange,
    commitSizePreview,
    handleSizeArticleChange,
  };
};
