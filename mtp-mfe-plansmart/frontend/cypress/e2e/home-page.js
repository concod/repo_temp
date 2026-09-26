/// <reference types="cypress" />

let arhausData;
describe("Plan Smart home page validation", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/home`);
    cy.wait(2000);
  });
  it("should validate home page title and plan smart card", () => {
    cy.wait(2000);
    cy.contains(arhausData.homePageHeader).should("exist");
    cy.contains(arhausData.planSmartTitle).should("exist");
  });

  it("should validate plan smart is selected", () => {
    cy.get("button[tabindex=0]").should("have.class", "active");
    cy.contains(arhausData.getStartedLinkText).click();
    cy.location("pathname").should("match", /\/pre-season$/);
  });
});
