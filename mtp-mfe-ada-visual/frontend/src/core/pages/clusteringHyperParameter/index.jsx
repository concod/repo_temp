import { useEffect, useState, useRef } from 'react';
import {
    Divider,
    Button,
    Alert,
    TextField
} from '@mui/material';
import { connect } from "react-redux";
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty'

import { addSnack } from "core/actions/snackbarActions";
import { getClusterHyperParameter, getCustomClusterHyperParameterData, getDefaultClusterHyperParameterData, setClusterHyperParameterData, updateClusterHyperParameterData } from 'core/actions/assortSmartActions';
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { createDropdownObject, customAgGridCustomCellRenderer, showSnackMessage } from 'core/Utils/utils';
import { DEFAULT_ATTRIBUTE_CONSTANTS, STATIC_CLUSTER_HYPER_PARAMETER_FORM, PRODUCT_CLUSTERING_FIELDS, PERFORMANCE_CLUSTERING_FIELDS, CLUSTER_HYPER_PARAMETER_CONSTANTS } from 'core/Utils/constants/assortSmart-constants';
import LoadingOverlay from 'core/Utils/Loader/loader';

import AgGrid from 'core/Utils/agGrid';
import Form from "core/Utils/form";
import MOCK_COLUMN from './columns.json';
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

