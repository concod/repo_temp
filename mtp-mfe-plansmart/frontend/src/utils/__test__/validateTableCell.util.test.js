import { validateNode } from "../validateTableCell.util";
import { get, isEmpty } from "lodash";
import { SELECTOR_KPI, PLAN_VERSION, BUCKET } from "../../constants/constant";

// Mock lodash functions
jest.mock("lodash", () => ({
  get: jest.fn(),
  isEmpty: jest.fn()
}));

describe("validateNode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when showHideMetricsData is empty", () => {
    const row = { data: { metric_key: "some_metric" } };
    const gridSettings = [];

    // Mocking isEmpty to return true for showHideMetricsData
    isEmpty.mockReturnValueOnce(true);

    const result = validateNode(row, [], false, gridSettings, []);
    expect(result.next().value).toBe(true); // Since it's a generator, use .next().value
  });

  it("should return false if isTargetPlan is true and metric is not in targetPlanVisibleKpis", () => {
    const row = { data: { metric_key: "some_metric" } };
    const targetPlanVisibleKpis = ["another_metric"];
    const result = validateNode(row, [], true, [], []);

    get.mockReturnValue("some_metric"); // Mocking the behavior of `get`

    expect(result.next().value).toBe(false); // Expected result is false because metric isn't in `targetPlanVisibleKpis`
  });

  it('should skip rows where hierarchyLevels key is "Total"', () => {
    const row = {
      data: {
        field1: "Total",
        field2: "Value"
      }
    };
    const gridSettings = [{ hierarchyKey: "field1" }];
    const hierarchyLevels = ["field1", "field2"];

    const result = validateNode(row, [], false, gridSettings, hierarchyLevels);

    expect(result.next().value).toBe(true); // Since it skips "Total" and no hide logic applies
  });

  it("should return false if isRowVisible is false", () => {
    const row = {
      data: {
        hierarchyKey: "some_key",
        some_other_key: "non_total_value" // Ensure this value triggers row visibility to be false
      }
    };

    const showHideMetricsData = [
      [
        {
          metric: SELECTOR_KPI,
          isChecked: true,
          children: [{ isChecked: true, label: "some_label" }]
        }
      ],
      [
        {
          metric: PLAN_VERSION,
          label: "Version 1",
          plan_code: "plan_code_1",
          isChecked: true
        }
      ],
      [{ metric: BUCKET, label: "Bucket 1", isChecked: true }]
    ];

    // Grid settings and hierarchy levels that will make isRowVisible false
    const gridSettings = [{ hierarchyKey: "some_key" }];
    const hierarchyLevels = ["some_key", "some_other_key"];

    // Call the generator
    const generator = validateNode(
      row,
      showHideMetricsData,
      false,
      gridSettings,
      hierarchyLevels
    );

    // Get the final returned value from the generator
    const result = generator.next().value;

    expect(result).toBe(false); // Should return false if isRowVisible is false
  });

  it("should return false when metric and version visibility are false", () => {
    const row = {
      data: {
        metric_key: "metric_value",
        planCode: "plan_code_1",
        some_bucket: "Bucket 1"
      }
    };

    const showHideMetricsData = [
      [
        // Metric visibility is false because isChecked is false
        {
          metric: SELECTOR_KPI,
          isChecked: false,
          children: [{ isChecked: false, label: "metric_value" }]
        }
      ],
      [
        // Version visibility is false because isChecked is false
        {
          metric: PLAN_VERSION,
          label: "Version 1",
          plan_code: "plan_code_1",
          isChecked: false
        }
      ],
      [
        // Bucket visibility can still be true, but we are testing metric and version visibility
        { metric: BUCKET, label: "Bucket 1", isChecked: true }
      ]
    ];

    // Call the generator
    const generator = validateNode(row, showHideMetricsData, false, [], []);

    // Get the final returned value from the generator
    const result = generator.next().value;

    expect(result).toBe(false); // Should return false when both metric and version visibility are false
  });
});
