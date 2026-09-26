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

--changeset kamalesh.k:tenant_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to tenant_hierarchy_mapping table

ALTER TABLE global.tenant_hierarchy_mapping
Add column tenant_hierarchy_mapping_code serial4,
ADD CONSTRAINT tenant_hierarchy_mapping_pkey PRIMARY KEY (tenant_hierarchy_mapping_code);
