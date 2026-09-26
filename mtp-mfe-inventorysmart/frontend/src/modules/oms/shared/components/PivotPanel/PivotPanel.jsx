import DottedDrag from "../../../../../assets/dottedDrag.svg";
import DimDottedDrag from "../../../../../assets/dimDottedDrag.svg";
import { Badge as DimensionCard } from "impact-ui-v3";
import { get, isEmpty } from "lodash";
import SaveViewManagementModal from "../../ViewManagement/components/SaveViewManagement/SaveViewManagementModal";
import { useMemo, useState } from "react";
import LoadMeter from "./components/LoadMeter/LoadMeter";
import { useSelector, useDispatch } from "react-redux";
import {
  selectActiveViewDetail,
  selectActiveView,
  setIsValidView,
  resetActiveView,
  setActiveViewDetails,
} from "../../ViewManagement/slices/viewManagement.slice";
import { clearCellsLockUnlockStatus } from "../../../pages-oms/OrderManagement/slices/edit.slice";
import RenderDimension from "./components/RenderDimension/RenderDimension";
import "./PivotPanel.scss";
import {
  getPivotPayload,
  pivotTableApplyButtonDisabled,
  handlePivotPanelClose,
  resetPivotPanelOnApply,
  hasPayloadChanged,
  isPivotPayloadDirty,
  validateDimensions,
  getLastPayloadAttributes,
  getCurrentPayloadAttributes,
} from "./pivotPanel.util";

import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Collapse, IconButton } from "@mui/material";
import { Checkbox, Button, Alert } from "impact-ui-v3";
import {
  GRAND_TOTAL_HEADER,
  GRAND_TOTAL_LABEL,
  TOTALS_AND_VALUES_SECTION,
} from "./pivotPanel.constants";

import {
  selectIsPivotPanelOpen,
  selectPivotDescriptionData,
  selectPivotPayload,
  selectAddedVersionDetails,
  selectSelectedIds,
  setIsPivotPanelOpen,
  setPivotHideAttributes,
  setPivotAttributeValue,
  setTempViewDetails,
} from "../../../pages-oms/OrderManagement/slices/pivot.slice";
import { selectCalculationUUID } from "../../../pages-oms/OrderManagement/slices/edit.slice";

import { usePivotDescriptionData } from "./hooks/usePivotDescriptionData";
import { usePivotPanelViewSync } from "./hooks/usePivotPanelViewSync";
import { usePivotHost } from "../../pivot/PivotHostContext";
import {
  saveViewStateToBackend,
  consumeViewSavedFlag,
  resetExpansionState,
  resetExpansionStateWithoutPause,
} from "../../ViewManagement/viewState.util";

