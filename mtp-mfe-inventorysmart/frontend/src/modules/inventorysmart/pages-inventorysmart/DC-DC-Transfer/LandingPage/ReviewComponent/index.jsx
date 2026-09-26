import React from "react";
import { Tabs } from "impact-ui-v3"
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import globalStyles from "../../../../../../core/Styles/globalStyles";
import { useEffect, useState } from "react";
import ReactSelect from "core/Utils/select/index";
import { cloneDeep, isEmpty, orderBy, isUndefined, isNull } from "lodash";
import { InputLabel } from "@mui/material";
import {
    setDcTransferReviewData,
    setDcTransferDataLoader,
    setDcTransferReviewColumns,
    getDcToDcReviewData,
    setUnReviewedArticles,
    moveToReviewed,
} from "modules/inventorysmart/services-inventorysmart/DC-TO-DC/dc-to-dc-landing-page-service.js";
import { connect } from "react-redux";
import clsx from "clsx";
import { getColumnsAg } from "core/actions/tableColumnActions";
import ReviewSizes from "./ReviewSizes.jsx"
import ReviewRecommendation from "./ReviewRecommendation.jsx"
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { addSnack } from "core/actions/snackbarActions";

const tabs = [{
    label: "Review Recommendation",
    value: 1,
    id: 'review_recommendation',
    table_name: 'dc_review_recommendation_table',
},
{
    label: "Review Sizes",
    value: 2,
    id: 'review_sizes',
    table_name: 'dc_review_size_table',
}]
const ReviewComponent = (props) => {
    const classes = useStyles();
    const globalClasses = globalStyles();
    const [selectedTab, setSelectedTab] = useState(null)
    const [selectedArticle, setSelectedArticle] = useState({});

    useEffect(() => {
        setSelectedTab(tabs[0])
    }, [])

    useEffect(() => {
        // Fetching Columns
        const getColumns = async () => {
            let tableName = selectedTab['table_name'];
            let response = await getColumnsAg(`table_name=${tableName}`)();
            let columns = cloneDeep(response)
            if (selectedTab.id === 'review_recommendation') {
                columns = columns.map((item) => {
                    if (item.column_name === "article") {
                        item.cellRenderer = "agGroupCellRenderer";
                    }
                    else if (item.column_name === 'transfer_units') {
                        item.extra = { dynamicMaxKey: "min_transfer_quantity" };
                        item.cellRenderer = (cellProps, extraProps) => {
                            if (cellProps.node.level === 0) return null;
                            return (
                                <CellRenderers
                                    cellData={cellProps}
                                    column={item}
                                    extraProps={extraProps}
                                ></CellRenderers>
                            );
                        };
                    }
                    else if (item?.column_name === "source_dc") {
                        item.cellRenderer = (cellProps, extraProps) => {
                            if (!cellProps.data.is_added || cellProps.node.level === 0) return cellProps.value;
                            const { data } = cellProps;
                            let clonedData = cloneDeep(data)
                            let options = []
                            if (!isNull(clonedData.destination_dc) && !isNull(clonedData.source_dc)) {
                                // Show all source_dc options
                                options = clonedData.sourceoptions
                            }
                            else {
                                // Do not show selected destination option in source.
                                let selectedDestination_dc = null
                                let newSourceDcOptions = []
                                selectedDestination_dc = clonedData.destination_dc
                                newSourceDcOptions = clonedData.sourceoptions.filter((option) => {
                                    return option.label !== selectedDestination_dc
                                })
                                options = newSourceDcOptions
                            }
                            return (
                                <CellRenderers
                                    cellData={cellProps}
                                    column={item}
                                    extraProps={extraProps}
                                    options={options}
                                ></CellRenderers>
                            );
                        };
                    }
                    else if (item?.column_name === "destination_dc") {
                        item.cellRenderer = (cellProps, extraProps) => {
                            if (!cellProps.data.is_added || cellProps.node.level === 0) return cellProps.value;
                            const { data } = cellProps;
                            let clonedData = cloneDeep(data)
                            let options = []
                            if (!isNull(clonedData.destination_dc) && !isNull(clonedData.source_dc)) {
                                // Show all destination_dc options
                                options = clonedData.destinationoptions
                            }
                            else {
                                // Do not show selected source option in destination.
                                let selectedSource_dc = null
                                let newDestinationDcOptions = []
                                selectedSource_dc = clonedData.source_dc
                                newDestinationDcOptions = clonedData.destinationoptions.filter((option) => {
                                    return option.label !== selectedSource_dc
                                })
                                options = newDestinationDcOptions
                            }
                            return (
                                <CellRenderers
                                    cellData={cellProps}
                                    column={item}
                                    extraProps={extraProps}
                                    options={options}
                                ></CellRenderers>
                            );
                        };
                    }
                    else if (item.column_name === 'ticket_type') {
                        item.cellRenderer = (cellProps, extraProps) => {
                            if (cellProps.node.level === 1 || !cellProps?.data?.ticket_type) return null;
                            return (
                                <CellRenderers
                                    cellData={cellProps}
                                    column={item}
                                    extraProps={extraProps}
                                ></CellRenderers>
                            );
                        };
                    }
                    return item;
                });
            }
            if (selectedTab.id === 'review_sizes') {
                columns = columns.map((item) => {
                    if (item.column_name === "size") {
                        item.cellRenderer = "agGroupCellRenderer";
                    }
                    if (item.column_name === "dc_code") {
                        item.cellRenderer = (cellProps) => {
                            if (cellProps?.data?.dc_code && cellProps?.data?.excess_deficit_tag) {
                                const color = cellProps?.data?.excess_deficit_tag === "Excess" ? 'green' : 'red'
                                return <span>{`${cellProps?.data?.dc_code} `} <span style={{
                                    fontSize: '10px',
                                    borderRadius: '5px',
                                    marginLeft: '5px', color,
                                    padding: "4px",
                                    border: `1px solid ${color}`
                                }}>{`${cellProps?.data?.excess_deficit_tag}`}</span></span>
                            }
                            else return null
                        };
                    }
                    return item;
                });
            }
            props?.setDcTransferReviewColumns({ selectedTab, columns });
        };
        if (selectedTab) {
            if (props?.reviewData[selectedTab?.id]['columns'] === null) {
                getColumns();
            }
        }
    }, [selectedTab])


    useEffect(() => {
        if (props?.articlesSelectedForReview.length > 0) {
            setSelectedArticle(props?.articlesSelectedForReview[0])
            let allUnReviewed = props?.articlesSelectedForReview.map((thisArticle) => { return thisArticle?.value })
            props?.setUnReviewedArticles(allUnReviewed)
        }
    }, [props?.articlesSelectedForReview.length])

    const onTabChangeHandler = async (_event, p_tabValue) => {
        setSelectedTab(tabs[p_tabValue - 1]);
    };

    const onArticleChange = (option) => {
        console.log('onArticleChange',onArticleChange)
        setSelectedArticle(option)
    }

    const renderTabComponents = () => {
        let tabPanels = []
        tabPanels.push(<ReviewRecommendation selectedFilters={props?.selectedFilters}
            columns={props?.reviewData['review_recommendation']['columns'] || []}
            selectedArticle={selectedArticle}
            selectedTab={selectedTab}
            setShowReview={props?.setShowReview}
            dcTransferTableInstance={props?.dcTransferTableInstance}
            onArticleChange = {onArticleChange}
            options={props?.articlesSelectedForReview || []}
        />)
        tabPanels.push(<ReviewSizes selectedFilters={props?.selectedFilters}
            columns={props?.reviewData['review_sizes']['columns'] || []}
            selectedArticle={selectedArticle}
            selectedTab={selectedTab}
            onArticleChange = {onArticleChange}
            options={props?.articlesSelectedForReview || []}
        />)
        return tabPanels
    }

    return (
        <>
            <div className={clsx(classes.container, globalClasses.marginAround)}>
                <Loader loader={props.storeDcTableLoader}>
                    <div>
                        {!isEmpty(selectedArticle) && <Tabs
                            value={selectedTab?.value}
                            onChange={onTabChangeHandler}
                            tabNames={tabs}
                            tabPanels={renderTabComponents()}
                        />}
                    </div>
                </Loader>
            </div>

        </>
    );
};

const mapStateToProps = (store) => {
    const { inventorysmartReducer, filterReducer } = store;
    return {
        reviewData:
            inventorysmartReducer.inventorySmartDcTransferService
                .reviewData,
        unReviewedArticles:
            inventorysmartReducer.inventorySmartDcTransferService
                .unReviewedArticles,
        reviewedArticles:
            inventorysmartReducer.inventorySmartDcTransferService
                .reviewedArticles,
        dc_transfer_code:
            inventorysmartReducer.inventorySmartDcTransferService
                .dc_transfer_code,
    };
};
const mapDispatchToProps = (dispatch) => {
    return {
        addSnack: (payload) => dispatch(addSnack(payload)),
        setDcTransferReviewData: (body) =>
            dispatch(setDcTransferReviewData(body)),

        setDcTransferReviewColumns: (body) =>
            dispatch(setDcTransferReviewColumns(body)),
        getDcToDcReviewData: (body) => dispatch(getDcToDcReviewData(body)),
        setUnReviewedArticles: (body) => dispatch(setUnReviewedArticles(body)),
        moveToReviewed: (body) => dispatch(moveToReviewed(body))
    };
};

export default connect(mapStateToProps, mapDispatchToProps)(ReviewComponent);
