import { useEffect, useState } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import { Button, Modal } from "impact-ui-v3";
import ExpandIcon from "core/coreAssets/chatbot/expand.svg";
import { getFormattedTableConfig } from "../../../../utlis";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext } from "core/actions/smartBotActions";
import { getTableRecords } from "../../../../services/chatbot-services";
const TableContent = ({ bodyText }) => {
  if (isEmpty(bodyText)) {
    return null;
  }

  const {
    table_config,
    row_data,
    display_name = "",
    unique_id,
    select_all_component,
    table_name,
    hide_table_setting = false,
    is_server_side = false,
    page_size = 10,
  } = bodyText;
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const dispatch = useDispatch();

  useEffect(() => {
    let formattedColumns = getFormattedTableConfig(table_config);
    formattedColumns = agGridColumnFormatter(
      formattedColumns,
      {},
      {},
      false,
      null,
      false
    );
    if (isEmpty(columns)) {
      setColumns(formattedColumns);
    }
  }, [table_config]);

  useEffect(() => {
    if (!is_server_side && isEmpty(rowData)) {
      setRowData(row_data);
    }
  }, [row_data]);

  const serverSideManualCallBack = async (manualbody, pageIndex, params) => {
    try {
      const baseUrl = sessionStorage.getItem("stepForm_baseUrl") || "";
      const response = await getTableRecords(baseUrl, table_name, pageIndex + 1, page_size);
      return {
        data: response?.data?.data || [],
        totalCount: response?.data?.total_count || 0,
      };
    } catch (error) {
      console.error("Error in serverSideManualCallBack", error);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const onSelectionChanged = (event) => {
    try {
      const selectedList = event.api.getSelectedRows();
      chatbotContext.tables = {...chatbotContext?.tables, [table_name]: selectedList}
      dispatch(setChatbotContext(chatbotContext));
    } catch (error) {
      console.error("Error in onSelectionChanged", error);
    }
  };

  const getTopRightOptions = () => {
    let options = []
    options.push(
      <Button
        key="expand-button"
        onClick={() => setIsModalOpen(true)}
        size="medium"
        variant="text"
        id="expandTableButton"
        icon={<ExpandIcon />}
      />
    )
    return options
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Modal
        className="test-modal"
        onClose={handleModalClose}
        onPrimaryButtonClick={() => {}}
        onSecondaryButtonClick={handleModalClose}
        open={isModalOpen}
        size="large"
        title={""}
      >
        <div style={{ width: '100%', height: '70vh' }}>
          <AgGridComponent
            columns={columns}
            rowdata={is_server_side ? undefined : rowData}
            pagination={true}
            paginationPageSize={is_server_side ? page_size : 20}
            suppressFieldDotNotation={true}
            domLayout="normal"
            sizeColumnsToFitFlag={true}
            showSaveTableConfig={false}
            showSearchModalBtn={false}
            hideFormatSideBar={true}
            uniqueRowId={unique_id}
            selectAllHeaderComponent={select_all_component}
            onSelectionChanged={onSelectionChanged}
            hideTableSetting={hide_table_setting}
            downloadAsExcel={true}
            tableHeader={display_name}
            {...(is_server_side && {
              manualCallBack: serverSideManualCallBack,
              rowModelType: "serverSide",
              serverSideStoreType: "partial",
              cacheBlockSize: page_size,
            })}
          />
        </div>
      </Modal>
      <div style={{ width: '100%', marginTop: '10px' }}>
        <AgGridComponent
          columns={columns}
          rowdata={is_server_side ? undefined : rowData}
          pagination={true}
          paginationPageSize={is_server_side ? page_size : 10}
          suppressFieldDotNotation={true}
          domLayout="autoHeight"
          customClass="bot_table_auto_height"
          sizeColumnsToFitFlag={true}
          showSaveTableConfig={false}
          showSearchModalBtn={false}
          hideFormatSideBar={true}
          uniqueRowId={unique_id}
          selectAllHeaderComponent={select_all_component}
          onSelectionChanged={onSelectionChanged}
          hideTableSetting={hide_table_setting}
          customSystemButton={getTopRightOptions()}
          customSystemButtonWithDownload={true}
          topRightOptions={null}
          downloadAsExcel={true}
          tableHeader={display_name}
          {...(is_server_side && {
            manualCallBack: serverSideManualCallBack,
            rowModelType: "serverSide",
            serverSideStoreType: "partial",
            cacheBlockSize: page_size,
          })}
        />
      </div>
    </>
  );
};

export default TableContent; 