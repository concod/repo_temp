/// <reference types="cypress" />

let arhausData;
describe("Target Planning - Create new plan functionality", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/target-plan`);
    cy.wait(4000);
  });

  it("should verify create plan button and click functionality in target plan dashboard", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);
  });

  it("should verify start year dropdown value is mandatory field in create target plan form", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);

    cy.get("input[name=plan_display_name]").type("Test Master plan");
    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify start year field minimum value ", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);

    const currentYear = new Date().getFullYear();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-year-select").find(".selected-text").contains(currentYear);
  });

  it("should verify start month dropdown value is mandatory field in create target plan form", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);

    cy.get("input[name=plan_display_name]").type("Test Master plan");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify end year dropdown value is mandatory field in create target plan form", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);

    cy.get("input[name=plan_display_name]").type("Test Master plan");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify user plan name length create maste plan form componet ", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);
    cy.get("input[name=plan_display_name]").type(
      "Test Master plan Test Master plan Test Master plan Test Master plan Test Master plan Test Master plan"
    );
    cy.get("input[name=plan_display_name]")
      .its("text")
      .should("have.length.lte", 51);
  });

  it("should verify generate plan feature in create target plan form", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);

    cy.get("input[name=plan_display_name]").type("Test Master plan");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".createNewPlan_wrapper").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
    cy.get("#GeneratePlanButton").click();

    cy.location("pathname").should("match", /edit$/);
  });
  it("should verify cancel button in create maste plan form componet ", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-target-plan$/);
    cy.get("#CreatePlanCancelButton").click();
    cy.location("pathname").should("match", /\/target-plan$/);
  });
});
