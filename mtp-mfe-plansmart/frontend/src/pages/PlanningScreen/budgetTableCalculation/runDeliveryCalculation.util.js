import findIntersection from "./common/findIntersection.util";
import getValueByColumnKeyUtil from "./common/getValueByColumnKey.util";
import { get } from "lodash";
import { delvrData, writtenRollDownMapping } from "../apis/budgetTable.data";
import executeFormulaUtil from "./common/executeFormula.util";
import updateRowData from "./common/updateRowData.util";
import runEdibilityFlowUtil from "./common/runEditibilityFlow.util";
import {
  FORECAST,
  DELIVERED,
  NONDELIVERED,
  WEIAGE,
  RATIO,
  OUTAGE,
  NONDELIVEREDRATIO,
  NON_DELIVERED_DOLLARS,
  RETAIL_CONVERSION_ADJUSTMENT
} from "./budgetTableCalculation.constant";

const calculateValueByRatio = (ratio, writtenValue) => {
  return ratio * writtenValue;
};

const calculateNewDeliveryValueByRatio = (ratio, writtenRowData) => {
  let value = 0;
  Object.keys(ratio).forEach((week) => {
    value = value + calculateValueByRatio(ratio[week], writtenRowData[week]);
  });

  return value;
};

const calculateNewWgtAgeValue = (
  ratio,
  writtenRowData,
  ndSalesRatio,
  nonDeliveredSales
) => {
  let value = 0;

  Object.keys(ratio).forEach((week) => {
    const wgtAgeValue =
      ratio[week] *
      (calculateValueByRatio(ndSalesRatio[week], writtenRowData[week]) /
        nonDeliveredSales);
    value = value + wgtAgeValue;
  });

  return value;
};

function getRowDataByKpi(kpi, rowObj) {
  const searchValuesByColumnKey = getValueByColumnKeyUtil(
    this.valueByColumnValueKey,
    rowObj
  );

  const [kpiRowInx] = findIntersection.call(this, this.rowDataInxMapping, [
    kpi,
    ...searchValuesByColumnKey
  ]);

  return [this.rowData[kpiRowInx], kpiRowInx];
}

async function runCalculation({
  futureDeliveryColumnId,
  writtenKpiRowData,
  ratio,
  deliveryKpiRowInx,
  deliveryType,
  rollDownRowInx,
  dependentRatio,
  kpiFlow
}) {
  let calculatedValue;

  if (deliveryType === WEIAGE) {
    const [nonDeliveredSales] = getRowDataByKpi.call(
      this,
      NON_DELIVERED_DOLLARS, // check if deliveryMetrics?.writtenKpi works here
      this.rowData[rollDownRowInx]
    );

    calculatedValue = calculateNewWgtAgeValue(
      ratio,
      writtenKpiRowData,
      dependentRatio,
      nonDeliveredSales[futureDeliveryColumnId]
    );
  } else {
    calculatedValue = calculateNewDeliveryValueByRatio(
      ratio,
      writtenKpiRowData
    );
  }

  if (deliveryType === DELIVERED) {
    const [adjustmentFactor] = getRowDataByKpi.call(
      this,
      RETAIL_CONVERSION_ADJUSTMENT, // check if deliveryMetrics?.writtenKpi works here
      this.rowData[rollDownRowInx]
    );

    updateRowData.call(this, {
      rowInx: deliveryKpiRowInx,
      key: futureDeliveryColumnId,
      value: calculateValueByRatio(
        calculatedValue,
        adjustmentFactor[futureDeliveryColumnId]
      )
    });
  } else {
    updateRowData.call(this, {
      rowInx: deliveryKpiRowInx,
      key: futureDeliveryColumnId,
      value: calculatedValue
    });
  }

  runEdibilityFlowUtil.call(this, {
    rollDownQueue: [
      {
        rowInx: deliveryKpiRowInx,
        colId: futureDeliveryColumnId,
        changedCellData: {},
        isChannelEligible: true
      }
    ],
    kpiFlow,
    isDeliveryCalculation: true
  });
}

