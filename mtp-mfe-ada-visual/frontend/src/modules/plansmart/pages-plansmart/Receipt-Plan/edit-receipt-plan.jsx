import { Container, Paper, Tab, Tabs } from "@mui/material";
import Table from "core/Utils/agGrid";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import "impact-ui/dist/impact-ui.css";
import { useEffect, useRef, useState } from "react";
import { withRouter } from "react-router-dom";
import {
  getPlanHierarchies,
  getPlanSmartPlanDetails,
} from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import {
  getReceiptPlanDetail,
  getReceiptPlanTableConfig,
} from "../../services-plansmart/ReceiptPlan/receipt-plan-services";
import { useBudgetStyles } from "../plansmart-budget-table/budget-table-style";
import PlanBudgetFilter from "../plansmart-budget-table/plan-budget-filter-header-component";
import {
  customCellRenderer,
  editReceiptKpi,
  getColumns,
  parseReceiptKpisGroupsData,
} from "./receipt-plan-functions";
import { useReceiptPlanStyles } from "./receipt-plan-styles";

const EditReceiptPlan = (props) => {
  const planCode = props.match.params.plancode;
  const classes = useReceiptPlanStyles();
  const plansmartClasses = useBudgetStyles();
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [planData, setPlanData] = useState({});
  const [showFilter, setShowFilter] = useState(false);
  const [planDetails, setPlanDetails] = useState({});
  const [tabData, setTabData] = useState([]);
  const [currentHierarchyLevel, setCurrentHierarchyLevel] = useState(0);

  const initialKpiValues = useRef(null);

  const uniqueKpis = useRef(new Array());

  const formulas = {
    final_rcpt_units: {
      final_rcpt_dollars: "final_rcpt_units*final_rcpt_aur",
      final_rcpt_cost: "final_rcpt_units*final_rcpt_auc",
      final_wos: "final_rcpt_units*final_rcpt_auc",
    },
    final_rcpt_dollars: {
      final_rcpt_aur: "final_rcpt_dollars/final_rcpt_units",
    },
    final_rcpt_aur: { final_rcpt_dollars: "final_rcpt_units*final_rcpt_aur" },
    final_rcpt_cost: { final_rcpt_auc: "final_rcpt_cost/final_rcpt_units" },
    final_rcpt_auc: { final_rcpt_cost: "final_rcpt_units*final_rcpt_auc" },
  };

  const tableRef = useRef(null);

  useEffect(() => {
    if (planDetails?.plan_code) {
      fetchMetricsData(0);
    }
  }, [planDetails]);

  useEffect(() => {
    if (planData?.metrics) {
      setRows(
        parseReceiptKpisGroupsData(
          planData.metrics,
          uniqueKpis,
          planData.ref_col_mapping
        )
      );
    }
  }, [planData, setRows]);

  const fetchMetricsData = async (level) => {
    if (planDetails?.l0_name) {
      let payload = {
        plan_code: planCode,
        level: {},
      };
      switch (level) {
        case 2:
          payload.level["l2_name"] = planDetails.l2_name;
        case 1:
          payload.level["l1_name"] = planDetails.l1_name;
        case 0:
          payload.level["l0_name"] = planDetails.l0_name;

        default:
          payload.level["l0_name"] = planDetails.l0_name;
          break;
      }
      if (Object.keys(payload.level).length) {
        const planData = await getReceiptPlanDetail(payload)();
        if (planData.data) {
          setPlanData(planData.data.data);
        }
      }
    }
  };

  const fetchInitialData = async () => {
    const tabsData = await getPlanHierarchies()();
    setTabData(tabsData.data.data.level_info);
    const details = await getPlanSmartPlanDetails(planCode)();
    setPlanDetails(details.data.data);
  };

  const fetchColumnConfig = async () => {
    const columnConfig = await getReceiptPlanTableConfig(planCode)();
    setColumns(
      getColumns(columnConfig.data.data, initialKpiValues, uniqueKpis)
    );
  };

  useEffect(() => {
    fetchColumnConfig();
    fetchInitialData();
  }, []);

  const getRowData = (params, columnName) => {
    return params?.data?.[columnName];
  };

  useEffect(() => {
    fetchMetricsData(currentHierarchyLevel);
  }, [currentHierarchyLevel]);

  const switchHierarchy = (_event, value) => {
    setCurrentHierarchyLevel(value);
  };

  const isRowEditable = (row, column) => {
    return false;
  };

  return (
    <>
      <FilterModal
        open={showFilter}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setShowFilter(false)}
      >
        <CustomAccordion
          label="Filter"
          defaultExpanded={true}
        ></CustomAccordion>
      </FilterModal>

      {/* <div className={plansmartClasses.alignToRow}>
        <div className={plansmartClasses.alignToEnd}>
          <div>
            <Button
              variant="contained"
              color="primary"
              id="plansmartUpdatePlanBtn"
              sx={{
                marginLeft: "10px",
              }}
              onClick={() => setShowFilter(true)}
            >
              Filter
            </Button>
          </div>
        </div>
      </div> */}

      <Container maxWidth={false}>
        <PlanBudgetFilter
          skuViewMode={false}
          planDetails={planDetails}
          pivotViewMode={false}
        />

        <Tabs
          value={currentHierarchyLevel}
          onChange={(e, value) => switchHierarchy(e, value)}
          aria-label="disabled tabs example"
          textColor="primary"
        >
          {tabData.map((tab) => (
            <Tab key={tab.label} label={tab.label} id={tab.id} />
          ))}
        </Tabs>

        <Paper elevation={0}>
          <Table
            tableRef={tableRef}
            rowdata={rows}
            columns={columns}
            enableRowSpan={true}
            rowSpanColumn={["kpiGroup", "KPIs"]}
            getRowData={getRowData}
            onBlur={(
              _event,
              row,
              column,
              _isChanged,
              _value,
              initialValue,
              _cellData
            ) =>
              editReceiptKpi(
                _event,
                row,
                column,
                _isChanged,
                _value,
                initialValue,
                _cellData,
                uniqueKpis,
                tableRef,
                formulas
              )
            }
            sideBar={false}
            pagination={false}
            customCellRenderer={customCellRenderer}
            uniqueRowId="id"
          />
        </Paper>
      </Container>
    </>
  );
};

export default withRouter(EditReceiptPlan);
