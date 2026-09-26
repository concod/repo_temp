import React, { useEffect, useMemo, useState } from "react";
import { AccordionModern, Panel } from "impact-ui-v3";
import { useInfoPanelStyles } from "./infoPanelStyles";

const InfoPanel = ({
  isOpen,
  onClose,
  title = "",
  subtitle = "",
  sections = [],
}) => {
  const classes = useInfoPanelStyles();
  const [expanded, setExpanded] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setExpanded([]);
    }
  }, [isOpen]);

  const handleClose = () => {
    setExpanded([]);
    if (onClose) onClose();
  };

  const accordionData = useMemo(
    () =>
      (sections || []).map((section, index) => {
        const sectionId = section.id || section.title || String(index);
        const items = section.items || [];
        return {
          id: sectionId,
          value: sectionId,
          header: section.title,
          content: (
            <div className={classes.sectionBody}>
              {items.map((item, itemIndex) => (
                <div
                  key={`${sectionId}-${item.term || itemIndex}`}
                  className={classes.item}
                >
                  <span className={classes.itemTerm}>{item.term}</span>
                  {item.definition ? (
                    <span className={classes.itemDefinition}>
                      {item.definition}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ),
        };
      }),
    [sections, classes]
  );

  return (
    <Panel
      title={title}
      size="large"
      anchor="right"
      width={644}
      onClose={handleClose}
      open={Boolean(isOpen)}
    >
      <div className={classes.body}>
        {subtitle ? <p className={classes.subtitle}>{subtitle}</p> : null}
        <div className={classes.sectionList}>
          <AccordionModern
            data={accordionData}
            isMultiExpanded
            expanded={expanded}
            onChange={(activeAccordion) => {
              setExpanded((prev) =>
                prev.includes(activeAccordion)
                  ? prev.filter((val) => val !== activeAccordion)
                  : [...prev, activeAccordion]
              );
            }}
            setExpanded={(activeAccordion) => {
              if (Array.isArray(activeAccordion)) {
                setExpanded(activeAccordion);
              }
            }}
          />
        </div>
      </div>
    </Panel>
  );
};

export default InfoPanel;
