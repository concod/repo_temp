--liquibase formatted sql
--changeset liquibase:tb_hierarchy_cid_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_hierarchy_cid_mapping
CREATE TABLE "global"."tb_hierarchy_cid_mapping" (
    hierarchy_level int4 NOT NULL,
    hierarchy_value int4 NOT NULL,
    hierarchy_name text NOT NULL,
CONSTRAINT tb_hierarchy_cid_mapping_unique UNIQUE (hierarchy_level, hierarchy_value)
)
;