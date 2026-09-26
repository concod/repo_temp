/// <reference types="cypress" />
describe("Pre Season functionality", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/in-season`);
    cy.wait(2000);
  });
  it("should validate Pre Season bradcrumb component", () => {
    cy.get(".bread-crumbs")
      .find(".last-container")
      .should("have.text", "In-Season Dashboard");
  });
  it("should verify dashboard buttons when non of the plan is selected in  in-Season Dashboard ", () => {
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
    //verify toaster notistack-snackbar
  });
  it("should verify whether the user is able to download a single entire plan in Pre Season Dashboard ", () => {
    cy.get("#DownloadPlanBtn").click();
    cy.get(".popover-content").should("exist");
    cy.get(".popover-content").find(".button-wrapper").eq(1).click();
    //verify toaster notistack-snackbar
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
});
