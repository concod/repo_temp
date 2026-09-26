export default {
  // UploadForecast
  "ada.uploadForecast.uploadButton": "Upload",
  "ada.uploadForecast.saveChanges": "Save changes",
  "ada.uploadForecast.cancel": "Cancel",

  // DownloadForecast
  "ada.downloadForecast.download": "Download",
  "ada.downloadForecast.title": "Download Forecast",
  "ada.downloadForecast.subHeading":
    "Only saved forecast will be downloaded, please save all the forecast before downloading",
  "ada.downloadForecast.downloadForecastButton": "Download Forecast",
  "ada.downloadForecast.cancel": "Cancel",

  // DailyForecastConfirmPopup
  "ada.dailyForecastConfirm.heading": "Confirm",
  "ada.dailyForecastConfirm.weekly": "Weekly",
  "ada.dailyForecastConfirm.daily": "Daily",
  "ada.dailyForecastConfirm.message":
    "For any forecast window of 12 weeks or lesser, you may choose between weekly and daily level forecast downloads. Please pick one option to proceed",

  // Edit Forecast - Deep Dive tabs prompt
  "ada.editForecast.changingTabsTitle": "Changing Tabs?",
  "ada.editForecast.changingTabsSubHeading":
    "Are you sure you want to change tabs?",
  "ada.editForecast.unsavedChangesLost": "Any unsaved changes will be lost.",
  "ada.editForecast.yes": "Yes",
  "ada.editForecast.no": "No",

  // Forecast Refresh in Progress prompt
  "ada.forecast.refreshInProgressTitle": "Forecast Refresh in Progress",
  "ada.forecast.refreshInProgressMessage":
    "Manual forecast overrides are currently blocked as the forecast edits are in progress.",
  "ada.forecast.ok": "OK",

  // Modification of Locked Cell prompt
  "ada.editChildHierarchy.lockedCellTitle":
    "Modification of Locked Cell Impacts Forecast",
  "ada.editChildHierarchy.lockedCellMessageTemplate":
    "You've modified L2 & edited & locked current cell. If you unlock this cell it will impact the adjusted forecast. Please save your changes before editing the locked {{aggregateTimeName}}.",
  "ada.editChildHierarchy.goBack": "Go Back",
  "ada.editChildHierarchy.saveChanges": "Save Changes",

  // Dashboard tab - unsaved changes prompt
  "ada.dashboardTab.unsavedChangesTitle": "You have unsaved changes.",
  "ada.dashboardTab.discardChangesMessage": "Do you want to discard them?",
  "ada.dashboardTab.cancel": "Cancel",
  "ada.dashboardTab.discardChanges": "Discard Changes",

  // Dashboard - leaving page prompt
  "ada.dashboard.leavingPageTitle": "Leaving Page?",
  "ada.dashboard.leavingPageMessage":
    "Are you sure you want to leave the page?",
  "ada.dashboard.unsavedChangesLost": "Any unsaved changes will be lost.",
  "ada.dashboard.continue": "Continue",
  "ada.dashboard.cancel": "Cancel",

  // Driver forecast table - Bulk Promo Upload panel
  "ada.driverForecastTable.bulkPromoUploadTitle": "Bulk Promo Upload",
  "ada.driverForecastTable.saveChanges": "Save changes",

  // MFP Dashboard - Breadcrumb
  "ada.mfpBreadcrumb.home": "Home",
  "ada.mfpBreadcrumb.adaVisual": "ADA Visual",

  // MFP Dashboard - Accordion titles
  "ada.accordionTitles.overview": "Forecast Overview",
  "ada.accordionTitles.kpi": "Forecast KPIs",
  "ada.accordionTitles.summary": "Forecast Summary Table",
  "ada.accordionTitles.visual": "Forecast Visualization",
  "ada.accordionTitles.decisionDashboard": "Demand Selection - Details Table",

  // Demand Selection Table
  "ada.demandSelection.tableHeader": "Demand Selection - Details Table",
  "ada.demandSelection.resetSelection": "Reset Selection",
  "ada.demandSelection.setAllLabelTemplate": "Set All {{label}}",
  "ada.demandSelection.setAllEpFeed": "Set All EP Feed",
  "ada.demandSelection.setAllAdjustedUserForecast":
    "Set All Adjusted User Forecast",
  "ada.demandSelection.approveFinalForecast": "Approve Final Forecast",
  "ada.demandSelection.approveBeforeEditing":
    "Please approve the {{forecastType}} before editing.",
  "ada.demandSelection.noSelectedRows": "No Selected Rows",
  "ada.demandSelection.approvedSuccessfully": "Approved Successfully",
  "ada.demandSelection.somethingWentWrong": "Something went wrong",
  "ada.demandSelection.selectSingleForecastType":
    "please select a single final forecast type for particular {{columnLabel}}",
  "ada.demandSelection.downloadRequestRunning":
    "Download Request is running in background. You will get a notification once it is ready to download",
  "ada.demandSelection.errorWhileDownloading": "Error while downloading",

  // Edit Choice Popup
  "ada.editChoicePopup.andChannel": "and Channel:-",

  // No Data Found
  "ada.noDataFound.title": "No data found",
  "ada.noDataFound.description":
    "Click on select filters to filter and view data",

  // Dashboard Filters
  "ada.dashboardFilters.mandatoryFieldError": "Select all mandatory filters",

  // Forecast Multiplier Messages
  "ada.forecastMultiplier.disablingMultiplierMessage":
    "Since the Adjusted IA Forecast is 0, the edit on the multiplier is disabled.",
  "ada.forecastMultiplier.disableSaveAfter8WeekChange":
    "Please save before proceeding, save button will be disabled, if you will make changes for more than",
  "ada.forecastMultiplier.invalidMultiplierValue":
    "Invalid input: Zero and Negative values are not allowed for the multiplier. The multiplier has been reset to last updated value.",
  "ada.forecastMultiplier.invalidAdjustedUserForecastValue":
    "Invalid input: Zero and Negative values are not allowed for the adjusted user forecast. The adjusted user forecast has been reset to last updated value.",

  // Edit Hierarchy Messages
  "ada.editHierarchy.disablingEditHierarchyMessage":
    "Since the forecast is not available for some or all of the cells, editing on these cells is disabled.",
  "ada.editHierarchy.disablingDiscountValueMessage":
    "Since the discount value is not available for some or all of the cells, editing on these cells is disabled.",
  "ada.editHierarchy.disablingZeroTotalRow":
    "Since the Forecast is 0, the edit on the Total Row is disabled.",
  "ada.editHierarchy.valueChangedWarning":
    "Looks like you changed this {{level}} {{skuName}} value in the current column {{column}} in some way. Kindly either lock the current sku value or save it beforehand",

  // Edit Hierarchy Validation Messages
  "ada.editHierarchy.valueResetMoreThanL0Total":
    "Value for current row - {{column}} has been reset as entered value is more than L0 total",
  "ada.editHierarchy.valueResetL1MoreThanL0Total":
    "Value for current row - {{column}} has been reset as L1 total is more than L0 total",
  "ada.editHierarchy.valueResetCannotReadjust":
    "Value for {{row}} - {{column}} has been reset because value can't be readjusted as all cells in upper hierarchy are locked or that is the only cell",
  "ada.editHierarchy.valueResetL1Change":
    "Value for {{row}} - {{column}} has been reset as changing L1 value to {{newValue}} is making L1 {{l1Key}} to {{value}}",
  "ada.editHierarchy.valueResetLockedL2":
    "Value for {{row}} - {{column}} has been reset because there are some locked L2 in other L1(s)",
  "ada.editHierarchy.valueResetCollapsedL1":
    "Value for current row - {{column}} has been reset as one of the collapsed L1 has locked L2 value",
  "ada.editHierarchy.valueResetL2NotLocked":
    "Value for {{row}} - {{column}} has been reset as this L1 is not locked and there is no other L1 to accumulate the difference",
  "ada.editHierarchy.valueResetL2SumGreater":
    "Value for {{row}} - {{column}} has been reset as sum of all L2 is becoming {{sum}} which is greater than Locked Parent i.e. {{value}}",
  "ada.editHierarchy.valueResetAffectOtherL1":
    "Value for {{row}} - {{column}} has been reset as changing this value will affect other L1's",
  "ada.editHierarchy.valueResetL1SumGreater":
    "Value for {{row}} - {{column}} has been reset as sum of all L1's is becoming {{sum}} which is greater than Locked L0 total",
  "ada.editHierarchy.valueResetL1SumLess":
    "Value for {{row}} - {{column}} has been reset as sum of all L1's is becoming {{sum}} which is less than Locked L0 total",
  "ada.editHierarchy.valueResetCollapsedL1L2":
    "Value for current row - {{column}} has been reset as one of the collapsed L1 has locked L2 value",
  "ada.editHierarchy.valueResetSKUtotalMoreThanL0":
    "Value for current row - {{column}} has been reset as SKU total is more than L0 total",
  "ada.editHierarchy.valueResetL0Change":
    "Value for {{row}} - {{column}} has been reset as changing L0 value to {{newValue}} is making L1 {{l1Key}} to {{value}}",
  "ada.editHierarchy.valueResetGreaterThanHierarchy":
    "Value for {{row}} - {{column}} has been reset as updated value is greater than it's hierarchy",
  "ada.editHierarchy.valueResetSomeCellsZero":
    "Value for current row - {{column}} has been reset as either some/all cell values are 0 or All cell's are locked",
  "ada.editHierarchy.valueResetLessThanLockedSum":
    "Value for current row - {{column}} has been reset as it's value is less than locked cell sum",
  "ada.editHierarchy.valueResetCollapsedLockedL2":
    "Value for current row - {{column}} has been reset as one of the collapsed L1 has locked L2 value",
  "ada.editHierarchy.valueResetActiveL0LockedL1":
    "Value for current row - {{column}} has been reset as one of the active L0 has locked L1 Value",
  "ada.editHierarchy.valueResetDepartmentChange":
    "Value for {{row}} - {{column}} has been reset as changing department value to {{newValue}} is making L1 {{l1Key}} to {{value}}",
  "ada.editHierarchy.valueResetEditedL1NotActive":
    "Value for current row - {{column}} has been reset as you have edited atleast one L1 & it's not active on the user interface",
  "ada.editHierarchy.valueResetLockL1ChangeL0":
    "Value for {{row}} - {{column}} has been reset as this operation is disabled i.e. Lock L1 and change L0 Total. Save previous operations before proceeding with this operation",
  "ada.editHierarchy.valueResetLockL2ChangeL0":
    "Value for {{row}} - {{column}} has been reset as this operation is disabled i.e. Lock L2 and change L0 Total. Please save changes before proceeding with this operation",
  "ada.editHierarchy.valueResetLockedHierarchyValue":
    "Value for current row - {{column}} has been reset as one of the {{level}} has locked {{lockedLevel}} value. Save previous operations before proceeding with this operation",

  // Common Messages
  "ada.common.noChangeDetected": "No change detected",
  "ada.common.forecastSaveInProgress":
    "Forecast Save in progress, this might take some time",
  "ada.common.forecastSavedSuccessfully": "Forecast Saved successfully",
  "ada.common.forecastUpdateFailed": "Forecast update failed. Please try again",
  "ada.common.forecastSavedReload":
    "Forecast saved successfully. Please reload to view the latest data",
  "ada.common.errorWhileDownloading": "Error while downloading",
  "ada.common.downloadSaveForecastWarning":
    "Download and Save Forecast are disabled for more than {{weeks}} weeks",
  "ada.common.historicDateResetWarning":
    "Saved Filter contained historic start date, that has been reset to current date",
  "ada.common.invalidMultiplierValue":
    "Invalid input: Zero and Negative values are not allowed for the multiplier. The multiplier has been reset to last updated value.",
  "ada.common.invalidAdjustedUserForecastValue":
    "Invalid input: Zero and Negative values are not allowed for the adjusted user forecast. The adjusted user forecast has been reset to last updated value.",
  "ada.common.predictedForecastZeroWarning":
    "Since Predicted forecast is 0. Hence, updating Adjusted User Forecast in Forecast Deepdive won't update the Adjusted User Forecast in Visualization section",
  "ada.common.noDataApplicable": "No data applicable for selected filters.",
  "ada.common.noDataAvailableForWeek": "No data available for this week",
  "ada.common.selectAllMandatoryFilters": "Select all mandatory filters",
  "ada.common.selectCurrentOrFutureDate":
    "Please select start date as current week or a future date",
  "ada.common.maxDateRange6Months":
    "Please make sure you select a maximum date range of 6 months",
  "ada.common.onlySavedForecastDownloaded":
    "Only saved forecast will be downloaded, please save all the forecast before downloading",
  "ada.common.oneWeek": "1 week",
  "ada.common.oneMonth": "1 Month",
  "ada.common.twoMonths": "2 Months",
  "ada.common.iaRecommendedForecast": "IA Recommended Forecast",
  "ada.common.forecastAccuracyOverLast": "Forecast Accuracy Over last",
  "ada.common.originalIAForecast": "Original IA Forecast",
  "ada.common.adjustedIAForecast": "Adjusted IA Forecast",
  "ada.common.scenario1IAForecast": "Scenario 1 IA Forecast",
  "ada.common.userForecast": "User Forecast",
  "ada.common.seeHistoricView": "See Historic View",
  "ada.common.promoWeekDiscountValue": "Promo Week Discount Value",
  "ada.common.percentOff": "% Off",
  "ada.common.promoType": "Promo Type",
  "ada.common.discountValue": "Discount Value",
  "ada.common.effectiveDiscountPercentage": "Effective Discount Percentage",
  "ada.common.discountValueBlankOrBetween1And100":
    "Discount Value should be either blank or between 1 and 100",
  "ada.common.discountValueNotAvailableEditingDisabled":
    "Since the discount value is not available for some or all of the cells, editing on these cells is disabled.",
  "ada.common.ifDiscountTypePercentOffValueBetween1And100":
    'If discount type is "%Off", then the discount value should be between 1 and 100 (inclusive).',
  "ada.common.allowedDiscountTypesOffAndPP":
    'Allowed discount types are "%Off" and "PP"',
  "ada.common.bookPriceGreaterThanZero":
    "The book price must be greater than 0.",
  "ada.common.includeExcludeAsIAndE":
    "Include and exclude are to be provided as I and E, respectively.",
  "ada.common.endDateGreaterThanStartDate":
    "The end date should be greater than the start date.",
  "ada.common.forecastZeroEditTotalRowDisabled":
    "Since the Forecast is 0, the edit on the Total Row is disabled.",
  "ada.common.discountPercent": "Discount %",
  "ada.common.actualsDiscountPercent": "Actuals Discount %",
  "ada.common.lastYearDiscountPercent": "Last year Discount %",
  "ada.common.fyYearDiscountPercent": "FY {{year}} Discount %",
  "ada.common.noDataFound": "No data found",
  "ada.common.clickOnSelectFiltersToFilterAndViewData":
    "Click on select filters to filter and view data",
  "ada.common.forecastOverview": "Forecast Overview",
  "ada.common.forecastKPIs": "Forecast KPIs",
  "ada.common.forecastSummaryTable": "Forecast Summary Table",
  "ada.common.forecastVisualization": "Forecast Visualization",
  "ada.common.demandSelectionDetailsTable": "Demand Selection - Details Table",
  "ada.common.pleaseSaveBeforeProceeding":
    "Please save before proceeding, save button will be disabled, if you will make changes for more than",
  "ada.common.adjustedIAForecastZeroEditMultiplierDisabled":
    "Since the Adjusted IA Forecast is 0, the edit on the multiplier is disabled.",
  "ada.common.forecastNotAvailableEditingDisabled":
    "Since the forecast is not available for some or all of the cells, editing on these cells is disabled.",
  "ada.common.invalidMultiplierValue":
    "Invalid input: Zero and Negative values are not allowed for the multiplier. The multiplier has been reset to last updated value.",
  "ada.common.invalidAdjustedUserForecastValue":
    "Invalid input: Zero and Negative values are not allowed for the adjusted user forecast. The adjusted user forecast has been reset to last updated value.",
  "ada.common.fyYearActuals": "FY {{year}} Actuals",
  "ada.common.lastYearActuals": "Last year Actuals",
  "ada.common.downloadRequestRunning":
    "Download Request is running in background. You will get a notification once it is ready to download",
  "ada.common.savingDisabledForMoreThan":
    "Saving {{forecastType}} is disabled for more than {{weeks}} weeks",

  // Download Row Limit
  "ada.downloadRowLimit.message":
    "Selected download will result in {{rowCount}} rows. Current limit is 100k. Please try to limit the no. of rows by applying more filters",
  "ada.downloadRowLimit.close": "Close",

  // Dashboard
  "ada.dashboard.addScenario1": "+ Add Scenario 1",
  "ada.dashboard.deleteScenario1": "Delete Scenario 1",
  "ada.dashboard.addScenario2": "+ Add Scenario 2",
  "ada.dashboard.deleteScenario2": "Delete Scenario 2",
  "ada.dashboard.forecastDeepDive": "Forecast Deep Dive",
  "ada.dashboard.driversOfForecast": "Drivers of Forecast",
  "ada.dashboard.visualization": "Visualization",
  "ada.dashboard.scenarioComparisonForecast": "Scenario Comparison Forecast",
  "ada.dashboard.scenarioComparison": "Scenario Comparison",
  "ada.dashboard.forecastManagement": "Forecast Management",
  "ada.dashboard.saveAndFinalizeForecast": "Save & Finalize Forecast",
  "ada.dashboard.viewDriversContribution": "View drivers contribution",
  "ada.dashboard.driversContribution": "Drivers contribution",
  "ada.dashboard.seeChannelDriverContribution":
    "See Channel & Driver Contribution",
  "ada.dashboard.eligibleSKUs": "Eligible SKUs",
  "ada.dashboard.allSKUs": "All SKUs",
  "ada.dashboard.driversOfForecast": "Drivers of Forecast",
  "ada.dashboard.forecastAdjustment": "Forecast Adjustment",
  "ada.dashboard.viewEditHierarchyForecast": "View/edit Hierarchy Forecast",
  "ada.dashboard.selectChannel": "Select Channel",
  "ada.dashboard.selectFiscalYear": "Select Fiscal Year",
  "ada.dashboard.fiscalYear": "Fiscal Year",
  "ada.dashboard.aggregationLevel": "Aggregation level",
  "ada.dashboard.showInitialValues": "Show Initial Values",
  "ada.dashboard.forecastSummary": "Forecast Summary",
  "ada.dashboard.dateRangeAndAggregationLevel":
    "Date range and Aggregation level",
  "ada.dashboard.compareWith": "Compare with",

  // Forecast Multiplier Labels
  "ada.forecastMultiplier.original": "Original",
  "ada.forecastMultiplier.adjusted": "Adjusted",
  "ada.forecastMultiplier.scenario1": "Scenario 1",
  "ada.forecastMultiplier.scenario2": "Scenario 2",

  // No Data Found
  "ada.noDataFound.title": "No data found",
  "ada.noDataFound.description":
    "Click on select filters to filter and view data",

  // Forecast KPI
  "ada.forecastKpi.forecastAccuracyOverLast": "Forecast Accuracy Over last",
  "ada.forecastKpi.week": "week",
  "ada.forecastKpi.weeks": "weeks",
};
