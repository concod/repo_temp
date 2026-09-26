/// <reference types="cypress" />
let arhausData;
describe("Pre Season functionality", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/pre-season`);
    cy.wait(2000);
  });
  it("should validate Pre Season bradcrumb component", () => {
    cy.get(".bread-crumbs")
      .find(".last-container")
      .should("have.text", arhausData.pre_Season_dashboard_header);
  });
  it("should verify dashboard buttons when none of the plan is selected in Pre Season Dashboard ", () => {
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get('button[data-testid ="plansmartFilterBtn"]').should(
      "have.length",
      1
    );
    cy.get("#planSmart-dashboard-active").should("have.text", "Active Plan");
    cy.get("#planSmart-dashboard-scenario").should(
      "have.text",
      "Scenario Plan"
    );
  });
  it("should verify whether the user is able to see the edit, download, view, copy and delete button when user selectes one plan in Pre Season Dashboard ", () => {
    cy.get("#ag-81-input").check().should("be.checked");
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#EditPlanBtn").should("have.length", 1);
    cy.get("#ViewPlanBtn").should("have.length", 1);
    cy.get("#CopyPlanBtn").should("have.length", 1);
    cy.get("#DeletePlanBtn").should("have.length", 1);
    cy.get("#DownloadPlanBtn").should("have.length", 1);
  });
  it("should verify whether the user is able to download a single high level plan in Pre Season Dashboard ", () => {
    cy.get("#ag-81-input").check().should("be.checked");
    cy.get("#DownloadPlanBtn").click();
    cy.get(".popover-content").should("exist");
    cy.get(".popover-content").find(".button-wrapper").eq(0).click();
    cy.get("#notistack-snackbar")
      .should("be.visible")
      .should("have.text", arhausData.successPlanToasterMessage);
  });
  it("should verify whether the user is able to download a single entire plan in Pre Season Dashboard ", () => {
    cy.get("#DownloadPlanBtn").click();
    cy.get(".popover-content").should("exist");
    cy.get(".popover-content").find(".button-wrapper").eq(1).click();
    cy.get("#notistack-snackbar")
      .should("be.visible")
      .should("have.text", arhausData.successPlanToasterMessage);
  });
  it("should verify whether the user is able to see only download button when user selectes more than one plan in Pre Season Dashboard ", () => {
    cy.get("#ag-81-input").check().should("be.checked");
    cy.get("#ag-83-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("have.length", 0);
    cy.get("#ViewPlanBtn").should("have.length", 0);
    cy.get("#CopyPlanBtn").should("have.length", 0);
    cy.get("#DeletePlanBtn").should("have.length", 1);
    cy.get("#DownloadPlanBtn").should("have.length", 0);
    cy.get('button[data-testid ="plansmartFilterBtn"]').should(
      "have.length",
      1
    );
    cy.get("#CreateNewPlanBtn").should("have.length", 0);
  });
  it("should verify plan table column name in Pre Season Dashboard ", () => {
    cy.get(".ag-side-button-label").click();
    arhausData.plan_dashboard_columns.forEach((coulmnName, index) => {
      cy.get(
        `[aria-posinset=${
          index + 1
        }] > .ag-column-select-column > .ag-column-select-column-label`
      ).contains(coulmnName);
    });
  });
  it("should verify coulmn check uncheck feature in Pre Season Dashboard ", () => {
    cy.get(".ag-column-select-checkbox").forEach((tableHeader) => {
      tableHeader.check().should("be.checked");
    });
    arhausData.plan_dashboard_columns.forEach((coulmnName) => {
      cy.get(".ag-header-cell-text").contains(coulmnName);
    });
  });
  it("should verify delete option is the only visible icon in top right corner when the user selects more than one plan in Pre Season Dashboard ", () => {
    cy.get("#ag-81-input").check().should("be.checked");
    cy.get("#ag-82-input").check().should("be.checked");
    cy.get("#MASTER_PLAN_BUTTON").should("not.exist");
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ViewPlanBtn").should("not.exist");
    cy.get("#CopyPlanBtn").should("not.exist");
    cy.get("#DeletePlanBtn").should("exist");
    cy.get("#DownloadPlanBtn").should("not.exist");
  });
  it("should Verify the search box functionality of Start Year in pre-season dashboard by typing in value to search for within populated box underneath Start Year in Pre Season Dashboard ", () => {
    cy.get("aria-label=Start Year Filter Input]").type("2024");
    cy.get(".ag-row-even")
      .eq(0)
      .find("div[col-id=start_year]")
      .invoke("text")
      .then((text) => {
        const new_counts = text;
        expect(new_counts).to.eq("2024");
      });
  });
});
