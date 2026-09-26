import React, { useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import GenericCardsPanel from "../../KPI/GenericCardPanel";
import { getKPIIconComponent } from "../../../utils-inventorysmart/utilityFunctions";

const InStockKpiCards = ({ kpiData, viewType = 'article' }) => {
  const [panelData, setPanelData] = useState(null);

  useEffect(() => {
    if (!isEmpty(kpiData)) {
      const formatValue = (value) => {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? "0" : numValue.toFixed(2);
      };
      
      const panelData = {
        noSubMetrics: true,
        expandedLayout: "center",
        panelHeader: "KPIs",
        cardData: [
          {
            label: "Instock OH Percentage",
            value: formatValue(kpiData.instock_oh_percentage),
            units: "%",
            renderIcon: () => getKPIIconComponent("ST1", 0),
          },
          {
            label: "Instock OH IT Percentage",
            value: formatValue(kpiData.instock_oh_it_percentage),
            units: "%",
            renderIcon: () => getKPIIconComponent("ST1", 1),
          },
          {
            label: "Instock OH Percentage LY",
            value: formatValue(kpiData.instock_oh_percentage_ly),
            units: "%",
            renderIcon: () => getKPIIconComponent("ST2", 2),
          },
          {
            label: "Instock OH IT Percentage LY",
            value: formatValue(kpiData.instock_oh_it_percentage_ly),
            units: "%",
            renderIcon: () => getKPIIconComponent("ST2", 3),
          }
        ]
      };
      
      
      setPanelData(panelData);
    } else {
      setPanelData(null);
    }
  }, [kpiData, viewType]);

  if (!panelData) return null;

  return <GenericCardsPanel panelData={panelData} />;
};

export default InStockKpiCards; 