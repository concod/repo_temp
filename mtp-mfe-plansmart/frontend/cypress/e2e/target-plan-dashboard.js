/// <reference types="cypress" />
describe("Target Plan Dashboard functionality", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/target-plan`, {
      timeout: 40000
    });
    cy.wait(3000);
  });

  it("should verify buttons and links in the target plan Dashboard ", () => {
    cy.get("#planSmart-dashboard-active").should("not.exist");
    cy.get("#planSmart-dashboard-scenario").should("not.exist");
    cy.get("#CreateNewPlanBtn").should("be.visible");
    cy.get("#CreateNewPlanBtn").should("be.enabled");
    cy.get("#MASTER_PLAN_BUTTON").should("not.exist");
  });

  it("should verify action buttons and other links on plan select in the target plan Dashboard ", () => {
    cy.get("#ag-81-input").check().should("be.checked");
    cy.get("#CreateNewPlanBtn").should("not.exist");
    cy.get("#EditPlanBtn").should("have.length", 1);
    cy.get("#ViewPlanBtn").should("have.length", 1);
    cy.get("#DeletePlanBtn").should("have.length", 1);
    cy.get("#DownloadPlanBtn").should("have.length", 1);
  });

  it("should verify table header rows in the target plan Dashboard", () => {
    cy.get(".ag-header-row").contains("Plan System Name");
    cy.get(".ag-header-row").contains("Plan Display Name");
    cy.get(".ag-header-row").contains("Created By");
    cy.get(".ag-header-row").contains("Created On");
    cy.get(".ag-header-row").contains("Start Year");
    cy.get(".ag-header-row").contains("End Year");
    cy.get(".ag-header-row").contains("End Month");
    cy.get(".ag-header-row").contains("Last Updated At");
    cy.get(".ag-header-row").contains("Last Updated By");
  });
});
