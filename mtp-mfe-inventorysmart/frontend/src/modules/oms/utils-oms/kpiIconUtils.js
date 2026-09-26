import React from "react";

// Import 3D KPI Icons from assets
import ISStyle from "assets/IS_icons/IS_styles_AP1.svg";
import ISStore from "assets/IS_icons/IS_stores_S01.svg";
import ISPT2 from "assets/IS_icons/IS_PT2.svg";
import ISPT1 from "assets/IS_icons/IS_PT1.svg";
import ISConForcastDemand from "assets/IS_icons/IS_DM1.svg";
import ISUnConForcast from "assets/IS_icons/IS_FC1.svg";
import ISVIRRemaining from "assets/IS_icons/IS_RV1.svg";
import ISIOB from "assets/IS_icons/IS_EX1.svg";
import ISAllocatedQntBySize from "assets/IS_icons/IS_ST1.svg";
import ISNetDcAvailable from "assets/IS_icons/IS_WH3.svg";
import ISAvgUnitPerStore from "assets/IS_icons/IS_PR1.svg";
import ISStoreGradeAllocatedQty from "assets/IS_icons/IS_SG1.svg";
import ISStoreGradeAllocatedQuantity from "assets/IS_icons/IS_SG2.svg";
import ISTotalTransfers from "assets/IS_icons/IS_TT1.svg";
import ISTotalUnits from "assets/IS_icons/IS_TU1.svg";
import ISSourceStores from "assets/IS_icons/IS_SS1.svg";
import ISDestinationStores from "assets/IS_icons/IS_DS1.svg";
import ISTransferValue from "assets/IS_icons/IS_TV1.svg";
import ISLostRevenue from "assets/IS_icons/CS1.svg";
import ISLostUnits from "assets/IS_icons/PR2.svg";
import ISAllocations from "assets/IS_icons/IS_AC2.svg";
import ISAllocations1 from "assets/IS_icons/IS_AC1.svg";

// Icon codes for label-based mapping
import ISOH1 from "assets/IS_icons/IS_OH1.svg";
import ISOH2 from "assets/IS_icons/OH2.svg";
import ISDS2 from "assets/IS_icons/DS2.svg";
import ISCL1 from "assets/IS_icons/CL1.svg";
import ISCL2 from "assets/IS_icons/CL2.svg";
import ISWS1 from "assets/IS_icons/IS_WS1.svg";
import ISWS2 from "assets/IS_icons/IS_WS2.svg";
import ISOI1 from "assets/IS_icons/IS_OI1.svg";
import ISSL1 from "assets/IS_icons/SL1.svg";
import ISDR1 from "assets/IS_icons/DR1.svg";
import ISSO1 from "assets/IS_icons/SO1.svg";
import ISOR2 from "assets/IS_icons/OR2.svg";
import ISOR1 from "assets/IS_icons/OR1.svg";
import ISWH1 from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import ISWH2 from "assets/IS_icons/IS_WH2.svg";
import ISWH4 from "assets/IS_icons/IS_dc_availableWH4.svg";
import ISST3 from "assets/IS_icons/IS_allocated_qntST3.svg";
import ISSK1 from "assets/IS_icons/IS_SK1.svg";
import ISSO2 from "assets/IS_icons/IS_store_per_styleS02.svg";
import ISCS2 from "assets/IS_icons/CS2.svg";
import ISSL2 from "assets/IS_icons/SL2.svg";
import ISPO1 from "assets/IS_icons/PO1.svg";
import ISTM1 from "assets/IS_icons/TM1.svg";
import ISCO1 from "assets/IS_icons/CO1.svg";
import OMSFC1 from "assets/IS_icons/OMS_FC1.svg";
import OMSCS1 from "assets/IS_icons/OMS_CS1.svg";

/**
 * Get KPI Icon Component for OMS Decision Dashboard
 * @param {string} iconType - The icon type/code from config
 * @param {number} index - Index for unique key generation
 * @returns {JSX.Element} - The SVG icon component
 */
export const getKPIIconComponent = (iconType, index = 0) => {
  const iconMap = {
    // Semantic icon types
    style: <ISStyle key={`icon-${index}`} />,
    store: <ISStore key={`icon-${index}`} />,

    // Icon codes (short codes for config)
    OH1: <ISOH1 key={`icon-${index}`} />,
    OH2: <ISOH2 key={`icon-${index}`} />,
    DS2: <ISDS2 key={`icon-${index}`} />,
    CL1: <ISCL1 key={`icon-${index}`} />,
    CL2: <ISCL2 key={`icon-${index}`} />,
    WS1: <ISWS1 key={`icon-${index}`} />,
    WS2: <ISWS2 key={`icon-${index}`} />,
    OI1: <ISOI1 key={`icon-${index}`} />,
    PT1: <ISPT1 key={`icon-${index}`} />,
    PT2: <ISPT2 key={`icon-${index}`} />,
    ST1: <ISAllocatedQntBySize key={`icon-${index}`} />,
    ST3: <ISST3 key={`icon-${index}`} />,
    WH1: <ISWH1 key={`icon-${index}`} />,
    WH2: <ISWH2 key={`icon-${index}`} />,
    WH3: <ISNetDcAvailable key={`icon-${index}`} />,
    WH4: <ISWH4 key={`icon-${index}`} />,
    RV1: <ISVIRRemaining key={`icon-${index}`} />,
    AC1: <ISAllocations1 key={`icon-${index}`} />,
    AC2: <ISAllocations key={`icon-${index}`} />,
    SL1: <ISSL1 key={`icon-${index}`} />,
    DR1: <ISDR1 key={`icon-${index}`} />,
    SO1: <ISSO1 key={`icon-${index}`} />,
    SO2: <ISSO2 key={`icon-${index}`} />,
    OR2: <ISOR2 key={`icon-${index}`} />,
    OR1: <ISOR1 key={`icon-${index}`} />,
    SK1: <ISSK1 key={`icon-${index}`} />,
    CS2: <ISCS2 key={`icon-${index}`} />,
    SL2: <ISSL2 key={`icon-${index}`} />,
    PO1: <ISPO1 key={`icon-${index}`} />,
    FC1: <ISUnConForcast key={`icon-${index}`} />,
    DM1: <ISConForcastDemand key={`icon-${index}`} />,
    EX1: <ISIOB key={`icon-${index}`} />,
    PR1: <ISAvgUnitPerStore key={`icon-${index}`} />,
    SG1: <ISStoreGradeAllocatedQty key={`icon-${index}`} />,
    SG2: <ISStoreGradeAllocatedQuantity key={`icon-${index}`} />,
    TT1: <ISTotalTransfers key={`icon-${index}`} />,
    TU1: <ISTotalUnits key={`icon-${index}`} />,
    SS1: <ISSourceStores key={`icon-${index}`} />,
    DS1: <ISDestinationStores key={`icon-${index}`} />,
    TV1: <ISTransferValue key={`icon-${index}`} />,
    CS1: <ISLostRevenue key={`icon-${index}`} />,
    PR2: <ISLostUnits key={`icon-${index}`} />,
    TM1: <ISTM1 key={`icon-${index}`} />,
    CO1: <ISCO1 key={`icon-${index}`} />,
    OMS_FC1: <OMSFC1 key={`icon-${index}`} />,
    OMS_CS1: <OMSCS1 key={`icon-${index}`} />,
  };

  // Return the mapped icon or default to style icon
  if (iconType && iconMap[iconType]) {
    return iconMap[iconType];
  }
  return iconMap["style"];
};

export default getKPIIconComponent;
