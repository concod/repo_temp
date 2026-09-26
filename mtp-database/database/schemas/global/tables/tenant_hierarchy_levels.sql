--liquibase formatted sql
--changeset liquibase:tenant_hierarchy_levels stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tenant_hierarchy_levels
CREATE TABLE global.tenant_hierarchy_levels (
    hierarchy_level_id integer,
    hierarchy_level character varying,
    hierarchy_value character varying
);

--changeset ashish:tenant_hierarchy_levels_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to tenant_hierarchy_levels table
ALTER TABLE global.tenant_hierarchy_levels alter column hierarchy_level_id set not null, alter column hierarchy_level set not null;
ALTER TABLE "global".tenant_hierarchy_levels DROP CONSTRAINT IF EXISTS tenant_hierarchy_levels_pkey;
ALTER TABLE global.tenant_hierarchy_levels ADD constraint tenant_hierarchy_levels_pkey PRIMARY KEY (hierarchy_level_id, hierarchy_level, hierarchy_value);
