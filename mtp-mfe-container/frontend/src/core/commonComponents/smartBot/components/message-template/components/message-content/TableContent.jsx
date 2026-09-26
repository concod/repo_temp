import { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import { isEmpty } from "lodash";
import { Button, Modal } from "impact-ui-v3";
import ExpandIcon from "core/coreAssets/chatbot/expand.svg";
import IA_DOWNLOAD from "coreAssets/IA_DOWNLOAD.svg";
import { getFormattedTableConfig } from "../../../../utlis";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useSelector, useDispatch } from "react-redux";
import { setChatbotContext } from "core/actions/smartBotActions";
import { getTableRecords, getTableRecordsByUrl } from "../../../../services/chatbot-services";
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
    temp_table_url,
  } = bodyText;
  const [columns, setColumns] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const chatbotContextRef = useRef(chatbotContext);
  chatbotContextRef.current = chatbotContext;
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
    if (!is_server_side && !isEmpty(row_data)) {
      setRowData(row_data);
    }
  }, [row_data]);

  const serverSideManualCallBack = async (manualbody, pageIndex, params) => {
    try {
      let limit = {
        page_size: page_size,
        page: pageIndex + 1,
      }
      let payload = {
        limit,
        search: manualbody?.search,
        sort: manualbody?.sort
      }
      let response;
      if (temp_table_url) {
        response = await getTableRecordsByUrl(payload, temp_table_url);
      } else {
        const baseUrl = sessionStorage.getItem("stepForm_baseUrl") || "";
        response = await getTableRecords(payload, baseUrl, table_name);
      }
      if (is_server_side || response?.data?.download_url) {
        setDownloadUrl(response.data.download_url);
      }
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
      const latestContext = chatbotContextRef.current;
      dispatch(setChatbotContext({
        ...latestContext,
        tables: { ...latestContext?.tables, [table_name]: selectedList },
      }));
    } catch (error) {
      console.error("Error in onSelectionChanged", error);
    }
  };

  const handleServerSideDownload = () => {
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getTopRightOptions = () => {
    let options = []
    if (is_server_side) {
      options.push(
        <Button
          key="download-button"
          id="setAll"
          variant="tertiary"
          onClick={handleServerSideDownload}
          icon={<IA_DOWNLOAD />}
          sx={{
            background: "#f5f6fa !important",
            border: "none !important",
          }}
        />
      )
    }
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
            rowdata={is_server_side ? null : rowData}
            pagination={true}
            paginationPageSize={is_server_side ? page_size : 20}
            suppressFieldDotNotation={true}
            domLayout="normal"
            sizeColumnsToFitFlag={true}
            showSaveTableConfig={false}
            showSearchModalBtn={true}
            hideFormatSideBar={true}
            uniqueRowId={unique_id}
            selectAllHeaderComponent={select_all_component}
            onSelectionChanged={onSelectionChanged}
            hideTableSetting={hide_table_setting}
            downloadAsExcel={is_server_side ? false : true}
            tableHeader={display_name}
            hideTableActions={true}
            isSaveViewEnabled={false}
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
          rowdata={is_server_side ? null : rowData}
          pagination={true}
          paginationPageSize={is_server_side ? page_size : 10}
          suppressFieldDotNotation={true}
          domLayout="autoHeight"
          customClass="bot_table_auto_height"
          sizeColumnsToFitFlag={true}
          showSaveTableConfig={false}
          showSearchModalBtn={true}
          hideFormatSideBar={true}
          uniqueRowId={unique_id}
          selectAllHeaderComponent={select_all_component}
          onSelectionChanged={onSelectionChanged}
          hideTableSetting={hide_table_setting}
          customSystemButton={getTopRightOptions()}
          customSystemButtonWithDownload={!is_server_side}
          topRightOptions={null}
          downloadAsExcel={is_server_side ? false : true}
          tableHeader={display_name}
          hideTableActions={true}
          isSaveViewEnabled={false}
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