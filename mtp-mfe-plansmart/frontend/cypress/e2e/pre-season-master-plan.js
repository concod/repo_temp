/// <reference types="cypress" />
describe("In Season master plan functionality", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/pre-season`, {
      timeout: 2000
    });
  });

  it("should verify master plan button and click functionality in pre Season Dashboard ", () => {
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#MASTER_PLAN_BUTTON").click();
    cy.location("pathname").should("match", /\/master-plan$/);
  });

  it("should verify close filter button and click functionality in pre Season Dashboard ", () => {
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#MASTER_PLAN_BUTTON").click();
    cy.location("pathname").should("match", /\/master-plan$/);
    cy.get(".MuiButtonBase-root").contains("Close Filter").click();
    cy.get(".emptyState-heading").contains("No data found");
    cy.get(".emptyState-info-text").contains(
      "Please click on select filters to filter and View Data"
    );
  });
  it("should verify if user is able to create Pre Season master plan with selected form data", () => {
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#MASTER_PLAN_BUTTON").click();
    cy.location("pathname").should("match", /\/master-plan$/);

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".accordion-body").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".accordion-body").click(0, 0);
    cy.get("#plansmartDasboardFilterBtn").click();
  });

  it("should verify if reset button is reseting the all the fields.", () => {
    cy.get("#MASTER_PLAN_BUTTON").should("have.length", 1);
    cy.get("#MASTER_PLAN_BUTTON").click();
    cy.location("pathname").should("match", /\/master-plan$/);

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".accordion-body").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-body").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".accordion-body").click(0, 0);
    cy.get("#plansmartDasboardFilterReset").click();

    cy.get("#start-year-select")
      .find(".selected-text")
      .contains("Select Start Year");
    cy.get("#start-month-select")
      .find(".selected-text")
      .contains("Select Start Month");
    cy.get("#end-year-select")
      .find(".selected-text")
      .contains("Select End Year");
  });

  it("should verify clear filter feature of multi select dropdown filter", () => {
    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get('[data-test-id="dropdown-clear"]').click();
    cy.get("#end-month-select")
      .find(".selected-text")
      .contains("Select End Month");
  });
});
