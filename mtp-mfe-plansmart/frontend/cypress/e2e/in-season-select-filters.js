/// <reference types="cypress" />
describe("Pre Season select filters functionality", () => {
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/in-season`, {
      timeout: 4000
    });
  });

  it("should verify select filter button and click functionality in in-Season Dashboard ", () => {
    cy.get("button[data-testid=plansmartFilterBtn]").should("have.length", 1);
    cy.get("button[data-testid=plansmartFilterBtn]").click();
    cy.get(".accordion-container").should("be.visible");
  });

  it("should verify close filter button and click functionality in in-Season Dashboard ", () => {
    cy.get("button[data-testid=plansmartFilterBtn]").should("have.length", 1);
    cy.get("button[data-testid=plansmartFilterBtn]").click();
    cy.contains("Close Filter").click();
    cy.get(".accordion-container").should("not.be.visible");
  });

  it("should verify clear selection feature of dropdown fields", () => {
    cy.get("button[data-testid=plansmartFilterBtn]").should("have.length", 1);
    cy.get("button[data-testid=plansmartFilterBtn]").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#start-year-select")
      .find(".selected-text")
      .contains("Select Start Year");
    cy.get(".accordion-container").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#start-month-select")
      .find(".selected-text")
      .contains("Select Start Month");
    cy.get(".accordion-container").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#end-year-select")
      .find(".selected-text")
      .contains("Select End Year");
    cy.get(".accordion-container").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#end-month-select")
      .find(".selected-text")
      .contains("Select End Month");
    cy.get(".accordion-container").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#division-select")
      .find(".selected-text")
      .contains("Select Division");
    cy.get(".accordion-container").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#department-select")
      .find(".selected-text")
      .contains("Select Department");
    cy.get(".accordion-container").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#class-select").find(".selected-text").contains("Select Class");
    cy.get(".accordion-container").click();
  });

  it("should verify if reset button is reseting the all the fields.", () => {
    cy.get("button[data-testid=plansmartFilterBtn]").should("have.length", 1);
    cy.get("button[data-testid=plansmartFilterBtn]").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#start-month-select")
      .find(".selected-text")
      .contains("Select Start Month");
    cy.get(".accordion-container").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#plansmartDasboardFilterResetr").click();

    cy.get("#start-year-select")
      .find(".selected-text")
      .contains("Select Start Year");
    cy.get("#end-year-select")
      .find(".selected-text")
      .contains("Select End Year");
    cy.get("#end-month-select")
      .find(".selected-text")
      .contains("Select End Month");
    cy.get("#division-select")
      .find(".selected-text")
      .contains("Select Division");
    cy.get("#department-select")
      .find(".selected-text")
      .contains("Select Department");
    cy.get("#class-select").find(".selected-text").contains("Select Class");
  });

  it("should verify if user is able to filter in-Season plan with selected form data", () => {
    cy.get("button[data-testid=plansmartFilterBtn]").should("have.length", 1);
    cy.get("button[data-testid=plansmartFilterBtn]").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".accordion-container").click();

    cy.get("#plansmartDasboardFilterBtn").click();
    cy.get(".accordion-container").should("not.be.visible");
  });
});