const PivotPanel = ({ tableRef }) => {
  const {
    selectedScreenViewName: hostSelectedScreenViewName,
    screenId,
    pivotDataService
  } = usePivotHost();

  const dispatch = useDispatch();

  const isPivotPanelOpen = useSelector(selectIsPivotPanelOpen);
  const pivotDescriptionData = useSelector(selectPivotDescriptionData);
  const pivotPayload = useSelector(selectPivotPayload);
  const addedVersionDetails = useSelector(selectAddedVersionDetails);
  const selectedIds = useSelector(selectSelectedIds);
  // Calculated fields (variance / contribution) are not used in OMS — pass an
  // empty default so getPivotPayload still builds a valid payload shape.
  const calculatedFieldsSelection = { variance: [], contribution: [] };
  const activeView = useSelector(selectActiveView);
  const calculationUUID = useSelector(selectCalculationUUID);

  const dimension_options = pivotDescriptionData?.dimension_options || [];
  const { attribute_values = {} } = pivotDescriptionData || {};

  const pivotRows = get(pivotPayload, "pivot_rows", []);
  const pivotColumns = get(pivotPayload, "pivot_columns", []);
  const selectedPivotAttributes = [...pivotRows, ...pivotColumns].flat();

  const activeViewDetail = useSelector(selectActiveViewDetail);

  const [measuresOpen, setMeasuresOpen] = useState(false);
  const [draggedKpi, setDraggedKpi] = useState({});
  const [groupedKpiList, setGroupedKpiList] = useState([]);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [totalsSectionExpanded, setTotalsSectionExpanded] = useState(false);
  const [isGrandtotalEnabled, setIsGrandtotalEnabled] = useState(
    activeViewDetail?.view_details?.isGrandtotalEnabled || false
  );

  const effectiveScreenViewName = hostSelectedScreenViewName;

  const handleApplyPivot = async ({
    rowDimensions,
    columnDimensions,
    addedVersionDetails: addedVers,
    calculatedFieldsSelection: calcSel,
    selectedIds: selIds,
    isGrandtotalEnabled: grandEnabled,
  }) => {
    const lastPayloadSelectedPivotAttributes = getLastPayloadAttributes(
      pivotPayload
    );
    const payload = getPivotPayload(
      rowDimensions,
      columnDimensions,
      addedVers,
      calcSel,
      selIds,
      grandEnabled
    );
    const currentPayloadSelectedPivotAttributes = getCurrentPayloadAttributes(
      payload
    );

    if (
      hasPayloadChanged(
        lastPayloadSelectedPivotAttributes,
        currentPayloadSelectedPivotAttributes
      ) ||
      JSON.stringify(payload.kpis) !== JSON.stringify(pivotPayload.kpis)
    ) {
      dispatch(clearCellsLockUnlockStatus());
    }

    const [, tableDataResponse, locked_pkey_list] = await Promise.all([
      pivotDataService.fetchKpiConfig(),
      pivotDataService.fetchPivotTableData({
        payload,
        calculationUUID,
        selectedScreenViewName: effectiveScreenViewName,
      }),
    ]);

    pivotDataService.applyPivotTableSuccess({
      tableData: tableDataResponse,
      lockedPkeyList: locked_pkey_list
    });

    resetPivotPanelOnApply(
      dispatch,
      { setPivotHideAttributes, setPivotAttributeValue },
      attribute_values
    );
  };

  usePivotDescriptionData();

  const {
    rowDimensions,
    setRowDimensions,
    columnDimensions,
    setColumnDimensions,
    draggableDimensions,
    setDraggableDimensions,
    viewDetails,
    savedViewSnapshot,
    setActiveViewId
  } = usePivotPanelViewSync({
    handleApplyPivot,
    pivotPayload,
    selectedPivotAttributes
  });

  const onDragStart = (evt, dim) => {
    evt.dataTransfer.setData("text/plain", JSON.stringify(dim));
  };

  const renderFieldDimension = () => (
    <div className="fieldContainer">
      {dimension_options.map((dim) => (
        <DimensionCard
          key={dim.value}
          draggable={!draggableDimensions.includes(dim.value)}
          disabled={draggableDimensions.includes(dim.value)}
          onDragStart={(e) => onDragStart(e, dim)}
          isIcon={true}
          icon={
            draggableDimensions.includes(dim.value) ? (
              <DimDottedDrag />
            ) : (
              <DottedDrag />
            )
          }
          size="small"
          variant="stroke"
          iconPlacement="left"
          id={dim.label}
          color="info"
          label={dim.label}
        />
      ))}
    </div>
  );

  const applyDisabled = pivotTableApplyButtonDisabled(
    selectedIds,
    rowDimensions,
    columnDimensions
  );

  const pivotChanged = useMemo(() => {
    if (applyDisabled) return false;
    const currentBuiltPayload = getPivotPayload(
      rowDimensions,
      columnDimensions,
      addedVersionDetails,
      calculatedFieldsSelection,
      selectedIds,
      isGrandtotalEnabled
    );
    return isPivotPayloadDirty(currentBuiltPayload, pivotPayload);
    // `applyDisabled` is intentionally omitted from deps: it is derived from
    // selectedIds/rowDimensions/columnDimensions (already listed) but is not
    // memoized itself, so including it would defeat memoization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rowDimensions,
    columnDimensions,
    addedVersionDetails,
    calculatedFieldsSelection,
    selectedIds,
    isGrandtotalEnabled,
    pivotPayload
  ]);

  const kpiCount = useMemo(() => {
    return Array.isArray(selectedIds) ? selectedIds.length : 0;
  }, [selectedIds]);

  const loadMeterVolume = useMemo(() => {
    if (applyDisabled) {
      return 0;
    }

    const attributeValues = get(pivotDescriptionData, "attribute_values", {});

    const getAxisCount = (dimensions) => {
      if (!Array.isArray(dimensions)) {
        return 0;
      }

      return dimensions.reduce((acc, dim) => {
        const dimKey = get(dim, "value", null);
        if (!dimKey) {
          return acc;
        }

        if (dimKey === "measures") {
          return acc + Math.max(0, kpiCount);
        }

        const selected = Array.isArray(dim?.selectedDimension)
          ? dim.selectedDimension
          : [];

        const dimAttrValues = attributeValues?.[dimKey] || {};
        const selectedCount = selected.reduce((attrAcc, attr) => {
          const attrKey = get(attr, "value", null);
          if (!attrKey) {
            return attrAcc;
          }

          const members = dimAttrValues?.[attrKey];
          return attrAcc + (Array.isArray(members) ? members.length : 0);
        }, 0);

        return acc + selectedCount;
      }, 0);
    };

    const rowAxisCount = getAxisCount(rowDimensions);
    const columnAxisCount = getAxisCount(columnDimensions);

    return rowAxisCount * columnAxisCount;
  }, [
    applyDisabled,
    pivotDescriptionData,
    rowDimensions,
    columnDimensions,
    kpiCount
  ]);

  const handleClosePivot = () => dispatch(setIsPivotPanelOpen(false));

  const handleSaveViewClick = () => {
    setIsSaveViewModalOpen(true);
  };

  const handleApplyClick = () => {
    if (!pivotChanged) {
      return;
    }
    const isValid = validateDimensions({ pivotDescriptionData, viewDetails });
    dispatch(setIsValidView(isValid));

    const tempViewDetails = {
      columnDimensions,
      rowDimensions,
      kpiWiseRows: rowDimensions.some((d) => d.value === "measures"),
      calculatedFieldsSelection,
      isGrandtotalEnabled
    };

    if (pivotDescriptionData?.enable_view_state_persistence) {
      saveViewStateToBackend(dispatch);
    }
    if (consumeViewSavedFlag()) {
      resetExpansionStateWithoutPause();
    } else {
      resetExpansionState();
    }

    if (!isEmpty(activeView) && savedViewSnapshot) {
      if (JSON.stringify(tempViewDetails) !== JSON.stringify(savedViewSnapshot)) {
        dispatch(resetActiveView());
        // resetActiveView() only clears `activeView`; the stale activeViewDetails.view_id
        // would otherwise survive into usePivotPanelViewSync's first effect, which
        // dispatches setActiveViewDetails(...activeViewDetail) on the next dim/KPI edit
        // and preserves the old view_id, causing the second effect to auto-apply without
        // the user clicking Apply. Null view_id explicitly here to break that loop.
        //
        // We intentionally PRESERVE view_details (not full-clear like
        // ViewListItemActions.applySelectedView does), because handleApplyPivot below
        // dispatches getKpiConfigV2, which reads activeViewDetails.view_details to
        // derive the `location` filter. ViewListItemActions can full-clear safely
        // because it follows up with getViewDetails to re-hydrate before any KPI fetch.
        dispatch(
          setActiveViewDetails({
            ...activeViewDetail,
            view_id: null
          })
        );
        setActiveViewId(null);
      }
    }
    dispatch(setTempViewDetails(tempViewDetails));
    handleApplyPivot({
      rowDimensions,
      columnDimensions,
      addedVersionDetails,
      calculatedFieldsSelection,
      selectedIds,
      isGrandtotalEnabled
    });
    dispatch(setIsPivotPanelOpen(false));
  };

  return (
    <>
      {isPivotPanelOpen ? (
        <aside
          className="pivotPanelInline planningScreenPivotPane"
          aria-label="View management"
        >
          <div className="pivotPanelInline__header">
            <h2 className="pivotPanelInline__title">View management</h2>
            <IconButton
              size="small"
              aria-label="Close view management"
              onClick={handleClosePivot}
              className="pivotPanelInline__close"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </div>
          <div className="pivotPanelInline__body">
            <h2 className="panelHeading">
              Choose Dimensions to add to table
              <span className="panelSubHeading">
                (Drag and drop dimensions below)
              </span>
            </h2>
            {renderFieldDimension()}
            <div className="dropZoneContainer">
              <RenderDimension
                axis="rows"
                dimensions={rowDimensions}
                measuresOpen={measuresOpen}
                setMeasuresOpen={setMeasuresOpen}
                draggedKpi={draggedKpi}
                setDraggedKpi={setDraggedKpi}
                groupedKpiList={groupedKpiList}
                setGroupedKpiList={setGroupedKpiList}
                draggableDimensions={draggableDimensions}
                setDraggableDimensions={setDraggableDimensions}
                rowDimensions={rowDimensions}
                setRowDimensions={setRowDimensions}
                columnDimensions={columnDimensions}
                setColumnDimensions={setColumnDimensions}
              />
              <RenderDimension
                axis="columns"
                dimensions={columnDimensions}
                measuresOpen={measuresOpen}
                setMeasuresOpen={setMeasuresOpen}
                draggedKpi={draggedKpi}
                setDraggedKpi={setDraggedKpi}
                groupedKpiList={groupedKpiList}
                setGroupedKpiList={setGroupedKpiList}
                draggableDimensions={draggableDimensions}
                setDraggableDimensions={setDraggableDimensions}
                rowDimensions={rowDimensions}
                setRowDimensions={setRowDimensions}
                columnDimensions={columnDimensions}
                setColumnDimensions={setColumnDimensions}
              />
            </div>
            {/* <div className="pivotTotalsSection">
              <button
                type="button"
                className="pivotTotalsSection__summary"
                id="pivot-totals-section-trigger"
                aria-expanded={totalsSectionExpanded}
                aria-controls="pivot-totals-section-panel"
                onClick={() => setTotalsSectionExpanded((o) => !o)}
              >
                <ExpandMoreIcon
                  className={
                    totalsSectionExpanded
                      ? "pivotTotalsSection__chevron pivotTotalsSection__chevron--open"
                      : "pivotTotalsSection__chevron"
                  }
                  fontSize="small"
                  aria-hidden
                />
                <span className="pivotTotalsSection__summaryText">
                  {TOTALS_AND_VALUES_SECTION}
                </span>
              </button>
              <Collapse in={totalsSectionExpanded}>
                <div
                  className="pivotTotalsSection__content"
                  id="pivot-totals-section-panel"
                  role="region"
                  aria-labelledby="pivot-totals-section-trigger"
                >
                  <label className="panelHeading pivotTotalsSection__grandHeading">
                    {GRAND_TOTAL_HEADER}
                    <div>
                      <Checkbox
                        onChange={(e) =>
                          setIsGrandtotalEnabled(e.target.checked)
                        }
                        id="grandTotal"
                        label={GRAND_TOTAL_LABEL}
                        checked={isGrandtotalEnabled}
                      />
                    </div>
                  </label>
                </div>
              </Collapse>
            </div> */}
            {selectedIds.length === 0 && (
              <div className="metric-alert-container">
                <Alert
                  severity="info"
                  title="At least one measure is required to display data."
                  subtleBackground={true}
                />
              </div>
            )}
          </div>
          <div className="pivotPanelInline__footer">
            <div className="pivotPanelInline__footerRow">
              {/* <LoadMeter isDisabled={applyDisabled} volume={loadMeterVolume} /> */}
              <div className="pivotPanelInline__footerActions">
                <Button
                  variant="secondary"
                  size="medium"
                  onClick={handleSaveViewClick}
                  disabled={applyDisabled}
                >
                  Save & apply
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleApplyClick}
                  disabled={applyDisabled || !pivotChanged}
                >
                  Apply
                </Button>
              </div>
            </div>
            <p className="pivotPanelInline__footerHint">
              * Save pivot configurations
            </p>
          </div>
        </aside>
      ) : null}

      <SaveViewManagementModal
        screenId={screenId}
        isModalOpen={isSaveViewModalOpen}
        setIsModalOpen={setIsSaveViewModalOpen}
        isGrandtotalEnabled={isGrandtotalEnabled}
      />
    </>
  );
};

export default PivotPanel;
