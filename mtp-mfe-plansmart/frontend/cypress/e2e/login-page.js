/// <reference types="cypress" />

let arhausData;
describe("Plan Smart login validation", () => {
  before(() => {
    cy.fixture("test_data").then((data) => {
      arhausData = data;
    });
  });
  beforeEach(() => {
    cy.visit(Cypress.env("arhaus_domain"));
    cy.wait(2000);
  });
  it("should validate login form title", () => {
    cy.get(".signInText").should("have.length", 1);
    cy.get(".signInText").contains(arhausData.loginFormTitle);
  });

  it("should validate login form hyperlink fields", () => {
    cy.get("#btnReset").should("exist");
    cy.get("#btnReset").contains(arhausData.forgotPasswordLinkText);
    cy.get(".contact").find("a").contains(arhausData.contactNowLinkText);
  });

  it("should validate planSmart login form input fields", () => {
    cy.get("label[for=loginInputEmail]").contains(arhausData.userNameLabel);
    cy.get("#loginInputEmail").type(arhausData.userEmail);
    cy.get("label[for=loginPassword]").contains(arhausData.userPasswordLabel);
    cy.get("#loginPassword").type(arhausData.userPassword);
    cy.get("#btnLogin").click();
    cy.location("pathname").should("match", /\/home$/);
  });
});
