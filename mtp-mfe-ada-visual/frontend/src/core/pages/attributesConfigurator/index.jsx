import { useState, useEffect, useCallback, useRef } from "react";
import { connect } from "react-redux";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Tab } from "@mui/material";
import isEmpty from "lodash/isEmpty";
import { DEFAULT_ATTRIBUTE_CONSTANTS, DEFAULT_ATTRIBUTE_TABS_CONSTANTS } from 'core/Utils/constants/assortSmart-constants';
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
import { addSnack } from "core/actions/snackbarActions";
import { getApplicationCodeFromURL, showSnackMessage } from "core/Utils/utils";

import AttributesConfig from "./attributesConfig";
import ConfirmationModal from 'core/Utils/modals/confirmationModal';

import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { getClusterCreatePlan, updateAttributeTable } from "core/actions/assortSmartActions";

import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

function AttributesConfigurator(props) {
    const { CONFIRMATION_MODAL_CONSTANTS, SNACK_MESSAGES, SNACK_MESSAGE_VARIANTS: { ERROR, SUCCESS } } = DEFAULT_ATTRIBUTE_CONSTANTS;

    const [currentTab, setCurrentTab] = useState(0);
    const [nextTab, setNextTab] = useState(null);
    const [attributeDropdownList, setAttributeDropdownList] = useState([]);
    const [currentSelectedAttributes, setCurrentSelectedAttributes] = useState([]);
    const [updatedAttributeDropdownData, setUpdatedAttributeDropdownData] = useState([]);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [isAttributeDropdownListLoading, setIsAttributeDropdownListLoading] = useState(true);
    const [saveTableCallbacks, setSaveTableCallbacks] = useState(null);
    const [yearOptions, setYearOptions] = useState([]);
    const classes = useStyles();

    /**
     * @function
     * @description Fetches the attribute dropdown list and year dropdown values on component mount and resetting saveTableCallbacks on component unmount
     */
    useEffect(() => {
        fetchAttributesDropdown();
        fetchAssortYearValue();

        return () => {
            setSaveTableCallbacks(null);
        };
    }, []);

    /**
    * @function
    * @description Fetches the filter data whenever the currentSelectedAttributes changes.
    */

    useEffect(() => {
        if (currentSelectedAttributes.length > 0) {
            fetchFilterData(currentSelectedAttributes);
        }
    }, [currentSelectedAttributes, fetchFilterData]);

    /**
     * @function
     * @description Fetches the filter data whenever the attributeDropdownList changes.
     */
    useEffect(() => {
        if (attributeDropdownList.length > 0) {
            fetchFilterData([]);
        }
    }, [attributeDropdownList]);

    /**
     * @function
     * @description Handle first load and setup table and  callbacks to parent to ensure smooth transition
     */
    useEffect(() => {
        if (props.setUpCallbacks) {
            props.setUpCallbacks({ nextNavFunc: updatePreviewTable });
        }
    }, [saveTableCallbacks]);

    const handleValidationFunc = useCallback((validator) => {
        setSaveTableCallbacks({
            [DEFAULT_ATTRIBUTE_TABS_CONSTANTS[currentTab].label]: validator,
        });
    }, [currentTab]);

    /**
     * @function
     * @description Validate and update table values configured in the form to save it DB
     */
    const updatePreviewTable = async () => {
        if (!saveTableCallbacks || isEmpty(saveTableCallbacks)) {
            return false;
        }

        try {
            const [key, validator] = await Object.entries(saveTableCallbacks)[0];

            const data = await validator();
            const payload = { hierarchy_data: data };

            await updateAttributeTable(payload);

            showSnackMessage(props.addSnack, SNACK_MESSAGES.DEFAULT_ATTRIBUTE_API.SUCCESS, SUCCESS);
            return true;
        } catch (error) {

            showSnackMessage(props.addSnack, SNACK_MESSAGES.DEFAULT_ATTRIBUTE_API.ERROR, ERROR);
            return false;
        }
    };

    /**
     * @function fetchFilterData
     * @description Fetches the updated filter data based on the selected filters and updates the state.
     * @param {Array} filters - The currently selected filters.
     */
    const fetchFilterData = useCallback(async (filters = []) => {
        try {
            const attributesList = getfilterAttributeList(attributeDropdownList);
            const body = {
                attributes: attributesList,
                filter_type: "cascaded",
                filters,
                application_code: getApplicationCodeFromURL('AssortSmart'),
            };

            const filterElementsData = await getCombinedCrossDimensionFiltersData(body)();
            const filtersData = generateFilterData(filterElementsData?.data?.data);

            setUpdatedAttributeDropdownData(filtersData);
            setIsAttributeDropdownListLoading(false);
        } catch (error) {
            setIsAttributeDropdownListLoading(false);
            showSnackMessage(props.addSnack, SNACK_MESSAGES.CROSS_FILTER_API.ERROR, ERROR);
        }
    }, [attributeDropdownList, currentSelectedAttributes]);

    /**
    * @function fetchAttributesDropdown
    * @description Fetches the attribute dropdown data
    */
    const fetchAttributesDropdown = async () => {
        try {
            const response = await getClusterCreatePlan();
            setAttributeDropdownList(response?.data?.data);
        } catch (error) {
            showSnackMessage(props.addSnack, SNACK_MESSAGES.CREATE_PLAN_API.ERROR, ERROR);

        }
    };

    /**
    * @function fetchAssortYearValue
    * @description Fetches the assort year values from the server and updates the state.
    */
    const fetchAssortYearValue = async () => {
        try {

            const yearRes = await getTenantConfigApplicationLevel(2, {
                attribute_name: "assort_year_value",
            })();

            setYearOptions(yearRes?.data?.data[0]?.attribute_value?.value || []);
        } catch (error) {
            showSnackMessage(props.addSnack, SNACK_MESSAGES.ASSORT_YEAR_API.ERROR, ERROR);
        }
    };

    /**
     * @function generateFilterData
     * @description Generates dropdown options for filters based on the data.
     * @param {Object} data - The filter data from the server.
     * @returns {Array} The formatted filter data with options.
     */

    const generateFilterData = (data) => {
        return attributeDropdownList.sort((a, b) => a.display_order - b.display_order).map(item => ({
            ...item,
            options: data[item.column_name] || [],
        }));
    };

    /**
     * @function handleTabChange
     * @description Handles the tab change event, prompting the user with a confirmation modal if unsaved changes exist.
     * @param {Event} event - The tab change event.
     * @param {Number} newValue - The index of the new tab.
    */
    const handleTabChange = (event, newValue) => {
        if (currentTab != newValue) {
            setNextTab(newValue);
            setShowConfirmationModal(true);
        }
    };

    /**
    * @function handleFilterUpdate
    * @description Updates the selected attributes based on user input.
    * @param {Array} updatedFilters - The updated list of selected filters.
    */
    const handleFilterUpdate = (updatedFilters) => {
        setCurrentSelectedAttributes(updatedFilters);
    };

    /**
     * @function handleClose
     * @description Handles the closing of the confirmation modal and switches the tab if confirmed.
     * @param {Boolean} newValue - Indicates if the tab change was confirmed.
     */
    const handleClose = (newValue) => {
        setNextTab(null)
        setShowConfirmationModal(false);

        if (newValue) {
            setCurrentTab(nextTab);
            setCurrentSelectedAttributes([]);
            fetchFilterData([]);
        }
    };

    const renderConfirmationModal = () => {
        return (
            <ConfirmationModal
                className={classes.defaultAttributeDialog}
                title={CONFIRMATION_MODAL_CONSTANTS.TITLE}
                content={CONFIRMATION_MODAL_CONSTANTS.CONTENT}
                onClose={handleClose}
                open={showConfirmationModal}
            />
        )
    };

    const renderTabs = () => {
        return (
            DEFAULT_ATTRIBUTE_TABS_CONSTANTS.length > 0 && (
                <TabContext value={String(currentTab)}>
                    <Box>
                        <TabList onChange={handleTabChange} aria-label="Attributes Tabs">
                            {DEFAULT_ATTRIBUTE_TABS_CONSTANTS.map((tab, index) => (
                                <Tab
                                    className={classes.defaultAttributeTab}
                                    label={tab.label}
                                    value={String(index)}
                                    key={index}
                                />
                            ))}
                        </TabList>
                    </Box>
                    {DEFAULT_ATTRIBUTE_TABS_CONSTANTS.map((tab, index) => (
                        <TabPanel value={String(index)} key={index}>
                            <AttributesConfig
                                name={tab.label}
                                index={index}
                                yearOptions={yearOptions}
                                filterData={updatedAttributeDropdownData}
                                setFiltersToSendToCrossFilter={handleFilterUpdate}
                                currentSelectedAttributes={currentSelectedAttributes}
                                isAttributeDropdownListLoading={isAttributeDropdownListLoading}
                                getValidationFunc={handleValidationFunc}
                            />
                        </TabPanel>
                    ))}
                </TabContext>
            )
        )
    };

    return (
        <Box className={classes.defaultAttributeContainer}>
            {renderTabs()}
            {renderConfirmationModal()}
        </Box>
    );
}

const mapStateToProps = (state) => {
    return {};
};

const mapActionToProps = {
    addSnack
};

export default connect(mapStateToProps, mapActionToProps)(AttributesConfigurator);