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

--changeset vamsi.balaga@impactanalytics.co:tb_hierarchy_cid_mapping_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_hierarchy_cid_mapping
ALTER TABLE "global"."tb_hierarchy_cid_mapping"
    ADD CONSTRAINT tb_hierarchy_cid_mapping_pk PRIMARY KEY (hierarchy_level, hierarchy_value);
ALTER TABLE "global"."tb_hierarchy_cid_mapping"
    DROP CONSTRAINT IF EXISTS tb_hierarchy_cid_mapping_unique;