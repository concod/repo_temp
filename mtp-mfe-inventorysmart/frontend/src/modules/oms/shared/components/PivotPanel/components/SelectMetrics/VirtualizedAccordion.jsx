// PORTED FROM: pages/PlanningScreen/components/PivotPanel/components/SelectMetrics/VirtualizedAccordion.jsx
// Verbatim copy -- no Redux dependencies

import React, { memo } from "react";
import { Accordion } from "impact-ui-v3";
import PropTypes from "prop-types";

const VirtualizedAccordion = memo(({ 
  data, 
  expanded, 
  setExpanded, 
  itemHeight = 80,
  containerHeight = 600,
  overscan = 3
}) => {
  return (
    <div
      style={{
        maxHeight: containerHeight,
        overflow: "auto"
      }}
    >
      <div>
          {data.map((item) => {
            const isExpanded = expanded.includes(item.value);

            return (
              <Accordion
                key={item.value}
                data={[item]}
                expanded={isExpanded ? [item.value] : []}
                setExpanded={(newExpanded) => {
                  setExpanded(prev => {
                    if (isExpanded) {
                      return prev.filter(val => val !== item.value);
                    } else {
                      return [...prev, item.value];
                    }
                  });
                }}
                isMultiExpanded={true}
              />
            );
          })}
      </div>
    </div>
  );
});

VirtualizedAccordion.displayName = "VirtualizedAccordion";

VirtualizedAccordion.propTypes = {
  data: PropTypes.array.isRequired,
  expanded: PropTypes.array.isRequired,
  setExpanded: PropTypes.func.isRequired,
  itemHeight: PropTypes.number,
  containerHeight: PropTypes.number
};

export default VirtualizedAccordion;
