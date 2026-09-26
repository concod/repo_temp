import globalStyles from "core/Styles/globalStyles";
import { AccordionModern } from "impact-ui-v3";
import React, { useEffect, useState } from "react";

const CustomGroupAccordion = ({
  children,
  onExpandChange,
}) => {
  const globalClasses = globalStyles();
  const [accordionData, setAccordionData] = useState([]);
  const [activeAccordion, setActiveAccordion] = useState("");


const prepareAccordionData = () => {
  const data = [];
  React.Children.toArray(children).forEach((child, index) => {
    data.push({
      id: index + 1,
      header: child.props.accordionName,
      content: child,
      value: child.props.accordionValue || child.props.accordionName,
      childCount: child.props.accordionChildCount,
    });
  });
  setAccordionData(data);
};

useEffect(() => {
  prepareAccordionData();
}, [children]);

  return (
    <div className={globalClasses.accordianWrapper}>
      <AccordionModern
        data={accordionData}
        expanded={activeAccordion}
        setExpanded={(val) => {
          setActiveAccordion(val);
          onExpandChange?.(val);
        }}
      />
    </div>
  );
};


export default CustomGroupAccordion;
