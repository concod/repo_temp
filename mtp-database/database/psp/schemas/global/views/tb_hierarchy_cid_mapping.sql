--liquibase formatted sql
--changeset liquibase:tb_hierarchy_cid_mapping runAlways:true stripComments:false splitStatements:false context:tb_hierarchy_cid_mapping labels:tb_hierarchy_cid_mapping
--comment: tb_hierarchy_cid_mapping
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".tb_hierarchy_cid_mapping;
CREATE OR REPLACE VIEW "global".tb_hierarchy_cid_mapping
AS SELECT t1.hierarchy_level,
    t1.hierarchy_level_name,
    t1.hierarchy_value,
    t1.id,
    t1.hierarchy_name,
    t1.version_code
   FROM global.tb_hierarchy_cid_mapping_version t1
  WHERE t1.version_code = global.get_table_version('global.tb_hierarchy_cid_mapping_version'::text);