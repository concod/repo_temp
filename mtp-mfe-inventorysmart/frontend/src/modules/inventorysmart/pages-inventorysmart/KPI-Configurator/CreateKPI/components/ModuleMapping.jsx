import React, { useState } from "react";
import { Checkbox, Button, AccordionModern, Tooltip } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import "../../KPIConfigurator.css";

const ModuleMapping = ({ selectedItems, setSelectedItems, mapping }) => {
    const globalClasses = globalStyles();
    const [expanded, setExpanded] = useState([]);
    const [moduleExpanded, setModuleExpanded] = useState({});
    const getModules = () => {
        const modules = mapping?.filter(item => item?.components?.length > 1);
        const singleModules = mapping?.filter(item => item?.components?.length === 1);
        return { modules, singleModules };
    }
    const { modules, singleModules } = getModules();
    // Function to handle checkbox selection
    const handleCheckboxChange = (module, subModule, isChecked) => {
        if (setSelectedItems) {
            setSelectedItems(prev => {
                const moduleItems = prev[module] || [];
                if (isChecked) {
                    const newItems = [...moduleItems, subModule];
                    return {
                        ...prev,
                        [module]: newItems
                    };
                } else {
                    const newItems = moduleItems.filter(item => item !== subModule);
                    return {
                        ...prev,
                        [module]: newItems
                    };
                }
            });
        }
    };

    // Function to handle select all / deselect all
    const handleSelectAll = (module) => {
        if (setSelectedItems) {
            const moduleSubItems = module?.components?.map(item => item?.component_id);
            const currentSelected = selectedItems[module?.module_id] || [];
            const isAllSelected = currentSelected.length === moduleSubItems.length;

            setSelectedItems(prev => ({
                ...prev,
                [module.module_id]: isAllSelected ? [] : [...moduleSubItems]
            }));
        }
    };

    const selectDiv = (module) => {
        const displayLabel = module?.module_name?.length > 12 ? module?.module_name?.slice(0, 12) + "..." : module?.module_name;
        const isTruncated = module?.module_name?.length > 12;
        const currentSelected = selectedItems[module?.module_id] || [];
        const totalItems = module?.components?.length || 0;
        const selectedCount = currentSelected.length;
        const isAllSelected = selectedCount === totalItems && totalItems > 0;

        const moduleNameDisplay = (
            <div>{displayLabel + ` (${selectedCount}/${totalItems} selected)`}</div>
        );

        return (
            <div className="module-mapping-header">
                {isTruncated ? (
                    <Tooltip title={module?.module_name} orientation="top" arrow variant="tertiary">
                        {moduleNameDisplay}
                    </Tooltip>
                ) : (
                    moduleNameDisplay
                )}
                <Button
                    variant="url"
                    size="small"
                    className="module-mapping-select-all-button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAll(module);
                    }}
                >
                    {isAllSelected ? "Deselect all" : "Select all"}
                </Button>
            </div>
        )
    }

    const accordionData = [
        {
            header: "Map KPI to modules",
            content: (
                <>
                    <div className={`${globalClasses.flexRow} ${globalClasses.gap} module-mapping-row`}>
                        {modules?.map((module, index) => (
                            <div className="module-mapping-column" key={index}>
                                <AccordionModern
                                    data={[
                                        {
                                            header: selectDiv(module),
                                            content: (
                                                <div className={`${globalClasses.flexColumn} ${globalClasses.gap} module-mapping-checkboxes`}>
                                                    {module?.components?.map((subModule, subIndex) => (
                                                        <Checkbox
                                                            label={subModule?.component_name}
                                                            key={subIndex}
                                                            checked={(selectedItems[module?.module_id] || []).includes(subModule?.component_id)}
                                                            onChange={(checked, event) => {

                                                                // Handle different possible callback formats
                                                                let actualChecked;
                                                                if (typeof checked === 'boolean') {
                                                                    actualChecked = checked;
                                                                } else if (event?.target?.checked !== undefined) {
                                                                    actualChecked = event.target.checked;
                                                                } else if (checked?.target?.checked !== undefined) {
                                                                    actualChecked = checked.target.checked;
                                                                } else {
                                                                    // Fallback: toggle current state
                                                                    const currentlySelected = (selectedItems[module?.module_id] || []).includes(subModule?.component_id);
                                                                    actualChecked = !currentlySelected;
                                                                }

                                                                handleCheckboxChange(module?.module_id, subModule?.component_id, actualChecked);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            ),
                                            id: index + 1,
                                            value: `module_${module?.module_id}`
                                        }
                                    ]}
                                    isMultiExpanded={true}
                                    expanded={moduleExpanded[module?.module_id] || []}
                                    onChange={(activeAccordion) => {
                                        setModuleExpanded((prev) => ({
                                            ...prev,
                                            [module?.module_id]: prev[module?.module_id]?.includes(activeAccordion)
                                                ? prev[module?.module_id].filter((val) => val !== activeAccordion)
                                                : [...(prev[module?.module_id] || []), activeAccordion]
                                        }));
                                    }}
                                    setExpanded={(activeAccordion) => {
                                        if (Array.isArray(activeAccordion)) {
                                            setModuleExpanded((prev) => ({
                                                ...prev,
                                                [module?.module_id]: activeAccordion
                                            }));
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className={`${globalClasses.flexRow} ${globalClasses.gap} module-mapping-single-row`}>
                        {singleModules?.map((module, index) => (
                            <Checkbox
                                label={module?.components?.[0]?.component_name}
                                key={index}
                                checked={(selectedItems[module?.module_id] || []).includes(module?.components?.[0]?.component_id)}
                                onChange={(checked, event) => {

                                    // Handle different possible callback formats
                                    let actualChecked;
                                    if (typeof checked === 'boolean') {
                                        actualChecked = checked;
                                    } else if (event?.target?.checked !== undefined) {
                                        actualChecked = event.target.checked;
                                    } else if (checked?.target?.checked !== undefined) {
                                        actualChecked = checked.target.checked;
                                    } else {
                                        // Fallback: toggle current state
                                        const currentlySelected = (selectedItems[module?.module_id] || []).includes(module?.components?.[0]?.component_id);
                                        actualChecked = !currentlySelected;
                                    }

                                    handleCheckboxChange(module?.module_id, module?.components?.[0]?.component_id, actualChecked);
                                }}
                            />
                        ))}
                    </div>
                </>
            ),
            id: 1,
            value: "map_kpi_modules"
        }
    ];

    return (
        <div className={globalClasses.marginTop}>
            <AccordionModern
                data={accordionData}
                isMultiExpanded={true}
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
    );
};

export default ModuleMapping;