function ClusteringHyperParameter(props) {

    const classes = useStyles();
    const globalClasses = globalStyles();

    const [tableFormConfig, setTableFormConfig] = useState([]);
    const [formDependency, setFormDependency] = useState({});
    const [errorMetricsData, setErrorMetricsData] = useState(null);
    const [minMaxValues, setMinMaxValues] = useState({
        productmin: "",
        productmax: "",
        perfmin: "",
        perfmax: "",
    });
    const [totalRow, setTotalRow] = useState(0);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isErrorMetricsTableLoading, setIsErrorMetricsTableLoading] = useState(false);

    const kpiMetricsTableRef = useRef(null);
    const errorMetricsDataRef = useRef(null);

    const { SNACK_MESSAGES, SNACK_MESSAGE_VARIANTS: { ERROR, SUCCESS } } = DEFAULT_ATTRIBUTE_CONSTANTS;
    const { APPLY_BUTTON_TEXT, WEIGHTAGE_ALERT, PRODUCT_CLUSTERING_TITLE, PERFORMANCE_CLUSTERING_TITLE } = CLUSTER_HYPER_PARAMETER_CONSTANTS;

    useEffect(() => {
        fetchHyperparamterData();
        fetchDefaultHyperParameter();
    }, []);

    useEffect(() => {
        if (props.setUpCallbacks) {
            props.setUpCallbacks({
                nextNavFunc: async () => {
                    if (isWeightageInvalid() || isMinMaxInvalid()) {
                        return false;
                    }

                    try {
                        const payload = preparePayload();
                        await updateClusterHyperParameterData(payload);
                        showSnackMessage(
                            props.addSnack,
                            SNACK_MESSAGES.UPDATE_CLUSTER_HYPERPARAMETER_DATA_API.SUCCESS,
                            SUCCESS
                        );
                        return true;
                    } catch (error) {
                        showSnackMessage(
                            props.addSnack,
                            SNACK_MESSAGES.UPDATE_CLUSTER_HYPERPARAMETER_DATA_API.ERROR,
                            ERROR
                        );
                        return false;
                    }
                },
            });
        }
    }, [props.setUpCallbacks, totalRow, errorMetricsData, minMaxValues, props.addSnack]);


    const isWeightageInvalid = () => {
        if (totalRow > 100) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.WEIGHTAGE_SELECTION_ERROR.ERROR,
                ERROR
            );
            return true;
        }
        return false;
    };

    const isMinMaxInvalid = () => {
        if (
            (minMaxValues.productmax && minMaxValues.productmax < minMaxValues.productmin) ||
            (minMaxValues.perfmax && minMaxValues.perfmax < minMaxValues.perfmin)
        ) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.MAX_VALUE_ERROR.ERROR,
                ERROR
            );
            return true;
        }
        return false;
    };

    const preparePayload = () => {
        const data = errorMetricsData.map((item) => ({
            ...item,
            ...minMaxValues
        }));
        return { cluster_hyperparameter: data };
    };

    useEffect(() => {
        if (!isEmpty(errorMetricsData)) {
            const totalCount = errorMetricsData.reduce(
                (acc, currentVal) => acc + Number(currentVal.weightage), 0
            )
            errorMetricsDataRef.current = errorMetricsData;
            setTotalRow(Math.round(totalCount * 100) / 100);
        }
    }, [errorMetricsData])

    const fetchHyperparamterData = async () => {
        try {
            const response = await getClusterHyperParameter();
            const data = response?.data?.data;

            if (data) {

                const updatedFormConfig = cloneDeep(STATIC_CLUSTER_HYPER_PARAMETER_FORM).map((config) => {
                    const formField = config.form[0];

                    switch (formField.accessor) {
                        case "selectClusteringAlgorithm":
                            formField.options = data.clustering_algorithms.map((item) =>
                                createDropdownObject(item, item.toLowerCase(), item)
                            );
                            break;

                        case "selectErrorMetrics":
                            formField.options = data.kpi_error_metrics.map((item) =>
                                createDropdownObject(item, item.toLowerCase(), item)
                            );
                            break;

                        case "selectWightMethodology":
                            formField.options = data.weightage_selection_methodology.map((item) =>
                                createDropdownObject(item, item.toLowerCase(), item)
                            );
                            break;

                        default:
                            break;
                    }

                    return config;
                });

                setTableFormConfig(updatedFormConfig);
            }
        } catch (error) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.GET_CLUSTER_HYPERMETER_DATA_API.ERROR,
                ERROR
            );
        }
    };

    const fetchDefaultHyperParameter = async () => {
        try {
            const response = await getDefaultClusterHyperParameterData();
            const defaultData = response?.data?.data || [];

            const normalizedData = defaultData.map((item) => ({
                ...item,
                weightage: Number(item.weightage),
            }));

            setErrorMetricsData(normalizedData);
        } catch (error) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.GET_CLUSTER_HYPERMETER_DATA_API.ERROR,
                ERROR
            );
        } finally {
            setIsDataLoading(false);
        }
    };

    const fetchCustomHyperParameter = async () => {
        try {
            const response = await getCustomClusterHyperParameterData();
            const customData = response?.data?.data || {};

            const method = formDependency?.selectWightMethodology?.selectWightMethodology?.trim() || "auto";
            const selectedData = customData[method.toLowerCase()] || [];

            setErrorMetricsData(selectedData);
        } catch (error) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.GET_CLUSTER_HYPERMETER_DATA_API.ERROR,
                ERROR
            );
        }
    };

    const saveHyperParamterData = async () => {
        try {
            setIsErrorMetricsTableLoading(true);
            const clusteringAlgorithms = formDependency?.selectClusteringAlgorithm?.selectClusteringAlgorithm || [];
            const metrics = formDependency?.selectErrorMetrics?.selectErrorMetrics || [];
            const method = formDependency?.selectWightMethodology?.selectWightMethodology || '';

            const clusterHyperparameter = clusteringAlgorithms.map((algorithm) => ({
                algorithm: algorithm,
                method: method,
                metric: metrics,
            }));

            const payload = { cluster_hyperparameter: clusterHyperparameter };
            const response = await setClusterHyperParameterData(payload);

            if (response?.status === 200) {
                fetchCustomHyperParameter();
            }
        } catch (error) {
            showSnackMessage(
                props.addSnack,
                SNACK_MESSAGES.SET_CLUSTER_HYPERPARAMETER_DATA_API.ERROR,
                ERROR
            );
        } finally {
            setIsErrorMetricsTableLoading(false);
        }
    };

    const handleChange = (deps) => {
        const key = Object.keys(deps)[0];
        const newFormDependency = { ...formDependency, [key]: { ...deps } };
        setFormDependency(newFormDependency);
    };

    const generateAttributeListColumn = () => {
        // TODO: Get the columns from the backend API
        const colConfig = cloneDeep(MOCK_COLUMN.columns);
        return agGridColumnFormatter(colConfig, {}, {}, false, null, false);
    };

    const handleOnBlur = (data, isChanged) => {
        if (isChanged) {
            const updatedErrorMetricsData = cloneDeep(errorMetricsDataRef.current).map((item) =>
                item.metric === data.metric ? { ...item, ...data } : item
            );

            setErrorMetricsData(updatedErrorMetricsData);
        }
    };

    const handleMinMaxChange = (field, value) => {
        setMinMaxValues((prev) => ({
            ...prev,
            [field]: Number(value) || 0,
        }));
    };

    const renderClusterHyperParameterForm = () => {
        return (
            !isEmpty(tableFormConfig) &&
            tableFormConfig.map((config, index) => (
                <div key={index}>
                    <Form
                        updateDefaultValue={false}
                        layout={"horizontal"}
                        maxFieldsInRow={1}
                        fields={config.form}
                        handleChange={handleChange}
                        defaultValues={formDependency[config.formAccessor] || {}}
                    />
                    {config.hasDivider && <Divider />}
                </div>
            ))
        );
    };

    const renderApplyButton = () => (
        <div className={classes.flexRowCenterContainer}>
            <div className={classes.hyperParameterContentContainer}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={saveHyperParamterData}
                >
                    {APPLY_BUTTON_TEXT}
                </Button>
            </div>
        </div>
    );

    const lockCellCustomConditionFn = (instance) => {
        const condition = (instance.data?.cellLocked || {})[
            instance?.data?.uniqueID + instance?.colDef?.field
        ]
            ? true
            : false;
        return condition;
    };

    const lockCellApi = (cellProps, isLocked) => {
        const fieldName = cellProps.cellData.colDef.field;
        const currentNodeCellLocked = cellProps.cellData.data["cellLocked"] || {};
        cellProps.cellData.node["cellLocked"] = isLocked;
        cellProps.cellData.data["cellLocked"] = {
            ...currentNodeCellLocked,
            [cellProps.cellData.data?.uniqueID + fieldName]: isLocked,
        };
        kpiMetricsTableRef.current.api.refreshCells({
            force: true,
        });
    };

    const renderKPIErrorMetricsTable = () => (
        <div className={classes.flexRowCenterContainer}>
            <div className={classes.hyperParameterContentContainer}>
                <LoadingOverlay loader={isErrorMetricsTableLoading} spinner>
                    <AgGrid
                        tableRef={kpiMetricsTableRef}
                        sizeColumnsToFitFlag
                        columns={generateAttributeListColumn()}
                        rowdata={errorMetricsData || []}
                        pinnedBottomRowData={[{ metric: 'Total', weightage: totalRow }]}
                        selectAllHeaderComponent={false}
                        hideFormatSideBar={false}
                        pagination={false}
                        showColumnPanel={false}
                        hideRangeFilter={true}
                        uniqueRowId="metric"
                        onBlur={handleOnBlur}
                        customCellRenderer={(cellProps) => customAgGridCustomCellRenderer(cellProps, "error-metric-table")}
                        tableId={"error-metric-table"}
                        isCellLockable={true}
                        lockCellApi={(cellProps, isLocked) =>
                            lockCellApi(cellProps, isLocked)
                        }
                        lockCellCustomConditionFn={lockCellCustomConditionFn}
                    />
                    <Alert className={classes.marginTop10px} severity="info">
                        {WEIGHTAGE_ALERT}
                    </Alert>
                </LoadingOverlay>
            </div>
        </div>
    );

    const renderInputs = (fields) => (
        <div className={classes.hyperParameterContentContainer}>
            {fields.map((field, index) => {
                const error =
                    (field.key === "productmax" &&
                        minMaxValues.productmax &&
                        minMaxValues.productmax < minMaxValues.productmin) ||
                    (field.key === "perfmax" &&
                        minMaxValues.perfmax !== undefined &&
                        minMaxValues.perfmax < minMaxValues.perfmin);

                return (
                    <div key={field.key}>
                        <TextField
                            type="number"
                            size="small"
                            placeholder={field.label}
                            value={minMaxValues[field.key] || ""}
                            onChange={(e) => handleMinMaxChange(field.key, e.target.value)}
                            error={error}
                            helperText={error ? SNACK_MESSAGES.MAX_VALUE_ERROR.ERROR : ""}
                        />
                        {index === 0 && <span className={classes.hyperParameterHypen}>-</span>}
                    </div>
                );
            })}
        </div>
    );

    const renderMinMaxSection = (label, fields) => (
        <div className={classes.flexRowCenterContainer}>
            <div className={globalClasses.inputLabel}>{label}</div>
            {renderInputs(fields)}
        </div>
    );

    const renderBucketsForClustering = () => (
        <>
            {renderMinMaxSection(PRODUCT_CLUSTERING_TITLE, PRODUCT_CLUSTERING_FIELDS)}
            <Divider />
            {renderMinMaxSection(PERFORMANCE_CLUSTERING_TITLE, PERFORMANCE_CLUSTERING_FIELDS)}
        </>
    );

    return (
        <LoadingOverlay loader={isDataLoading} spinner>
            <div className={classes.hyperParameterContainer}>
                {renderClusterHyperParameterForm()}
                {renderApplyButton()}
                {renderKPIErrorMetricsTable()}
                <Divider />
                {renderBucketsForClustering()}
            </div>
        </LoadingOverlay>
    );

}

const mapStateToProps = (state) => {
    return {};
};

const mapActionToProps = {
    addSnack
};

export default connect(mapStateToProps, mapActionToProps)(ClusteringHyperParameter);
