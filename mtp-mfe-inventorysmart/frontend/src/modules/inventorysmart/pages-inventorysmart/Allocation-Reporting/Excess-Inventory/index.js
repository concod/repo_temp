import React from "react";
import ExcessInventoryFilters from "./excess-inventory-filters";
import ExcessInventoryReportTable from "./excess-inventory-report";


const ExcessInventoryComponent = (props) => {
  
  return (
    <div>
      <ExcessInventoryFilters>
        <ExcessInventoryReportTable />
      </ExcessInventoryFilters>
    </div>
  );
};



export default ExcessInventoryComponent;
