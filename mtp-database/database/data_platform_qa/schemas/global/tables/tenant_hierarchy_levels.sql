--liquibase formatted sql
--changeset liquibase:tenant_hierarchy_levels stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_hierarchy_levels
CREATE TABLE global.tenant_hierarchy_levels (
    hierarchy_level_id integer,
    hierarchy_level character varying,
    hierarchy_value character varying
);
