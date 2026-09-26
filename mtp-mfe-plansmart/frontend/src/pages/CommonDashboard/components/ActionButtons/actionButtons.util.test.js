import { getRequestPayload, getButtonName } from "./actionButtons.util";
import { FORM_FIELDS, DASHBOARD_PAGES } from "../../dashboard.constant";
import {
  CREATE_NEW_PLAN,
  REVIEW_IN_SEASON
} from "../SelectFilter/selectFilters.constant";

describe("getRequestPayload", () => {
  const selectedRows = [
    {
      data: {
        [FORM_FIELDS.START_YEAR]: "2023",
        [FORM_FIELDS.END_YEAR]: "2025",
        otherField: "value"
      }
    }
  ];

  const formFields = [
    { accessor: FORM_FIELDS.START_YEAR },
    { accessor: FORM_FIELDS.END_YEAR },
    { accessor: "otherField" }
  ];

  it("should return the correctly formatted payload object", () => {
    const result = getRequestPayload(selectedRows, formFields);
    expect(result).toEqual({
      [FORM_FIELDS.START_YEAR]: 2023, // Parsed as integer
      [FORM_FIELDS.END_YEAR]: 2025, // Parsed as integer
      otherField: "value"
    });
  });

  it("should handle cases where formFields are empty", () => {
    const result = getRequestPayload(selectedRows, []);
    expect(result).toEqual({});
  });
});

describe("getButtonName", () => {
  it("should return REVIEW_IN_SEASON for DASHBOARD_PAGES.IN_SEASON", () => {
    const result = getButtonName(DASHBOARD_PAGES.IN_SEASON);
    expect(result).toBe(REVIEW_IN_SEASON);
  });

  it("should return CREATE_NEW_PLAN for any other screen name", () => {
    const result1 = getButtonName(DASHBOARD_PAGES.TARGET_PLAN);
    const result2 = getButtonName(DASHBOARD_PAGES.PRE_SEASON);
    const result3 = getButtonName("UNKNOWN_SCREEN");

    expect(result1).toBe(CREATE_NEW_PLAN);
    expect(result2).toBe(CREATE_NEW_PLAN);
    expect(result3).toBe(CREATE_NEW_PLAN);
  });

  it("should handle empty string as input", () => {
    const result = getButtonName("");
    expect(result).toBe(CREATE_NEW_PLAN);
  });

  it("should handle undefined as input", () => {
    const result = getButtonName(undefined);
    expect(result).toBe(CREATE_NEW_PLAN);
  });

  it("should handle null as input", () => {
    const result = getButtonName(null);
    expect(result).toBe(CREATE_NEW_PLAN);
  });
});
