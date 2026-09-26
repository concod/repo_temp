import {
  getUpdatedFormFields,
  getUpdatedDefaultValues,
  generateReportPayload
} from "./report.util";
import { getConfigFile } from "../CreateNewPlan/createNewPlan.util";
import moment from "moment";

jest.mock("../CreateNewPlan/createNewPlan.util");

describe("getUpdatedFormFields", () => {
  const formFields = [
    { accessor: "field1", options: [] },
    { accessor: "field2", options: [] },
    { accessor: "field3", options: [] }
  ];

  const selectedField = { accessor: "field2" };
  const options = ["option1", "option2"];

  it("should update the options of the selected field", () => {
    const updatedFormFields = getUpdatedFormFields({
      selectedField,
      options,
      formFields
    });

    expect(updatedFormFields).toHaveLength(3);
    expect(updatedFormFields[1].accessor).toBe("field2");
    expect(updatedFormFields[1].options).toEqual(options);
  });

  it("should not modify the original formFields array", () => {
    // Create a copy of formFields for comparison
    const originalFormFields = [
      { accessor: "field1", options: [] },
      { accessor: "field2", options: [] },
      { accessor: "field3", options: [] }
    ];

    getUpdatedFormFields({
      selectedField,
      options,
      formFields
    });

    // Expect the original formFields array to remain unchanged
    expect(formFields).toEqual(originalFormFields);
  });
});

describe("getUpdatedDefaultValues", () => {
  const fieldKey = "field1";
  const newDefaultValues = {
    field1: "value1",
    field2: "value2",
    field3: "value3"
  };
  const prevDefaultValues = {
    field1: "oldValue1",
    field2: "value2",
    field3: "value3"
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return cloned newDefaultValues if no dependencies are found", () => {
    // Mocking getConfigFile to return a configuration without dependencies
    getConfigFile.mockReturnValue({
      fields: {
        field1: {
          reportFilterDependency: []
        }
      }
    });

    const result = getUpdatedDefaultValues({
      newDefaultValues,
      prevDefaultValues,
      fieldKey
    });

    expect(result).toEqual(newDefaultValues);
    expect(result).not.toBe(newDefaultValues); // Ensure the result is a clone, not the original object reference
  });

  it("should remove dependent fields from newDefaultValues if there are dependencies", () => {
    // Mocking getConfigFile to return a configuration with dependencies
    getConfigFile.mockReturnValue({
      fields: {
        field1: {
          reportFilterDependency: ["field2", "field3"]
        }
      }
    });

    const expectedResult = {
      field1: "value1"
    };

    const result = getUpdatedDefaultValues({
      newDefaultValues,
      prevDefaultValues,
      fieldKey
    });

    expect(result).toEqual(expectedResult); // field2 and field3 should be deleted
  });

  it("should not remove any fields if prevDefaultValues[fieldKey] is equal to newDefaultValues[fieldKey]", () => {
    const sameDefaultValues = {
      field1: "value1",
      field2: "value2",
      field3: "value3"
    };

    const prevValues = {
      field1: "value1",
      field2: "value2",
      field3: "value3"
    };

    // Mocking getConfigFile to return a configuration with dependencies (though they shouldn't be removed)
    getConfigFile.mockReturnValue({
      fields: {
        field1: {
          reportFilterDependency: ["field2", "field3"]
        }
      }
    });

    const result = getUpdatedDefaultValues({
      newDefaultValues: sameDefaultValues,
      prevDefaultValues: prevValues,
      fieldKey
    });

    expect(result).toEqual(sameDefaultValues); // No fields should be removed
  });

  it("should return a new object even if no changes are made", () => {
    getConfigFile.mockReturnValue({
      fields: {
        field1: {
          reportFilterDependency: []
        }
      }
    });

    const result = getUpdatedDefaultValues({
      newDefaultValues,
      prevDefaultValues,
      fieldKey
    });

    expect(result).toEqual(newDefaultValues);
    expect(result).not.toBe(newDefaultValues); // Ensure it's a cloned object
  });
});

describe("generateReportPayload", () => {
  const fields = [
    { accessor: "field1" },
    { accessor: "field2" },
    { accessor: "field3" }
  ];

  it("should return a payload with array-wrapped values from fieldsDefaultValues", () => {
    const fieldsDefaultValues = {
      field1: "value1",
      field2: ["value2", "value3"],
      field3: "value4"
    };

    const expectedPayload = {
      field1: ["value1"],
      field2: ["value2", "value3"],
      field3: ["value4"]
    };

    const payload = generateReportPayload({
      fields,
      fieldsDefaultValues
    });

    expect(payload).toEqual(expectedPayload);
  });

  it("should handle empty values and return them as an empty array", () => {
    const fieldsDefaultValues = {
      field1: null,
      field2: undefined,
      field3: []
    };

    const expectedPayload = {
      field1: [],
      field2: [],
      field3: []
    };

    const payload = generateReportPayload({
      fields,
      fieldsDefaultValues
    });

    expect(payload).toEqual(expectedPayload);
  });

  it("should return an empty object if fields array is empty", () => {
    const fieldsDefaultValues = {
      field1: "value1",
      field2: ["value2", "value3"]
    };

    const payload = generateReportPayload({
      fields: [],
      fieldsDefaultValues
    });

    expect(payload).toEqual({});
  });

  it("should wrap values in an array even if they are already arrays", () => {
    const fieldsDefaultValues = {
      field1: ["value1"],
      field2: ["value2"]
    };

    const expectedPayload = {
      field1: ["value1"],
      field2: ["value2"]
    };

    const payload = generateReportPayload({
      fields: [{ accessor: "field1" }, { accessor: "field2" }],
      fieldsDefaultValues
    });

    expect(payload).toEqual(expectedPayload);
  });
});
