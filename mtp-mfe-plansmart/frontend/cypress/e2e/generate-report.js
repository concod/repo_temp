/// <reference types="cypress" />
let arhausData;
describe("create plan functionality", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(`${Cypress.env("arhaus_domain")}/plan-smart/report`, {
      timeout: 30000
    });
  });

  it("should verify start year dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should verify start month dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should verify end year dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should verify channel dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should verify division dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should verify department dropdown value is mandatory field in generate report form", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("be.disabled");

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").should("not.be.disabled");
  });

  it("should validate generate report with all the valid fields in the report tab", () => {
    cy.wait(2000);
    cy.get("#start-year-select").find(".dropdown-button").should("exist");
    cy.get("#start-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#start-month-select").find(".dropdown-button").should("exist");
    cy.get("#start-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-year-select").find(".dropdown-button").should("exist");
    cy.get("#end-year-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(2).click();
    cy.get(".filter-wrapper").click();

    cy.get("#end-month-select").find(".dropdown-button").should("exist");
    cy.get("#end-month-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#channel-select").find(".dropdown-button").should("exist");
    cy.get("#channel-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(3).click();
    cy.get(".filter-wrapper").click();

    cy.get("#division-select").find(".dropdown-button").should("exist");
    cy.get("#division-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#department-select").find(".dropdown-button").should("exist");
    cy.get("#department-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#class-select").find(".dropdown-button").should("exist");
    cy.get("#class-select").find(".dropdown-button").click();
    cy.wait(2000);
    cy.get(".ScrollCheck").find(".checkbox").eq(1).click();
    cy.get(".filter-wrapper").click();

    cy.get("#plansmartReportGenerateBtn").click();

    cy.get("#notistack-snackbar")
      .should("be.visible")
      .should("have.text", arhausData.report_download_success_message);
  });
});
