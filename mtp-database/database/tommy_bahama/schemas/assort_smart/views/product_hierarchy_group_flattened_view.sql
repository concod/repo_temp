-- liquibase formatted sql
-- changeset liquibase:product_hierarchy_levels runOnChange:true stripComments:false splitStatements:false context:MTP-51150 labels:product_hierarchy_group_flattened_view
-- comment: MTP-51150 Add view for flattened product hierarchy group
DROP VIEW IF EXISTS assort_smart.product_hierarchy_group_flattened_view;
CREATE OR REPLACE VIEW assort_smart.product_hierarchy_group_flattened_view
AS SELECT product_hierarchy_group.hierarchy_code,
    product_hierarchy_group.level,
    product_hierarchy_group.active,
    product_hierarchy_group.path ->> 'l0_name'::text AS l0_name,
    product_hierarchy_group.path ->> 'l1_name'::text AS l1_name,
    product_hierarchy_group.path ->> 'l2_name'::text AS l2_name,
    product_hierarchy_group.path ->> 'l3_name'::text AS l3_name,
    product_hierarchy_group.path ->> 'l4_name'::text AS l4_name,
    product_hierarchy_group.path ->> 'l5_name'::text AS l5_name,
    product_hierarchy_group.path ->> 'article'::text AS article,
    product_hierarchy_group.path ->> 'product_code'::text AS product_code,
    product_hierarchy_group.path ->> 'gender'::text AS gender
   FROM assort_smart.product_hierarchy_group;