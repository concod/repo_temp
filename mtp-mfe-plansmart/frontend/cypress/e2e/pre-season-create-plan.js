let arhausData;
describe("in-season - Create plan functionality", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/pre-season`);
    cy.wait(2000);
  });

  it("should validate create plan button component", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
  });

  it("should verify create plan button and click functionality under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);
  });

  it("should verify create plan forms's required input fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);
    arhausData.preSeasonCreatePlanDropdowns.forEach((dropdownElement) => {
      cy.get(`#${dropdownElement}`).find(".dropdown-button").should("exist");
    });
    cy.get('input[name="plan_display_name"]').should("exist");
  });

  it("should verify plan stage dropdown value is mandatory field in create plan form fields under in-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify start year dropdown value is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify start month dropdown value is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify end year dropdown value is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify end month dropdown value is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify division dropdown value is not a mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify class dropdown value is not a mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify department dropdown value is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify Plan Display Name textfield is mandatory field in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").should("have.length", 1);
    cy.get("#CreateNewPlanBtn").click();
    cy.location("pathname").should("match", /\/create-plan$/);

    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#GeneratePlanButton").should("be.disabled");

    cy.get('input[name="plan_display_name"]').type("Cypree Plan Test");

    cy.get("#GeneratePlanButton").should("not.be.disabled");
  });

  it("should verify whether the user is able to enter values upto 50 Chars in the Plan Display Name in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").click();

    cy.get('input[name="plan_display_name"]').type(
      "Pre Season create plan test"
    );

    cy.get('input[name="plan_display_name"]')
      .invoke("text")
      .then((text) => {
        expect(text.length).to.be.at.most(
          arhausData.preSeasonPlanNameMaxLength
        );
      });
  });

  it("should verify class dependency when user clears departmant value in create plan form fields under pre-season tab", () => {
    cy.get("#CreateNewPlanBtn").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get('[data-testid="dropdown-clear"]').click();
    cy.get("#class-select").find(".selected-text").contains("Select Class");
  });

  it("should verify user is able to Generate Plan after selecting all the mandatory fields in create plan form fields under pre season tab", () => {
    cy.get("#CreateNewPlanBtn").click();
    cy.get("#plan-stage-select").find(".dropdown-button").should("exist");
    cy.get("#plan-stage-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get("#formbody").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get("#formbody").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get("#formbody").click();

    cy.get('input[name="plan_display_name"]').type(
      arhausData.preSeasonPlanName
    );

    cy.get("#GeneratePlanButton").click();

    cy.get("#notistack-snackbar")
      .should("be.visible")
      .should("have.text", arhausData.successPlanToasterMessage);
  });
});
