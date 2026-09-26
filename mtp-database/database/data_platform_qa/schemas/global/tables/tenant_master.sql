--liquibase formatted sql
--changeset liquibase:tenant_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_master
CREATE TABLE global.tenant_master (
    tenant_code integer NOT NULL,
    tenant_name character varying,
    service_start_dt date,
    service_end_dt date,
    no_of_users integer,
    lic_no character varying,
    status boolean,
    attribute_code character varying,
    attribute_value jsonb,
    application_code integer,
    region character varying
);
ALTER TABLE global.tenant_master
    ADD CONSTRAINT tenant_master_pk PRIMARY KEY (tenant_code);
ALTER TABLE global.tenant_master
    ADD CONSTRAINT tenant_master_fk FOREIGN KEY (application_code) REFERENCES global.application_master(application_code);
