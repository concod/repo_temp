import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Radio,
    RadioGroup,
    TextField,
  } from "@mui/material";
  import { reportRadioList } from "modules/plansmart/constants-plansmart/stringConstants";
  import React, { useEffect, useState } from "react";
  import {
    getReportTemplate,
    getReportTemplateColDef,
    getTemplateColDefLoaderSelector,
    getTemplateDataLoaderSelector,
    getTemplateDataSelector,
    saveTemplateLoaderSelector,
    setGetTemplateColDefLoader,
  } from "../../services-plansmart/Report/report-services";
  import { connect } from "react-redux";
  //import Table from "../../../../Utils/reactTable";
  import LoadingOverlay from "core/Utils/Loader/loader";
  import CloseIcon from "@mui/icons-material/Close";
  import AgGridComponent from "core/Utils/agGrid";
  // import columnFormatter from "Utils/reactTable/components/column-formatter";
  
  function ReportPreferenceModal({
    open,
    onClose,
    handleSubmit,
    saveTemplateLoader,
    generateSnackMessages,
    getColumnsReq,
    getReportTemplateReq,
    templateDataLoader,
    templateColDefLoader,
    templateData,
    setGetTemplateColDefLoaderReq,
    updateFilter,
  }) {
    const [templateName, setTemplateName] = useState("");
    const [templateType, setTemplateType] = useState("");
    const [templateTableColDef, setTemplateTableColDef] = useState([]);
  
    const [selectedRows, setSelectedRows] = useState([]);
  
    // useEffect(async () => {
    //   try {
    //     setGetTemplateColDefLoaderReq(true);
    //     const response = await getColumnsReq();
    //     // const formattedData = columnFormatter(response.data.data);
    //     const disabledSortBy = formattedData.map((column) => {
    //       if (column.type === "date")
    //         return {
    //           ...column,
    //           dateFormatter: "MM/DD/YYYY",
    //           disableSortBy: true,
    //         };
    //       return {
    //         ...column,
    //         disableSortBy: true,
    //       };
    //     });
    //     setTemplateTableColDef(disabledSortBy);
    //   } catch (error) {
    //     generateSnackMessages("Error while fetching template columns", "error");
    //   }
    //   setGetTemplateColDefLoaderReq(false);
    //   getReportTemplateReq();
    // }, []);
  
    useEffect(() => {
      setTemplateName("");
      setTemplateType("");
    }, [open]);
  
    const onSubmit = () => {
      if (!templateName) {
        generateSnackMessages("Please give a template name", "error");
        return;
      }
      if (!templateType) {
        generateSnackMessages("Please select template type", "error");
        return;
      }
      handleSubmit({
        templateName: templateName,
        templateType: templateType,
      });
    };
    const getSelectedRows = () => {
      const selectedRowObj = {};
      selectedRows.forEach((row) => {
        selectedRowObj[row.index] = true;
      });
      return selectedRowObj;
    };
  
    const handleFilter = () => {
      if (selectedRows.length > 1) {
        generateSnackMessages("Please select only one option", "error");
      } else {
        updateFilter(selectedRows[0].original);
      }
    };
  
    return (
      <Dialog open={open} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <div>Template Name</div>
            <div onClick={onClose}>
              <CloseIcon />
            </div>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" alignItems="center">
            <Box>Please enter Template Name</Box>
            <Box
              ml={4}
              component={TextField}
              variant="outlined"
              size="small"
              placeholder="Enter Name"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
          </Box>
          <Box
            component={RadioGroup}
            justifyContent="flex-start"
            mt={3}
            row
            onChange={(e) => setTemplateType(e.target.value)}
          >
            {reportRadioList.map((radio, inx) => (
              <FormControlLabel
                value={radio.value}
                control={<Box component={Radio} ml={inx !== 0 ? 4 : 0} />}
                label={radio.label}
              />
            ))}
          </Box>
          <Box mt={2} display="flex" justifyContent="end">
            <Button
              variant="contained"
              color="primary"
              onClick={onSubmit}
              disabled={saveTemplateLoader}
            >
              Save
            </Button>
          </Box>
          <Box mt={2} mb={2}>
            <LoadingOverlay loader={templateDataLoader || templateColDefLoader}>
              <AgGridComponent
                tableId="plansmartReportDashboardTable"
                rowdata={templateData}
                columns={templateTableColDef}
                showPagination={true}
                rowSelection={true}
                selectedRows={getSelectedRows()}
                selectedRowHandler={(data) => setSelectedRows(data)}
              />
            </LoadingOverlay>
          </Box>
        </DialogContent>
        <Box component={DialogActions} px={3}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleFilter}
            disabled={selectedRows.length === 0}
          >
            Open
          </Button>
        </Box>
      </Dialog>
    );
  }
  
  const mapState = (state) => ({
    saveTemplateLoader: saveTemplateLoaderSelector(state),
    templateDataLoader: getTemplateDataLoaderSelector(state),
    templateColDefLoader: getTemplateColDefLoaderSelector(state),
    templateData: getTemplateDataSelector(state),
  });
  
  const mapDispatch = (dispatch) => {
    return {
      getColumnsReq: (payload) => dispatch(getReportTemplateColDef(payload)),
      getReportTemplateReq: () => dispatch(getReportTemplate()),
      setGetTemplateColDefLoaderReq: (payload) =>
        dispatch(setGetTemplateColDefLoader(payload)),
    };
  };
  
  export default connect(mapState, mapDispatch)(ReportPreferenceModal);
  