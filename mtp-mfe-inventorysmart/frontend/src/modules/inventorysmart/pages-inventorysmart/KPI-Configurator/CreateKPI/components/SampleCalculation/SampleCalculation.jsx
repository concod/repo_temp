import { Panel, AccordionModern, Alert, Button } from "impact-ui-v3";
import SampleSection from "./SampleSection";
import { useEffect, useState } from "react";
import { getSampleCalculation } from "modules/inventorysmart/services-inventorysmart/KPI-Configurator/create-kpi-service";
import { generateFormulaDisplay, buildFormulaComponents } from "../../../utils/helperFunctions";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import { utils, write } from "xlsx-js-style";
import * as FileSaver from "file-saver";
import DownloadIcon from "@mui/icons-material/Download";
import { Box } from "@mui/material";
import { formatStringDate } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

const SampleCalculation = (props) => {
    const { closePanel, showPanel, kpiName, kpiDescription, formulaComponents } = props;
    const [loading, setLoading] = useState(false);
    const [sampleCalculationResponse, setSampleCalculationResponse] = useState(null);
    const [expanded, setAccordionExpand] = useState(["accord_1"]);
    const [showWarning, setShowWarning] = useState(false);
    const { tenantDateFormat } = getTenantTimeZoneDetails();

    const displaySnackMessages = (message, variance) => {
        props.addSnack({
            message: message,
            options: {
                variant: variance,
            },
        });
    };

    // function to format cell values for Excel export
    const formatCellValue = (value, key) => {
        if (Number.isFinite(Number(value))) {
            return Number(value);
        } else if (key === "date") {
            return formatStringDate(value, false, false, tenantDateFormat);
        }
        return value;
    };

    // function to format column headers 
    const formatHeaders = (headers) => {
        return headers.map((header) =>
            header
                .toString()
                .replace("_", " ")  
                .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1))
        );
    };
    const downloadSampleCalculation = () => {
        try {
            if (!sampleCalculationResponse) {
                displaySnackMessages("No data available to download", "warning");
                return;
            }

            const workbook = utils.book_new();
            const kpiInfoRows = [
                ["KPI Name:", kpiName || ""],
                ["KPI Description:", kpiDescription || ""],
                ["Formula:", generateFormulaDisplay(formulaComponents) || ""],
                []
            ];

            // Process Sample Input Data - create a separate sheet for each data source
            if (sampleCalculationResponse?.sample_data) {
                Object.entries(sampleCalculationResponse.sample_data).forEach(
                    ([sectionKey, sectionValue]) => {
                        if (sectionValue && sectionValue.length > 0) {
                            // Extract and format column headers from the first data row
                            const headers = Object.keys(sectionValue[0]);
                            const formattedHeaders = formatHeaders(headers);
                            const dataArray = sectionValue.map((item) =>
                                headers.map((key) => formatCellValue(item[key], key))
                            );
                            const sheetData = [...kpiInfoRows, formattedHeaders, ...dataArray];
                            const worksheet = utils.aoa_to_sheet(sheetData);
                            const sheetName = sectionKey.substring(0, 31);
                            utils.book_append_sheet(workbook, worksheet, sheetName);
                        }
                    }
                );
            }

            // Add SKU-Store Level calculation results sheet
            if (sampleCalculationResponse?.article_store_data && 
                sampleCalculationResponse.article_store_data.length > 0) {
                const skuStoreData = sampleCalculationResponse.article_store_data;
                const headers = Object.keys(skuStoreData[0]);
                const formattedHeaders = formatHeaders(headers);
                const dataArray = skuStoreData.map((item) =>
                    headers.map((key) => formatCellValue(item[key], key))
                );
                const sheetData = [...kpiInfoRows, formattedHeaders, ...dataArray];
                const worksheet = utils.aoa_to_sheet(sheetData);
                utils.book_append_sheet(workbook, worksheet, "SKU-Store Level");
            }

            // Add Article Level calculation results sheet
            if (sampleCalculationResponse?.article_data && 
                sampleCalculationResponse.article_data.length > 0) {
                const articleData = sampleCalculationResponse.article_data;
                const headers = Object.keys(articleData[0]);
                const formattedHeaders = formatHeaders(headers);
                const dataArray = articleData.map((item) =>
                    headers.map((key) => formatCellValue(item[key], key))
                );
                const sheetData = [...kpiInfoRows, formattedHeaders, ...dataArray];
                const worksheet = utils.aoa_to_sheet(sheetData);
                utils.book_append_sheet(workbook, worksheet, "Article Level");
            }

            const excelBuffer = write(workbook, {
                bookType: "xlsx",
                type: "array",
            });

            const fileType =
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
            const excelBlob = new Blob([excelBuffer], { type: fileType });
            const fileName = `${kpiName || "KPI"}_Sample_Calculation.xlsx`;
            FileSaver.saveAs(excelBlob, fileName);

            displaySnackMessages("Sample calculation downloaded successfully", "success");
        } catch (error) {
            console.error("Error downloading sample calculation:", error);
            displaySnackMessages("Error downloading sample calculation", "error");
        }
    };

    useEffect(() => {
        const fetchSampleCalculation = async () => {
            try {
                setLoading(true);
                const payload = {
                    kpi_name: kpiName || "",
                    kpi_description: kpiDescription || "",
                    formula_display: generateFormulaDisplay(formulaComponents),
                    formula_components: buildFormulaComponents(formulaComponents),
                };

                const response = await props.getSampleCalculation(payload);
                if (response?.data?.status) {
                    setSampleCalculationResponse(response?.data?.data || response?.data || null);
                }
                else {
                    displaySnackMessages(response.data?.message || "Error in fetching sample data", "error");
                }
            } catch (e) {
                setSampleCalculationResponse(null);
                displaySnackMessages(e?.response?.data?.message || "Error in fetching sample data", "error");
            } finally {
                setLoading(false);
            }
        };

        if (showPanel) {
            setShowWarning(true);
            fetchSampleCalculation();
        }
    }, [showPanel]);

    return (
        <Panel
            title="Sample Calculation"
            size="large"
            anchor="right"
            onClose={closePanel}
            aria-labelledby="customized-dialog-title"
            open={showPanel}
            width={800}
        >
            {showWarning &&
            <Alert 
                severity="warning" 
                style={{ marginBottom: '16px', width: '100%' }}
                description="Sample data is used for this calculation. Results may not match production data and are shown only to help you validate the formula and calculation logic."
                onClose={() => {setShowWarning(false)}}
                subtleBackground={true}
            />
            }
            {/* Download Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <Button
                    icon={<DownloadIcon />}
                    onClick={downloadSampleCalculation}
                    title="Download"
                    disabled={!sampleCalculationResponse || isEmpty(sampleCalculationResponse)}
                    type="default"
                    variant="tertiary"
                    sx={{ background: '#f5f6fa !important', border: 'none !important' }}
                />
            </Box>
            <Loader
                loader={loading}
                text="Loading sample data..."
            >
                {!loading && !isEmpty(sampleCalculationResponse) ?
                    <AccordionModern
                        data={[
                            {
                                content: Object.entries(sampleCalculationResponse?.sample_data || {}).map(
                                    ([sectionKey, sectionValue]) => (
                                        <SampleSection sectionLabel={sectionKey} data={sectionValue || []} />
                                    )
                                ),
                                header: "Sample Input Data",
                                id: 1,
                                value: "accord_1"
                            },
                            {
                                content:
                                    <>
                                        <SampleSection sectionLabel="SKU Store Level" data={sampleCalculationResponse?.article_store_data || []} />
                                        <SampleSection sectionLabel="Article Level" data={sampleCalculationResponse?.article_data || []} />
                                    </>,
                                header: 'Calculated Result',
                                id: 2,
                                value: "accord_2"
                            }
                        ]}
                        isMultiExpanded={true}
                        expanded={expanded}
                        onChange={(activeAccordion) => {
                            setAccordionExpand((prev) =>
                                prev.includes(activeAccordion)
                                    ? prev.filter((val) => val !== activeAccordion)
                                    : [...prev, activeAccordion]
                            );
                        }}
                        setExpanded={(activeAccordion) => {
                            if (Array.isArray(activeAccordion)) {
                                setAccordionExpand(activeAccordion);
                            }
                        }}
                    />
                    : <></>}
            </Loader>
        </Panel>
    )
}


const mapDispatchToProps = (dispatch) => ({
    addSnack: (payload) => dispatch(addSnack(payload)),
    getSampleCalculation: (payload) => dispatch(getSampleCalculation(payload))
});

export default connect(null, mapDispatchToProps)(SampleCalculation);
