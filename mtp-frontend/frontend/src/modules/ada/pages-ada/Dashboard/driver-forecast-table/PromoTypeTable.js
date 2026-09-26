import { getPromoTypeColumns } from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import {
  chartDataPayload,
  columnLabelHandler,
  getPromoPayload,
  isNumber,
  weekEndDateLabel,
} from "modules/ada/utils-ada/utilityFunctions";
import React, { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useHistoricPromoTypeData } from "./useHistoricPromoTypeTable";
import { makeStyles } from "@mui/styles";
import { cloneDeep } from "lodash";

import DiallogUpdateValue from "./DiallogUpdateValue";

// Driver forecast Dropdown component
const PromoTypeTable = (props, ref) => {
  const classes = useStyles();
  const {
    showPrevious,
    activeKey,
    setDriverForecastLoader,
    showIAData,
    allowEdit,
    promoTypeRowData,
    initialPromoTypeRowData,
    onDriverForecastValueChange,
  } = props;

  let {
    promoTypeTableInstance,
    allDriverForecastRef,
    bottomGrid,
    topGrid,
    lastSelectedPromoType,
    currentSelectedPromoType,
    promoTypeColumnDataRef,
  } = ref;
  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const { historicPromoTypeTableColumnData = [] } = useHistoricPromoTypeData(
    showIAData,
    setDriverForecastLoader
  );

  const [columnData, setColumnData] = useState([]);
  const [showDialog, setShowDialog] = useState({
    isOpen: false,
    currentWeek: null,
    selected: null,
  });

  useEffect(() => {
    if (!activeKey) return;
    const payload = chartDataPayload(adaReducer);

    const fetchColumnData = async () => {
      try {
        setDriverForecastLoader((prevState) => prevState + 1);
        let allPromoFactors =
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.promoTypes;
        const promoPayload = getPromoPayload(
          payload,
          showIAData,
          adaReducer,
          allPromoFactors
        );
        let response = await getPromoTypeColumns(promoPayload);
        const isWeekEndDateLabelEnabled =
          adaReducer?.clientConfig?.attribute_value?.show_features
            ?.is_week_end_date_label_enabled;

        let showWeekEndDateLabelEnabled =
          isWeekEndDateLabelEnabled &&
          adaReducer?.switchTimeLine?.[0]?.value === "W";

        let updatedFormattedResponse = response?.data?.data.map((el, i) => {
          if (i === 0) {
            return { ...el, is_sortable: false, is_searchable: false };
          }
          if (i === 1) {
            return {
              ...el,
              is_lockable: false,
              disabled: !allowEdit,
              is_sortable: false,
              is_searchable: false,
              type: "list",
              extra: { ...el.extra, options: allPromoFactors },
            };
          }

          return {
            ...el,
            is_lockable: false,
            disabled: !allowEdit,
            is_sortable: false,
            is_searchable: false,
            // label: showWeekEndDateLabelEnabled
            //   ? weekEndDateLabel(el.label, adaReducer)
            //   : `F${adaReducer?.switchTimeLine?.[0]?.value}-${el.label}`,
            label: columnLabelHandler(
              el.label,
              adaReducer,
              showWeekEndDateLabelEnabled
            ),
          };
        });

        const formattedResponse = agGridColumnFormatter(
          updatedFormattedResponse
        );

        promoTypeColumnDataRef.current = formattedResponse;

        setColumnData(formattedResponse);
        props?.setUploadTemplateHeaders(formattedResponse);
      } catch (error) {
        // errorHandler(dispatch, error);
      } finally {
        setDriverForecastLoader((prevState) => prevState - 1);
      }
    };

    fetchColumnData();
  }, [activeKey]);

  const loadTableInstance = (params) => {
    promoTypeTableInstance.current = params;
  };

  const rowClassRules = useMemo(() => {
    return {
      [classes.referenceRow]: (params) => {
        return showPrevious;
      },
    };
  }, [classes.referenceRow, showPrevious]);

  const onPromoTypeChange = async (e, row, column) => {
    // Bug in core component : sending option for dropdown as Object but getting string value
    // Temporary fix - setting cell value again as object
    // to be fixed by Inventory/Core team, then 133 - 141 can be removed

    let rowNode = promoTypeTableInstance.current.api.getRowNode("promo_type");

    let newColId = column?.colId;
    let colData = row[newColId];

    if (!colData) {
      return;
    }
    if (typeof colData === "string") {
      let allPromoFactors =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.promoTypes;
      colData = allPromoFactors?.find(({ value }) => value === colData);
      rowNode.setDataValue(newColId, colData);
    }

    if (
      currentSelectedPromoType?.current?.hasOwnProperty(newColId) &&
      currentSelectedPromoType?.current?.[newColId]?.value === colData.value
    ) {
      return;
    }

    setShowDialog({ isOpen: true, currentWeek: newColId, selected: colData });
    lastSelectedPromoType.current = cloneDeep(
      currentSelectedPromoType.current || {}
    );
    currentSelectedPromoType.current = {
      ...(currentSelectedPromoType.current || {}),
      [newColId]: colData,
    };
  };

  const columnDataHandler = () => {
    return [
      columnData?.[0],
      columnData?.[1],
      ...historicPromoTypeTableColumnData,
      ...(columnData.slice(2) || []),
    ]?.filter((el) => el);
  };

  const onClose = (isApplyClicked, currentWeek) => {
    if (!isApplyClicked) {
      let colId = showDialog.currentWeek;
      let rowNode = promoTypeTableInstance.current.api.getRowNode("promo_type");
      let allPromoFactors =
        adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
          ?.promoTypes;
      let selected =
        lastSelectedPromoType?.current?.[colId] || allPromoFactors?.[0];

      rowNode.setDataValue(colId, selected);
      currentSelectedPromoType.current = {
        ...(currentSelectedPromoType.current || {}),
        [colId]: selected,
      };
      setShowDialog({ isOpen: false, currentWeek: null, selected: null });
    } else {
      if (currentWeek === "overall_value") return;
      let promoTypeRowNode = promoTypeTableInstance.current.api.getRowNode(
        "promo_type"
      );
      let rowNode = allDriverForecastRef.current.api.getRowNode("value");
      let currVal = null;

      for (let [key, value] of Object.entries(promoTypeRowNode.data || {})) {
        // Proceed if elem is a valid number & is not a cell of historic data
        let isForwardLookingWeek = promoTypeColumnDataRef?.current?.find(
          ({ column_name }) => {
            return column_name === key;
          }
        );

        const predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks;

        if (isForwardLookingWeek) {
          if (
            (isNumber(key) || predictedFiscalWeeks?.includes(key)) &&
            currVal &&
            value.value !== currVal.value
          ) {
            promoTypeRowNode.setDataValue("overall_value", null);
            promoTypeTableInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
            });
            rowNode.setDataValue("overall_value", "-");

            return;
          }

          if (isNumber(key) || predictedFiscalWeeks?.includes(key)) {
            currVal = value;
          }
        }
      }

      promoTypeRowNode.setDataValue("overall_value", currVal);
      promoTypeTableInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });

      let selectedRowNode = allDriverForecastRef.current.api.getRowNode(
        currVal.value
      );

      let valueRowNode = allDriverForecastRef.current.api.getRowNode("value");

      valueRowNode.setDataValue(
        "overall_value",
        selectedRowNode?.data?.overall_value
      );
    }
  };

  return (
    <div
      className={classes.total}
      style={{
        height: adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_promo_type
          ? 84
          : 42,

        display:
          !adaReducer?.clientConfig?.attribute_value?.show_features
            ?.show_promo_type && "none",
      }}
    >
      <AgGridComponent
        loadTableInstance={loadTableInstance}
        uniqueRowId="row"
        pagination={false}
        sizeColumnsToFitFlag
        minWidth={200}
        rowdata={showPrevious ? initialPromoTypeRowData : promoTypeRowData}
        columns={columnDataHandler()}
        rowClassRules={rowClassRules}
        onBlur={onPromoTypeChange}
        tableRef={bottomGrid}
        alignedGrids={topGrid.current ? [topGrid.current] : undefined}
        showColumnPanel={false}
      />
      <DiallogUpdateValue
        showDialog={showDialog.isOpen}
        selected={showDialog.selected}
        currentWeek={showDialog.currentWeek}
        setShowDialog={setShowDialog}
        onClose={onClose}
        currentSelectedPromoType={currentSelectedPromoType}
        onDriverForecastValueChange={onDriverForecastValueChange}
        ref={{
          allDriverForecastRef,
        }}
      />
    </div>
  );
};

export default forwardRef(PromoTypeTable);

const useStyles = makeStyles((theme) => ({
  referenceRow: {
    pointerEvents: "none",
    background: "rgb(217, 219, 222, 0.5)!important",
  },
  total: {
    flex: "none",
    "& .ag-root-wrapper": {
      borderTop: "none",
      height: "84px",
    },
  },
}));
