import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { Tooltip, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getProductSizeView,
  setPackConfigurations,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getIgnoreAllocationCode } from "../../../Create-Allocation/helperFunctions";
import useScrollIntoViewOnOpen from "../../utils/useScrollIntoViewOnOpen";
import useRefreshSignal from "../../utils/useRefreshSignal";
import { finalizeAllocationContext } from "../../index";
import ProductStoreView from "./ProductStoreView";
import ProductSizeView from "./ProductSizeView";
import PackSizePanel from "./PackSizePanel";
import IconClose from "assets/impactv3/icon-close.svg";
import IconOpenNew from "assets/impactv3/icon-open-new.svg";
import IconExpand from "assets/impactv3/icon-expand.svg";
import IconCollapse from "assets/impactv3/icon-collapse.svg";
import { useProductExpansionStyles } from "./productViewStyles";
import {
  VIEW_BY_STORE,
  VIEW_BY_SIZE,
  KPI_BORDER_COLORS,
  KPI_FIELDS,
  DC_KPI_COLLAPSED_COUNT,
} from "./constants";

const chunkDcRows = (items, size) => {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
};

const ProductExpansionPanel = ({
  selectedArticle,
  displayArticle,
  onClose,
  isEditMode = false,
  productEditActive = false,
  onChildEditActiveChange,
  onBreakdown,
  // Redux props
  allocationCode,
  originalAllocationCode,
  planStatus,
  planType,
  isV3,
  productViewRefreshToken,
  getProductSizeView: fetchSizeView,
  addSnack: showSnack,
  clearPackConfigurations,
}) => {
  const classes = useProductExpansionStyles();
  const { t } = useTranslation();
  const { editSchema } = useContext(finalizeAllocationContext) || {};
  const dataMode = isEditMode ? (editSchema ? "edit" : null) : "view";

  const [packPanelOpen, setPackPanelOpen] = useState(false);
  const [activeView, setActiveView] = useState(VIEW_BY_STORE);
  const [dcExpanded, setDcExpanded] = useState(false);

  // Clear cached pack configurations and reset view tab whenever the article
  // changes so the next size-view open fetches fresh data for the new article.
  useEffect(() => {
    clearPackConfigurations();
    setActiveView(VIEW_BY_STORE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticle]);

  // The panel's own dc_dict fetch and whichever breakdown table is mounted
  // each own a flag. Sharing one would let the first to finish lift the
  // overlay while the other still has stale — or missing — data on screen.
  const [dcLoading, setDcLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const panelLoading = dcLoading || breakdownLoading;

  // DC KPI data from the size-view response
  const [dcData, setDcData] = useState([]);
  const [sizeRows, setSizeRows] = useState(null);
  const [sizeTableConfig, setSizeTableConfig] = useState(null);

  const latestArticleRef = useRef(null);
  const tableSectionRef = useScrollIntoViewOnOpen(
    `${selectedArticle}-${activeView}`
  );

  const buildPayload = () => ({
    allocation_code: allocationCode,
    article: selectedArticle || displayArticle,
    ignore_allocation_code: getIgnoreAllocationCode(
      originalAllocationCode,
      allocationCode
    ),
    plan_status: planStatus,
    plan_type: planType || "",
  });

  const fetchSizeViewData = async ({ isRefresh = false } = {}) => {
    const requestedArticle = selectedArticle;
    latestArticleRef.current = requestedArticle;
    setDcLoading(true);
    if (!isRefresh) {
      setDcExpanded(false);
    }
    setDcData([]);
    setSizeRows(null);
    setSizeTableConfig(null);

    const payload = buildPayload();
    const isV3Store = isV3?.includes("productStoreDetails");

    try {
      const res = await fetchSizeView(payload, isV3Store);
      if (latestArticleRef.current !== requestedArticle) return;
      if (res?.data?.status) {
        const resData = res.data.data;
        setDcData(resData.dc_dict || []);
        setSizeTableConfig(resData.table_config || []);
        setSizeRows(resData.table_data || []);
      }
    } catch (e) {
      if (latestArticleRef.current !== requestedArticle) return;
      const errObj = e?.response?.data;
      showSnack({
        message: errObj?.show_message ? errObj.message : ERROR_MESSAGE,
        options: { variant: "error", disableOnClose: true },
      });
    } finally {
      if (latestArticleRef.current === requestedArticle) {
        setDcLoading(false);
      }
    }
  };

  useEffect(() => {
    if (allocationCode && selectedArticle && dataMode) {
      fetchSizeViewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticle, allocationCode, dataMode]);

  // An edit anywhere in the product view re-derives dc_dict, so pull it again.
  useRefreshSignal(productViewRefreshToken, () => {
    if (allocationCode && selectedArticle) {
      fetchSizeViewData({ isRefresh: true });
    }
  });

  const handleBreakdown = (dcName) => {
    onBreakdown?.(dcName, sizeTableConfig, sizeRows);
  };

  const handleViewChange = (val) => {
    // Cover the swap: the incoming table mounts empty and fetches.
    setBreakdownLoading(true);
    setActiveView(val);
    clearPackConfigurations();
  };

  const showDcExpand = dcData.length > DC_KPI_COLLAPSED_COUNT;
  const visibleDcData = useMemo(() => {
    if (!showDcExpand || dcExpanded) return dcData;
    return dcData.slice(0, DC_KPI_COLLAPSED_COUNT);
  }, [dcData, dcExpanded, showDcExpand]);
  const dcRows = useMemo(
    () => chunkDcRows(visibleDcData, DC_KPI_COLLAPSED_COUNT),
    [visibleDcData]
  );
  const dcExpandLabel = dcExpanded
    ? t("inventorysmart.kpiCollapse")
    : t("inventorysmart.kpiExpand");

  const renderDcCard = (dc, halfWidth) => (
    <div
      key={dc.label}
      className={`${classes.dcCard}${halfWidth ? ` ${classes.dcCardHalf}` : ""}`}
    >
      <span className={classes.dcCardName}>{dc.label}</span>
      <div className={classes.dcCardMetrics}>
        {KPI_FIELDS.map((field) => (
          <div
            key={field.key}
            className={classes.legendItem}
            style={{ borderLeftColor: KPI_BORDER_COLORS[field.key] }}
          >
            <span className={classes.legendLabel}>{t(field.labelKey)}</span>
            <span className={classes.legendValue}>
              {dc[field.key]?.toLocaleString("en-US") ?? "-"}
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={classes.breakdownBtn}
        onClick={() => handleBreakdown(dc.label)}
      >
        <span className={classes.breakdownTextWrap}>
          <span className={classes.breakdownText}>
            {t("inventorysmart.finalize.recommendation.breakdown")}
          </span>
        </span>
        <span className={classes.breakdownIcon}>
          <IconOpenNew />
        </span>
      </button>
    </div>
  );

  return (
    <div className={classes.panel}>
      <Loader loader={panelLoading} minHeight="500px">
        <div className={classes.expansionRoot}>
          <div className={classes.breakdownSummary}>
            {/* Header bar */}
            <div className={classes.headerBar}>
              <span className={classes.headerTitle}>
                {t("inventorysmart.finalize.recommendation.dcInventoryOverview")}
              </span>
              <div className={classes.verticalDivider} />
              <div className={classes.headerArticleWrap}>
                <span className={classes.headerArticleLabel}>
                  {t("inventorysmart.finalize.recommendation.styleColorId")}:{" "}
                  <span>{displayArticle || selectedArticle || ""}</span>
                </span>
              </div>
              <button
                type="button"
                className={classes.headerBtn}
                onClick={() => setPackPanelOpen(true)}
              >
                {t("inventorysmart.finalize.recommendation.viewPackAndSizeDetails")}
              </button>
              <div className={classes.verticalDivider} />
              <button type="button" className={classes.closeBtn} onClick={onClose}>
                {t("inventorysmart.close")}
                <IconClose className={classes.iconSm} />
              </button>
            </div>

            {/* DC Inventory Overview strip — max 2 per row; expand for more */}
            {dcData.length > 0 && (
              <div className={classes.dcStrip}>
                {dcRows.map((row, rowIndex) => {
                  const isSingleInRow = row.length === 1;
                  return (
                    <div key={`dc-row-${rowIndex}`} className={classes.dcStripRow}>
                      {row.map((dc) => renderDcCard(dc, isSingleInRow))}
                      {rowIndex === 0 && showDcExpand && (
                        <Tooltip
                          title={dcExpandLabel}
                          orientation="top"
                          variant="tertiary"
                        >
                          <button
                            type="button"
                            className={classes.dcExpandBtn}
                            onClick={() => setDcExpanded((prev) => !prev)}
                            aria-label={dcExpandLabel}
                            aria-expanded={dcExpanded}
                          >
                            {dcExpanded ? (
                              <IconCollapse className={classes.dcExpandIcon} />
                            ) : (
                              <IconExpand className={classes.dcExpandIcon} />
                            )}
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={tableSectionRef} className={classes.tableSection}>
            {activeView === VIEW_BY_STORE && (
              <ProductStoreView
                selectedArticle={selectedArticle}
                displayArticle={displayArticle}
                activeView={activeView}
                onViewChange={handleViewChange}
                onLoadingChange={setBreakdownLoading}
                isEditMode={isEditMode}
                productEditActive={productEditActive}
                onChildEditActiveChange={onChildEditActiveChange}
              />
            )}
            {activeView === VIEW_BY_SIZE && (
              <ProductSizeView
                selectedArticle={selectedArticle}
                displayArticle={displayArticle}
                activeView={activeView}
                onViewChange={handleViewChange}
                onLoadingChange={setBreakdownLoading}
                isEditMode={isEditMode}
                productEditActive={productEditActive}
                onChildEditActiveChange={onChildEditActiveChange}
              />
            )}
          </div>
        </div>
      </Loader>

      {/* Pack & Size side panel */}
      <PackSizePanel
        isOpen={packPanelOpen}
        onClose={() => setPackPanelOpen(false)}
        selectedArticle={selectedArticle}
      />
    </div>
  );
};

const mapStateToProps = (store) => ({
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  originalAllocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .originalAllocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  isV3:
    store?.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig?.isV3,
  productViewRefreshToken:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .productViewRefreshToken,
});

const mapDispatchToProps = (dispatch) => ({
  getProductSizeView: (payload, isV3) =>
    dispatch(getProductSizeView(payload, isV3)),
  addSnack: (snack) => dispatch(addSnack(snack)),
  clearPackConfigurations: () => dispatch(setPackConfigurations(null)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductExpansionPanel);