async function runKpiFlow({
  rollDownObj,
  kpiFlowList,
  leastLevelProductHierarchy,
  ratioKey = "",
  dependentRatioKey = "",
  updateRollDownQueue = false
}) {
  const rollDownColumnId = rollDownObj?.colId;
  const rollDownRowInx = rollDownObj?.rowInx;
  const rollDownRowData = this.rowData[rollDownRowInx];

  const futureDeliveryWeekList = this.writtenRollDownMapping[rollDownColumnId];
  const process = [];

  kpiFlowList.forEach(async (kpiFlow) => {
    const writtenKpi = kpiFlow?.deliveryMetrics?.parentKpi;
    const deliveryKpi = kpiFlow.kpi;
    const [writtenKpiRowData] = getRowDataByKpi.call(
      this,
      writtenKpi,
      rollDownRowData
    );
    const [deliveryKpiRowData, deliveryKpiRowInx] = getRowDataByKpi.call(
      this,
      deliveryKpi,
      rollDownRowData
    );

    const lastWeekId =
      futureDeliveryWeekList[futureDeliveryWeekList.length - 1];

    futureDeliveryWeekList.forEach((futureDeliveryColumnId) => {
      // uncomment when EOH and BOH is enabled

      // Update rollDownQueue to have the latest updated week
      // to calculate EOH/BOH
      // if (updateRollDownQueue && futureDeliveryColumnId === lastWeekId) {
      //   this.rollDownQueue = [
      //     {
      //       rowInx: rollDownRowInx,
      //       colId: futureDeliveryColumnId,
      //       changedCellData: {
      //         before_user_entered_value: 0,
      //         user_entered_value: writtenKpiRowData[futureDeliveryColumnId],
      //       },
      //       isChannelEligible: true,
      //     },
      //   ];
      // }

      // change delvrData to this.deliveryData
      const deliveryDetails = get(this.deliveryData, [
        futureDeliveryColumnId,
        writtenKpiRowData[leastLevelProductHierarchy]
      ]);

      if (deliveryDetails && Object.keys(deliveryDetails).length > 0) {
        process.push(
          runCalculation.call(this, {
            futureDeliveryColumnId,
            writtenKpiRowData,
            deliveryKpiRowInx,
            ratio: deliveryDetails[ratioKey],
            deliveryType: kpiFlow?.deliveryMetrics?.type,
            rollDownRowInx: rollDownRowInx,
            dependentRatio: deliveryDetails[dependentRatioKey],
            kpiFlow
          })
        );
      }
    });
  });
  await Promise.all(process);
}

export default async function ({ rollDownQueue }) {
  const forecastedDeliveryKpiFlow = [];
  const deliveredKpiFlow = [];
  const nonDeliveredKpiFlow = [];
  const weiAgeKpiFlow = [];
  const leastLevelProductHierarchy = this.valueByColumnValueKey[
    this.valueByColumnValueKey.length - 1
  ];

  const process = [];

  this.changedKpiDependentFlow.forEach((kpiFlow) => {
    if (kpiFlow?.deliveryMetrics?.isDelivery) {
      if (kpiFlow?.deliveryMetrics.type === FORECAST) {
        forecastedDeliveryKpiFlow.push(kpiFlow);
      } else if (kpiFlow?.deliveryMetrics.type === DELIVERED) {
        deliveredKpiFlow.push(kpiFlow);
      } else if (kpiFlow?.deliveryMetrics.type === NONDELIVERED) {
        nonDeliveredKpiFlow.push(kpiFlow);
      } else if (kpiFlow?.deliveryMetrics.type === WEIAGE) {
        weiAgeKpiFlow.push(kpiFlow);
      }
    }
  });

  for (
    let timeRollDownInx = 0;
    timeRollDownInx < rollDownQueue.length;
    timeRollDownInx++
  ) {
    const rollDownObj = rollDownQueue[timeRollDownInx];

    process.push(
      runKpiFlow.call(this, {
        rollDownObj,
        kpiFlowList: forecastedDeliveryKpiFlow,
        leastLevelProductHierarchy,
        ratioKey: RATIO
      }),
      runKpiFlow.call(this, {
        rollDownObj,
        kpiFlowList: nonDeliveredKpiFlow,
        leastLevelProductHierarchy,
        ratioKey: NONDELIVEREDRATIO
      }),
      runKpiFlow.call(this, {
        rollDownObj,
        kpiFlowList: deliveredKpiFlow,
        leastLevelProductHierarchy,
        ratioKey: RATIO
      }),
      runKpiFlow.call(this, {
        rollDownObj,
        kpiFlowList: weiAgeKpiFlow,
        leastLevelProductHierarchy,
        ratioKey: OUTAGE,
        dependentRatioKey: NONDELIVEREDRATIO,
        updateRollDownQueue: true
      })
    );
  }

  await Promise.all(process);
}
