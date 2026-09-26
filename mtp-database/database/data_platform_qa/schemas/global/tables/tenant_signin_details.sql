--liquibase formatted sql
--changeset liquibase:tenant_signin_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_signin_details
CREATE TABLE "global".tenant_signin_details (
	tenant_code int4 NULL,
	url varchar NULL,
	google_tenant_identity varchar NULL,
	sign_in_option _varchar NULL,
	saml_id varchar NULL,
	saml_provider_name varchar NULL,
	saml_provider_icon varchar NULL
);
CREATE UNIQUE INDEX tenant_signin_details_url_idx ON global.tenant_signin_details USING btree (url, tenant_code);
