import React, { useState, useEffect } from 'react';
import { isEmpty } from 'lodash';
import { connect } from 'react-redux';
import GenericCardsPanel from "../../KPI/GenericCardPanel";
import { NEW_STORE_TRACKING_MODULE } from "../CustomHooks/moduleConstants";
import { getKPIIconComponent } from "../../../utils-inventorysmart/utilityFunctions";

const NewStoresTrackingKpiCards = (props) => {
  const { kpiData } = props;
  const KPI_CONFIG = props.moduleConfig?.[NEW_STORE_TRACKING_MODULE]?.new_store_kpi_config || [];
  const [panelData, setPanelData] = useState(null);
  
  const render3DIcons =  props.moduleConfig?.[NEW_STORE_TRACKING_MODULE]?.render3DIcons ?? false;
  
  useEffect(() => {
    if (!isEmpty(kpiData)) {
      const formatValue = (value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return "0";
        return Number.isInteger(numValue) ? numValue.toLocaleString() : numValue.toFixed(2);
      };
      
      const cardData = KPI_CONFIG.map((config, index) => {
        if (kpiData[config.key] !== undefined) {
          const card = {
            label: config.label,
            value: config.format ? formatValue(kpiData[config.key]) : kpiData[config.key],
            units: config.units
          };
          
          if (config.percentageDifferenceKey && kpiData[config.percentageDifferenceKey] != null) {
            card.percentageDifference = `${kpiData[config.percentageDifferenceKey]}% ${config.percentageDifferenceSuffix}`;
          }
          
          if (render3DIcons && config.iconType) {
            card.renderIcon = () => getKPIIconComponent(config.iconType, index);
          }
          
          return card;
        }
        return null;
      }).filter(Boolean);
      
      const panelData = {
        noSubMetrics: true,
        expandedLayout: "center",
        panelHeader: "",
        cardData
      };
      
      setPanelData(panelData);
    } else {
      setPanelData(null);
    }
  }, [kpiData]);

  const noDataContainerStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    width: "100%",
    minHeight: "200px",
    backgroundColor: "#ffffff",
    marginTop: "24px",
    marginBottom: "24px"
  };

  if (!panelData) {
    return (
      <div style={noDataContainerStyle}>
        <p>No KPI data available</p>
      </div>
    );
  }

  return <GenericCardsPanel panelData={panelData} />;
};

const mapStateToProps = (store) => {
  return {
  moduleConfig: store.inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    };
};
export default connect(mapStateToProps,null)(NewStoresTrackingKpiCards);
