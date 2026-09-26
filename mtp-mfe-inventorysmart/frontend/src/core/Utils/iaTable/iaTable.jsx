import IATable from "ia-table";

const AITable = (props) => {
  const {
    tableHeader,
    columns,
    manualCallBack,
    onCellValueChanged,
    onSelectionChanged,
    loadTableInstance,
    topRightOptions,
    rowModelType,
    uniqueRowId,
    childKey,
    tableName,
    tableId,
    alignedGrids,
    tableRef,
    headerHeight,
    pageSize = 10,
    masterDetail = false,
    detailCellRenderer,
    rowdata = [],
    autoFetch = true,
    paginationPageSize = 10,
    pagination = true,
    selectAllHeaderComponent = false,
    adjustTableHeightServerSide = true,
    enableRowSpan = true,
    rowSpanColumn = [],
    getRowData = () => {},
    minWidth = 150,
    getRowStyle,
    pinnedTopRowData,
    pinnedBottomRowData,
    rowDragManaged,
    onGridReadyCallBack,
    customCellRenderer,
    noEditableCustomCellRender,
    downloadAsExcel = false,
    downloadAsCSV = false,
    copyToClipboard = false,
    copyToClipboardHandler,
    downloadExcelHandler,
    downloadCSVHandler,
    // Other Functions
    onEditClick,
    callDeleteApi,
    onChartClick,
    onReviewClick,
    onImageClick,
    customAggFunction,
    onColumnVisible,
    onRangeSliderChange,
    isEditDisabled,
    isDeleteDisabled,
    onBlur,
    customFunction,
    onToggleChange,
    onChangeHandler,
    onDownloadClick,
    onInfoClick,
    onApplyCalendarDates,
    lockCellApi,
    callBackOnChangeCustomFunction,
  } = props;

  const gridOptions = {};

  if (onEditClick) {
    gridOptions.onEditClick = onEditClick;
  }
  if (callDeleteApi) {
    gridOptions.callDeleteApi = callDeleteApi;
  }
  if (onChartClick) {
    gridOptions.onChartClick = onChartClick;
  }
  if (onReviewClick) {
    gridOptions.onReviewClick = onReviewClick;
  }
  if (onImageClick) {
    gridOptions.onImageClick = onImageClick;
  }
  if (customAggFunction) {
    gridOptions.customAggFunction = customAggFunction;
  }
  if (onColumnVisible) {
    gridOptions.onColumnVisible = onColumnVisible;
  }
  if (onRangeSliderChange) {
    gridOptions.onRangeSliderChange = onRangeSliderChange;
  }
  if (isEditDisabled) {
    gridOptions.isEditDisabled = isEditDisabled;
  }
  if (isDeleteDisabled) {
    gridOptions.isDeleteDisabled = isDeleteDisabled;
  }
  if (onBlur) {
    gridOptions.onBlur = onBlur;
  }
  if (customFunction) {
    gridOptions.customFunction = customFunction;
  }
  if (onToggleChange) {
    gridOptions.onToggleChange = onToggleChange;
  }
  if (onChangeHandler) {
    gridOptions.onChangeHandler = onChangeHandler;
  }
  if (onDownloadClick) {
    gridOptions.onDownloadClick = onDownloadClick;
  }
  if (onInfoClick) {
    gridOptions.onInfoClick = onInfoClick;
  }
  if (onApplyCalendarDates) {
    gridOptions.onApplyCalendarDates = onApplyCalendarDates;
  }
  if (lockCellApi) {
    gridOptions.lockCellApi = lockCellApi;
  }
  if (callBackOnChangeCustomFunction) {
    gridOptions.callBackOnChangeCustomFunction = callBackOnChangeCustomFunction;
  }
  if (customCellRenderer) {
    gridOptions.customCellRenderer = customCellRenderer;
  }
  if (noEditableCustomCellRender) {
    gridOptions.noEditableCustomCellRender = noEditableCustomCellRender;
  }

  const onGridReady = (params) => {
    if (onGridReadyCallBack) onGridReadyCallBack(params);
  };

  return (
    <IATable
      tableHeader={tableHeader}
      alignedGrids={alignedGrids}
      ref={tableRef}
      tableId={tableId}
      gridOptions={gridOptions}
      columns={columns}
      data={rowdata}
      fetchData={manualCallBack}
      autoFetch={autoFetch}
      height="calc(80vh - 120px)"
      onRowClick={() => {}}
      onCellClick={() => {}}
      onCellValueChanged={onCellValueChanged}
      onSelectionChanged={onSelectionChanged}
      selectable={selectAllHeaderComponent}
      adjustTableHeightServerSide={adjustTableHeightServerSide}
      expandable={false}
      headerHeight={headerHeight}
      showFooter={pagination}
      infiniteScroll={rowModelType === "infinite" ? true : false}
      pagination={rowModelType === "infinite" ? false : true}
      defaultPageSize={paginationPageSize || pageSize}
      showToolbar={true}
      showFilters={false}
      uniqueIdField={uniqueRowId}
      childKeyField={childKey}
      loadTableInstance={loadTableInstance}
      topRightOptions={topRightOptions}
      tableName={tableName}
      masterDetail={masterDetail}
      detailCellRenderer={detailCellRenderer}
      defaultColDef={{ minWidth }}
      enableRowSpan={enableRowSpan}
      rowSpanColumn={rowSpanColumn}
      getRowData={getRowData}
      getRowStyle={getRowStyle}
      pinnedTopRowData={pinnedTopRowData}
      pinnedBottomRowData={pinnedBottomRowData}
      rowDragManaged={rowDragManaged}
      onGridReady={onGridReady}
      downloadAsExcel={downloadAsExcel}
      downloadAsCSV={downloadAsCSV}
      copyToClipboard={copyToClipboard}
      copyToClipboardHandler={copyToClipboardHandler}
      downloadExcelHandler={downloadExcelHandler}
      downloadCSVHandler={downloadCSVHandler}
    />
  );
};

export default AITable;
