import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { displaySnackMessages } from "modules/oms/utils-oms/oms-utility";
import LoadingOverlay from "core/Utils/Loader/loader";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import { CREATE_NEW_ORDER } from "modules/oms/constants-oms/routeConstants";
import {
  getOffCycleViewDraftsTableConfiguration,
  getOffCycleViewDraftsData,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service";

function ViewDrafts(props) {
  const globalClasses = globalStyles();

  const [tableConfigLoader, setTableConfigLoader] = useState(false);
  const [dataLoader, setDataLoader] = useState(false);
  const [tableColumns, setTableColumns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [render, setRender] = useState(false);
  const [draftPayload, setDraftPayload] = useState({});

  const tableGridInstance = useRef(null);
  const loadTableInstance = (instance) => {
    tableGridInstance.current = instance;
  };

  const uniqueRowId = "draft_id";

  const onClickColumn = async (data) => {
    setDraftPayload(data);
    window.open(
      `${CREATE_NEW_ORDER}?type=offcycle&step=1&draft_id=${data.draft_id}`,
      "_self",
      "noopener,noreferrer"
    );
  };

  useEffect(() => {
    const fetchTableColumnData = async () => {
      try {
        setTableConfigLoader(true);
        const tableColResponse = await props.getTableConfiguration();
        if (tableColResponse?.data?.status) {
          let columns = tableColResponse?.data?.data?.map((item) => {
            if (item.column_name === "draft_name") {
              item.onClick = (tableInfo) => {
                onClickColumn(tableInfo?.cellData?.data || {});
              };
            }
            return item;
          });
          const formattedColumns = agGridColumnFormatter(
            columns,
            null,
            null,
            null,
            null,
            null,
            null,
            true
          );
          setTableColumns(formattedColumns);
          setTableConfigLoader(false);
          setRender(true);
        }
      } catch (error) {
        console.log("Error in fetching View Drafts", error);
      } finally {
        setTableConfigLoader(false);
      }
    };

    fetchTableColumnData();
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      setDataLoader(true);
      const filters = props.location.state.filters?.filters || [];
      const body = {
        filters: [...filters],
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      let response = await props.getOffCycleViewDraftsData(body);
      if (response?.data?.status) {
        const tableData = response?.data?.data?.data || response?.data?.data;
        const formatedData = agGridRowFormatter(tableData);
        setTotalCount(response?.data?.total || formatedData.length);
        setDataLoader(false);
        return {
          data: formatedData,
          totalCount: response?.data?.total || formatedData.length,
        };
      } else {
        setDataLoader(false);
        setTotalCount(0);
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Error in fetching Drafts", error);
      setDataLoader(false);
    }
  };

  const breadCrumbOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "View Order Plan Drafts",
      id: 1,
    },
  ];

  return (
    <div className={globalClasses.paddingAround}>
      <div className={globalClasses.marginBottom}>
        <HeaderBreadCrumbs options={breadCrumbOptions} />
      </div>

      <Loader loader={tableConfigLoader || dataLoader} minHeight={"260px"}>
        {render ? (
          <AgGridComponent
            tableHeader={`Manual Order Plans`}
            pagination={true}
            height="500px"
            selectAllHeaderComponent={false}
            hideSelectAllRecords={true}
            rowSelection="multiple"
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            loadTableInstance={loadTableInstance}
            uniqueRowId={uniqueRowId}
            columns={tableColumns}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            totalCount={totalCount}
          />
        ) : (
          <LoadingOverlay loader={!render} />
        )}
      </Loader>
    </div>
  );
}

const mapStateToProps = (state) => {
  return {
    offCycleOrderTableData:
      state.omsReducer.offCycleOrderService.offCycleOrderTableData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getTableConfiguration: () =>
      dispatch(getOffCycleViewDraftsTableConfiguration()),
    getOffCycleViewDraftsData: (filters) =>
      dispatch(getOffCycleViewDraftsData(filters)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewDrafts);
