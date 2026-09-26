import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Chip } from "@mui/material";
import { Panel, Input, Button, Select } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import FormulaDisplay from "../CreateKPI/components/FormulaDisplay";
import "../KPIConfigurator.css";
import { filterOptions } from "../utils/constants";
import ErrorBanner from "../CreateKPI/components/ErrorBanner";
import { addSnack } from "core/actions/snackbarActions";
import { getAllFilters } from "core/actions/filterAction";
import { getFieldsList } from "modules/inventorysmart/services-inventorysmart/KPI-Configurator/create-kpi-service";
import { createField, updateDerivedField } from "modules/inventorysmart/services-inventorysmart/KPI-Configurator/create-kpi-service";
import Loader from "core/Utils/Loader/loader";
import { parseFormulaExpression } from "../utils/helperFunctions";
import { isEmpty } from "lodash";

const CreateCalculatedField = ({ open, onClose, preSelectedDataSource = null, sourceFields = [], addFieldOption, editCalculatedField = null }) => {
    const globalClasses = globalStyles();
    const dispatch = useDispatch();

    const displaySnackMessages = (message, variance) => {
        dispatch(
            addSnack({
                message,
                options: {
                    variant: variance,
                },
            })
        );
    };

    const [fieldName, setFieldName] = useState("");
    const [dataSource, setDataSource] = useState();
    const [dataSourceOptions, setDataSourceOptions] = useState([]);
    const [fieldsMap, setFieldsMap] = useState({});
    const [fields, setFields] = useState();
    const [formulaComponents, setFormulaComponents] = useState([]);
    const [dataSourceOpen, setDataSourceOpen] = useState(false);
    const [formulaValidation, setFormulaValidation] = useState({ isValid: true, errors: [] });
    const [showErrorBanner, setShowErrorBanner] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loaderText, setLoaderText] = useState("");
    const [selectedComponentIndex, setSelectedComponentIndex] = useState(null);
    const [selectedComponentType, setSelectedComponentType] = useState(null);
    const [disabledFields, setDisabledFields] = useState(new Set());

    useEffect(() => {
        if (!formulaValidation.isValid) {
            setShowErrorBanner(true);
        }
    }, [formulaValidation]);

    useEffect(() => {
        if (!open) {
            // Note: disabledFields will be cleared by the sync useEffect when formulaComponents is cleared
            return;
        }

        //Loading data sources for the calculated field
        const loadFields = async () => {
            try {
                setLoading(true);
                setLoaderText("Loading data sources...");
                // Populate data source options from the same API used by FieldFunctionSelector
                const filtersResp = await getAllFilters("KPI Configurator")();
                if (filtersResp?.data?.status) {
                    const options = filtersResp?.data?.data?.[0]?.extra?.options || [];
                    setDataSourceOptions(options);
                    // By default select Transaction
                    if (!preSelectedDataSource) {
                        setDataSource(options[0]);
                    }
                    else {
                        setDataSource(preSelectedDataSource);
                    }
                }

                // Populate field options from the same API used by CreateKPI.getFieldsData
                const fieldsResp = sourceFields.length > 0 ? sourceFields : await getFieldsList()();
                if (fieldsResp?.data?.status) {
                    const rawFields = fieldsResp?.data?.data || [];
                    const nonDerivedFields = rawFields.filter((item) => !item?.is_derived && (["integer", "decimal", "numeric", "float"].includes(item?.data_type)));
                    setFields(nonDerivedFields);
                    setFieldsMap(
                        nonDerivedFields.reduce((acc, item) => {
                            const key = item?.field_label;
                            if (!key) return acc;
                            acc[key] = item?.field_value ?? item?.field_name ?? item?.field_label;
                            return acc;
                        }, {})
                    );
                }
                else {
                    displaySnackMessages(fieldsResp?.data?.message || "Failed to fetch fields", "error");
                }
            } catch (_e) {
                displaySnackMessages("Failed to fetch fields", "error");
            } finally {
                setLoading(false);
            }
        };

        loadFields();
    }, [open]);

    useEffect(() => {
        if (!open && isEmpty(fieldsMap)) return;

        setSelectedComponentIndex(null);
        setSelectedComponentType(null);

        if (!editCalculatedField) {
            setFieldName("");
            setFormulaComponents([]);
            // Note: disabledFields will be cleared by the sync useEffect when formulaComponents is empty
            return;
        }

        const existingName = editCalculatedField?.field_label || "";
        setFieldName(existingName);

        if (editCalculatedField?.derived_from_sources) {
            const ds = (dataSourceOptions || filterOptions.dataSources || []).find(
                (opt) => opt?.value === editCalculatedField.derived_from_sources
            );
            if (ds) {
                setDataSource(ds);
            }
        }

        const expression = editCalculatedField?.formula_expression || editCalculatedField?.formula || "";
        setFormulaComponents(parseFormulaExpression(expression, fieldsMap));
    }, [open, editCalculatedField, fieldsMap]);

    // Sync disabledFields with formulaComponents - disable fields that are in the formula
    useEffect(() => {
        const fieldsInFormula = new Set();
        formulaComponents.forEach((component) => {
            if (component.type === 'field' && component.value) {
                fieldsInFormula.add(component.value);
            }
        });
        setDisabledFields(fieldsInFormula);
    }, [formulaComponents]);

    const availableFields = (fields || [])
        .filter((item) => {
            if (!dataSource?.value) return true;
            return item?.source === dataSource.value;
        })
        .map((item) => item.field_label)

    const handleSave = async () => {
        try {
            setLoading(true);
            const expression = formulaExpression();

            if (editCalculatedField?.derived_field_id) {
                setLoaderText("Updating calculated field...");
                const payload = {
                    derived_field_id: editCalculatedField.derived_field_id,
                    formula_expression: expression
                };

                const response = await updateDerivedField(payload)();
                if (response?.data?.status) {
                    displaySnackMessages(response?.data?.data?.message || "Calculated field updated successfully", "success");
                    onClose(true);
                } else {
                    displaySnackMessages(response?.data?.data?.message || "Failed to update calculated field", "error");
                }
                return;
            }

            setLoaderText("Creating calculated field...");
            const payload = {
                data_source: dataSource?.value || "transaction",
                field_label: fieldName?.trim(),
                formula_expression: expression
            };

            const response = await createField(payload)();
            if (response?.data?.status) {
                displaySnackMessages(response?.data?.data?.message || "Calculated field created successfully", "success");
                addFieldOption && addFieldOption({ label: fieldName?.trim(), value: fieldName?.trim() });
                onClose(true);
            }
            else {
                displaySnackMessages(response?.data?.data?.message || "Failed to create calculated field", "error");
            }
        } catch (e) {
            console.log("displaySnackMessages", e)
            displaySnackMessages(e?.response?.data?.message || (editCalculatedField?.derived_field_id ? "Failed to update calculated field" : "Failed to create calculated field"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOperatorClick = (operator) => {
        const trimmed = operator.trim();

        if (selectedComponentType === 'operator' && selectedComponentIndex !== null) {
            setFormulaComponents((prev) => {
                const updated = [...prev];
                if (updated[selectedComponentIndex] && updated[selectedComponentIndex].type === 'operator') {
                    updated[selectedComponentIndex] = {
                        ...updated[selectedComponentIndex],
                        value: trimmed
                    };
                }
                return updated;
            });
            setSelectedComponentIndex(null);
            setSelectedComponentType(null);
            return;
        }

        const newOperator = {
            type: 'operator',
            value: trimmed
        };
        setFormulaComponents(prev => [...prev, newOperator]);
    };

    const handleFieldClick = (field) => {
        // Check if field is already disabled (in formula)
        const isFieldInFormula = disabledFields.has(field);
        
        if (isFieldInFormula) {
            // Field is already in formula, don't allow adding again
            return;
        }

        if (selectedComponentType === 'field' && selectedComponentIndex !== null) {
            // Replace existing field in formula
            setFormulaComponents((prev) => {
                const updated = [...prev];
                if (updated[selectedComponentIndex] && updated[selectedComponentIndex].type === 'field') {
                    updated[selectedComponentIndex] = {
                        ...updated[selectedComponentIndex],
                        value: field
                    };
                }
                return updated;
            });
            setSelectedComponentIndex(null);
            setSelectedComponentType(null);
            return;
        }

        // Add new field to formula, auto-inserting '+' operator if needed
        const newField = {
            type: 'field',
            value: field
        };
        setFormulaComponents(prev => {
            const newComponents = [...prev];

            if (newComponents.length > 0) {
                const last = newComponents[newComponents.length - 1];
                if (last && (
                    last.type === 'field' ||
                    last.type === 'component' ||
                    last.type === 'constant' ||
                    (last.type === 'parenthesis' && last.value === ')')
                )) {
                    newComponents.push({
                        type: 'operator',
                        value: '+'
                    });
                }
            }

            newComponents.push(newField);
            return newComponents;
        });
    };

    const handleDataSourceChange = (option) => {
        setDataSource(option || null);
    };

    // Clear formula
    const clearFormula = () => {
        setFormulaComponents([]);
        // Note: disabledFields will be cleared by the sync useEffect when formulaComponents is empty
    };

    // Delete individual component by index
    const deleteComponent = (index) => {
        setFormulaComponents((prev) => {
            const newComponents = [...prev];

            if (!newComponents[index]) {
                return newComponents;
            }

            const itemToDelete = newComponents[index];

            // If a field, constant, or closing parenthesis is removed, handle adjacent operators
            if (
                itemToDelete.type === 'field' ||
                itemToDelete.type === 'component' ||
                itemToDelete.type === 'constant' ||
                (itemToDelete.type === 'parenthesis' && itemToDelete.value === ')')
            ) {
                // Priority: remove the PRECEDING operator (Field1 * Field2 / Field3 → remove Field2 → Field1 / Field3)
                if (index > 0 && newComponents[index - 1]?.type === 'operator') {
                    newComponents.splice(index - 1, 2);
                }
                // If first operand, remove the FOLLOWING operator
                else if (index < newComponents.length - 1 && newComponents[index + 1]?.type === 'operator') {
                    newComponents.splice(index, 2);
                }
                else {
                    newComponents.splice(index, 1);
                }
            } else {
                newComponents.splice(index, 1);
            }

            // Clean up empty parentheses pairs — e.g. ( ) left after removing the only content inside
            let cleaned = true;
            while (cleaned) {
                cleaned = false;
                for (let i = 0; i < newComponents.length - 1; i++) {
                    if (
                        newComponents[i]?.type === 'parenthesis' && newComponents[i]?.value === '(' &&
                        newComponents[i + 1]?.type === 'parenthesis' && newComponents[i + 1]?.value === ')'
                    ) {
                        newComponents.splice(i, 2);
                        if (i > 0 && i < newComponents.length && newComponents[i - 1]?.type === 'operator') {
                            newComponents.splice(i - 1, 1);
                        } else if (i < newComponents.length && newComponents[i]?.type === 'operator') {
                            newComponents.splice(i, 1);
                        }
                        cleaned = true;
                        break;
                    }
                }
            }

            // Remove trailing operator if the formula now ends with one
            while (newComponents.length > 0 && newComponents[newComponents.length - 1]?.type === 'operator') {
                newComponents.pop();
            }

            return newComponents;
        });

        if (selectedComponentIndex === index) {
            setSelectedComponentIndex(null);
            setSelectedComponentType(null);
        }
        // Note: disabledFields will be automatically updated by the useEffect that syncs with formulaComponents
    };

    const handleComponentClick = (component, index) => {
        if (!component) return;
        setSelectedComponentIndex(index);
        setSelectedComponentType(component.type);
    };

    // Generate formula expression for validation
    const formulaExpression = () => {
        return formulaComponents
            .map((comp) => {
                if (comp.type === "field") {
                    return fieldsMap[comp.value];
                }
                return comp.value;
            })
            .join(" ")
            .trim();
    } 

    const isSaveDisabled = !fieldName.trim() ||
        (preSelectedDataSource ? false : !dataSource) ||
        formulaComponents.length === 0 ||
        !formulaValidation.isValid;

    return (
        <Panel
            title={editCalculatedField?.derived_field_id ? "Edit calculated field" : "Create calculated field"}
            size="large"
            anchor="right"
            onClose={onClose}
            aria-labelledby="create-calculated-field-dialog"
            open={open}
            primaryButtonLabel={editCalculatedField?.derived_field_id ? "Update" : "Add"}
            onPrimaryButtonClick={handleSave}
            primaryButtonProps={{
                disabled: isSaveDisabled || loading
            }}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={onClose}
        >
            <Loader
                loader={loading}
                text={loaderText}
            >
                <div className={globalClasses.flexColumn}>
                    <div className={`${globalClasses.fullWidth} ${globalClasses.marginBottom}`}>
                        <Input
                            label="Calculated field name"
                            isRequired
                            placeholder="Enter text"
                            value={fieldName}
                            onChange={(e) => setFieldName(e.target.value)}
                            disabled={Boolean(editCalculatedField?.derived_field_id)}
                            fullWidth
                        />
                    </div>

                    {!preSelectedDataSource && (
                        <div className={`${globalClasses.fullWidth} ${globalClasses.marginBottom}`}>
                            <Select
                                label="Select data source"
                                isRequired
                                placeholder="Select data source"
                                isMulti={false}
                                isOpen={dataSourceOpen}
                                setIsOpen={setDataSourceOpen}
                                currentOptions={dataSourceOptions?.length ? dataSourceOptions : filterOptions.dataSources}
                                selectedOptions={dataSource}
                                initialOptions={dataSourceOptions?.length ? dataSourceOptions : filterOptions.dataSources}
                                handleChange={handleDataSourceChange}
                                setSelectedOptions={(option) => setDataSource(option || null)}
                                setCurrentOptions={() => { }}
                                isDisabled={Boolean(editCalculatedField?.derived_field_id) || formulaComponents.some(comp => comp.type === 'field')}
                            />
                        </div>
                    )}

                    <div className={`calculated-field-formula-container ${globalClasses.marginBottom}`}>
                        <div className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.verticalLabel}`}>
                            <div>
                                Formula
                            </div>
                            {showErrorBanner && !formulaValidation.isValid && formulaValidation.errors && formulaValidation.errors.length > 0 && (
                                <ErrorBanner
                                    errors={formulaValidation.errors}
                                    onClose={() => setShowErrorBanner(false)}
                                />
                            )}
                        </div>
                        <FormulaDisplay
                            formulaComponents={formulaComponents}
                            setFormulaValidation={setFormulaValidation}
                            onDeleteComponent={deleteComponent}
                            selectedComponentIndex={selectedComponentIndex}
                            selectedComponentType={selectedComponentType}
                            onComponentClick={handleComponentClick}
                            emptyMessage="Enter formula (e.g., [Quantity Sold] * [Unit Price])"
                            isCalculatedField={true}
                        />
                    </div>

                    <div className={`${globalClasses.flexRow} ${globalClasses.gapHalf} ${globalClasses.flexWrap} ${globalClasses.marginBottom}`}>
                        {['+', '−', '×', '/'].map((operator) => (
                            <Button
                                key={operator}
                                variant="outlined"
                                size="small"
                                onClick={() => handleOperatorClick(operator)}
                                className="formula-generator-operator-button"
                            >
                                {operator}
                            </Button>
                        ))}
                        {[
                            { symbol: '(', value: '(' },
                            { symbol: ')', value: ')' }
                        ].map((paren) => (
                            <Button
                                key={paren.symbol}
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                    const newParen = {
                                        type: 'parenthesis',
                                        value: paren.value
                                    };
                                    setFormulaComponents(prev => [...prev, newParen]);
                                }}
                                className="formula-generator-parenthesis-button"
                            >
                                {paren.symbol}
                            </Button>
                        ))}
                    </div>

                    <div className={`${globalClasses.fullWidth} ${globalClasses.marginBottom}`}>
                        <div className="formula-generator-section-title">
                            Add fields to the formula canvas
                        </div>

                        <div className="formula-fields-container">
                            {availableFields.map((field, index) => {
                                const isDisabled = disabledFields.has(field);
                                return (
                                    <button
                                        key={`${field}-${index}`}
                                        onClick={() => handleFieldClick(field)}
                                        className={`formula-field-button ${isDisabled ? 'disabled' : 'enabled'}`}
                                    >
                                        {field}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className={`${globalClasses.fullWidth} ${globalClasses.marginBottom}`}>
                        <div className="formula-instructions-title">
                            Instructions:
                        </div>
                        
                            <ul className="formula-instructions-list">
                                <li>• Use operators: + (addition), − (subtraction), × (multiplication), ÷ (division)</li>
                                <li>• Use parentheses ( ) to group expressions</li>
                            </ul>
                        
                    </div>
                </div>
            </Loader>
        </Panel>
    );
};

export default CreateCalculatedField;

