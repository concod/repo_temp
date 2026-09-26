/// <reference types="cypress" />
let arhausData;
describe("Target Plan Planning Screen functionality", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/target-plan`);
    cy.wait(2000);
  });

  it("should verify update plan button state", () => {
    cy.wait(5000);
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ag-77-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("exist");
    cy.get("#EditPlanBtn").click();
    cy.wait(5000);
    cy.url().should("include", "/edit");
    cy.get(".planningScreenActionContainer")
      .find("button")
      .contains("Update")
      .should("be.disabled");
  });

  it("should verify that the Planning screen loads if the user opens the plan from Target plan Dashboard ", () => {
    cy.wait(5000);
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ag-77-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("exist");
    cy.get("#EditPlanBtn").click();
    cy.wait(5000);
    cy.url().should("include", "/edit");
  });
  it("should verify hat user should be able to navigate to the Dashboard screen from planning screen by selecting Dashboard hyperlink in top left corner of screen", () => {
    cy.wait(5000);
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ag-77-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("exist");
    cy.get("#EditPlanBtn").click();
    cy.wait(5000);
    cy.url().should("include", "/edit");
    cy.get(".custom-link-label").click();
    cy.url().should("not.include", "/edit");
  });

  it("should verify Match with single KPI functionality", () => {
    cy.wait(5000);
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ag-77-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("exist");
    cy.get("#EditPlanBtn").click();
    cy.wait(5000);
    cy.url().should("include", "/edit");
    cy.get(".planningScreenActionContainer > :nth-child(2)").click();
    cy.get("#match-with-select").find(".dropdown-button").should("exist");
    cy.get("#match-with-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click(0, 1);

    cy.get(
      '#category-select > [data-testid="dropdown-button"] > .selected-text'
    ).click();
    cy.wait(2000);
    cy.get('[data-testid="Written Sales"]').click();
    cy.get("#formbody").click(0, 1);

    cy.get(
      '#kpi-select > [data-testid="dropdown-button"] > .selected-text'
    ).click();
    cy.wait(2000);
    cy.get('[data-testid="W Sls $"]').click();
    cy.get("#formbody").click(0, 1);

    cy.get(".sc-fsvrbR > .guUQWT").click();

    cy.get("#notistack-snackbar")
      .should("be.visible")
      .should("have.text", arhausData.budget_table_success_message);
  });
  it("should verify show hide metrics click functionality and plan versions", () => {
    cy.wait(5000);
    cy.get("#EditPlanBtn").should("not.exist");
    cy.get("#ag-77-input").check().should("be.checked");
    cy.get("#EditPlanBtn").should("exist");
    cy.get("#EditPlanBtn").click();
    cy.wait(5000);
    cy.url().should("include", "/edit");
    cy.get(
      ":nth-child(2) > .ag-side-button-button > .ag-side-button-label"
    ).click();
    arhausData.plan_version.forEach((planVersion) => {
      cy.get(".sidebar").contains(planVersion);
    });
  });
});

cy.get("#react-select-2-option-0 > .checkbox");
