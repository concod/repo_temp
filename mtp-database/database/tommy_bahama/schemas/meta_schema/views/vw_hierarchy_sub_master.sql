--liquibase formatted sql
--changeset liquibase:vw_hierarchy_sub_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:meta_schema-fix
--comment:  initial changeset for vw_hierarchy_sub_master
--rollback: SELECT 1
DROP VIEW IF EXISTS meta_schema.vw_hierarchy_sub_master;
CREATE OR REPLACE VIEW meta_schema.vw_hierarchy_sub_master
AS WITH RECURSIVE sub_hierarchy AS (
         SELECT tb_sub_master_attributes.id,
            tb_sub_master_attributes.name,
            tb_sub_master_attributes.label,
            tb_sub_master_attributes.parent_id,
            tb_sub_master_attributes.master_attribute_id,
            tb_sub_master_attributes.remarks,
            1 AS level
           FROM meta_schema.tb_sub_master_attributes
          WHERE tb_sub_master_attributes.parent_id = '-1'::integer::numeric
        UNION ALL
         SELECT m.id,
            m.name,
            m.label,
            m.parent_id,
            m.master_attribute_id,
            m.remarks,
            h_1.level + 1
           FROM meta_schema.tb_sub_master_attributes m
             JOIN sub_hierarchy h_1 ON m.parent_id = h_1.id::numeric
        )
 SELECT h.id AS master_id,
    h.name AS master_name,
    h.label AS master_label,
    sh.id,
    sh.name,
    sh.label,
    sh.parent_id,
    sh.master_attribute_id
   FROM sub_hierarchy sh,
    meta_schema.vw_hierarchy_level_data h
  WHERE sh.master_attribute_id = h.id;