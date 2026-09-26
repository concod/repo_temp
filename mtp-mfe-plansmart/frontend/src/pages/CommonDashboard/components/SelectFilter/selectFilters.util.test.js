import {
  getUpdatedFormFields,
  getFieldRequestPayload
} from "./selectFilters.util";
import { jest } from "@jest/globals";

describe("getUpdatedFormFields", () => {
  it("should update options for the selected field", () => {
    const formFields = [
      { accessor: "field1", options: ["option1"] },
      { accessor: "field2", options: ["option2"] }
    ];
    const selectedField = { accessor: "field1" };
    const options = ["newOption1", "newOption2"];

    const updatedFields = getUpdatedFormFields({
      selectedField,
      options,
      formFields
    });

    expect(updatedFields).toEqual([
      { accessor: "field1", options: ["newOption1", "newOption2"] },
      { accessor: "field2", options: ["option2"] }
    ]);
  });

  it("should return an empty array if selected field is not found", () => {
    const formFields = [
      { accessor: "field1", options: ["option1"] },
      { accessor: "field2", options: ["option2"] }
    ];
    const selectedField = { accessor: "field3" };
    const options = ["newOption1"];

    // Since the function returns an empty array if the selected field is not found
    const updatedFields = getUpdatedFormFields({
      selectedField,
      options,
      formFields
    });

    expect(updatedFields).toEqual([]);
  });
});

// Mocking getConfigFile
jest.mock("../../../CreateNewPlan/createNewPlan.util", () => ({
  getConfigFile: () => ({
    fields: {
      field1: {
        options: ["option1"],
        apiCall: "someApi",
        apiCallType: "GET",
        filterpayloadDependentOn: ["dep1"],
        application_code: "appCode",
        dimension: "dim"
      }
    }
  })
}));

describe("getFieldRequestPayload", () => {
  it("should return correct payload and configuration for the selected field", () => {
    const selectedField = { accessor: "field1" };
    const fieldsDefaultValues = { dep1: "value1" };

    const result = getFieldRequestPayload({
      selectedField,
      fieldsDefaultValues
    });

    expect(result).toEqual({
      options: ["option1"],
      apiCall: "someApi",
      apiCallType: "GET",
      requestPayload: {
        attribute_name: "field1",
        application_code: "appCode",
        filter_type: "cascaded",
        filters: [
          {
            attribute_name: "dep1",
            operator: "in",
            values: ["value1"],
            filter_type: "cascaded",
            dimension: "dim"
          }
        ],
        is_urm_filter: true
      },
      responseFormatter: expect.any(Function)
    });
  });
});
