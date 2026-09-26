--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_hierarchy_cid_mapping_view_update_v3 runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:tb_hierarchy_cid_mapping
--comment: tb_hierarchy_cid_mapping view
--rollback: SELECT 1

DROP VIEW IF EXISTS "pricesmart".tb_hierarchy_cid_mapping;
CREATE OR REPLACE VIEW "pricesmart".tb_hierarchy_cid_mapping
AS SELECT 
    t1.hierarchy_level,
    t1.id as hierarchy_value,
    t1.hierarchy_value as hierarchy_name,
    t1.hierarchy_level_name,
    t1.id
   FROM pricesmart.tb_hierarchy_cid_mapping_version t1
  WHERE t1.version_code = global.get_table_version('pricesmart.tb_hierarchy_cid_mapping_version'::text);