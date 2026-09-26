--liquibase formatted sql
--changeset liquibase:vw_hierarchy_level_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:meta_schema-fix
--comment:  initial changeset for vw_hierarchy_level_data 
--rollback: SELECT 1
DROP VIEW IF EXISTS meta_schema.vw_hierarchy_level_data;
CREATE OR REPLACE VIEW meta_schema.vw_hierarchy_level_data
AS WITH RECURSIVE hierarchy AS (
         SELECT tb_master_attributes.id,
            tb_master_attributes.name,
            tb_master_attributes.label,
            tb_master_attributes.parent_id,
            tb_master_attributes.remarks,
            tb_master_attributes.order_sequence,
            tb_master_attributes.is_active,
            tb_master_attributes.created_at,
            tb_master_attributes.updated_at,
            tb_master_attributes.created_by,
            tb_master_attributes.updated_by,
            tb_master_attributes.is_deleted,
            1 AS level,
            tb_master_attributes.contains_child
           FROM meta_schema.tb_master_attributes
          WHERE tb_master_attributes.parent_id = '-1'::integer::numeric AND tb_master_attributes.contains_child = true
        UNION ALL
         SELECT m.id,
            m.name,
            m.label,
            m.parent_id,
            m.remarks,
            m.order_sequence,
            m.is_active,
            m.created_at,
            m.updated_at,
            m.created_by,
            m.updated_by,
            m.is_deleted,
            h.level + 1,
            m.contains_child
           FROM meta_schema.tb_master_attributes m
             JOIN hierarchy h ON m.parent_id = h.id::numeric
          WHERE m.contains_child = true
        )
 SELECT hierarchy.id,
    hierarchy.name,
    hierarchy.label,
    hierarchy.parent_id,
    hierarchy.remarks,
    hierarchy.order_sequence,
    hierarchy.is_active,
    hierarchy.created_at,
    hierarchy.updated_at,
    hierarchy.created_by,
    hierarchy.updated_by,
    hierarchy.is_deleted,
    hierarchy.level,
    hierarchy.contains_child
   FROM hierarchy;