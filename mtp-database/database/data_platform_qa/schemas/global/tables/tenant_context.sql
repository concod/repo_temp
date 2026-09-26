--liquibase formatted sql
--changeset liquibase:tenant_context stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_context
CREATE TABLE global.tenant_context (
    tenant_code serial4 NOT NULL,
    tenant varchar NOT NULL,
    secret_id varchar NOT NULL,
    version varchar NOT NULL
);
ALTER TABLE global.tenant_context
    ADD CONSTRAINT tenant_context_pkey PRIMARY KEY (tenant_code);
