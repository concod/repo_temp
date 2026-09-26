--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_hierarchy_cid_mapping runAlways:true stripComments:false splitStatements:false context:tb_hierarchy_cid_mapping labels:tb_hierarchy_cid_mapping
--comment: tb_hierarchy_cid_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".tb_hierarchy_cid_mapping;
CREATE OR REPLACE VIEW "global".tb_hierarchy_cid_mapping
AS SELECT t1.hierarchy_level,
    t1.hierarchy_value,
    t1.hierarchy_name,
    t1.version_code,
    t1.hierarchy_level_name,
    t1.id
   FROM global.tb_hierarchy_cid_mapping_version t1
  WHERE t1.version_code = 1;

--changeset sreevathsa.sp@impactanalytics.co:tb_hierarchy_cid_mapping_view_update_v3 runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:tb_hierarchy_cid_mapping
--comment: Update tb_hierarchy_cid_mapping view to use global.get_table_version() and remove version_code from SELECT
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".tb_hierarchy_cid_mapping CASCADE;
CREATE OR REPLACE VIEW "global".tb_hierarchy_cid_mapping
AS SELECT 
    t1.hierarchy_level,
    t1.id as hierarchy_value,
    t1.hierarchy_value as hierarchy_name,
    t1.hierarchy_level_name,
    t1.id
   FROM global.tb_hierarchy_cid_mapping_version t1
  WHERE t1.version_code = global.get_table_version('global.tb_hierarchy_cid_mapping_version'::text);