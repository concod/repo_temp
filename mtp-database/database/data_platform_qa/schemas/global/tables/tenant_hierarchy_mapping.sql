--liquibase formatted sql
--changeset liquibase:tenant_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_hierarchy_mapping
CREATE TABLE global.tenant_hierarchy_mapping (
    hierarchy_level_id integer,
    attribute_type character varying,
    attribute_value character varying,
    application_code integer,
    is_active boolean DEFAULT true,
    description character varying
);
