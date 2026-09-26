--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:product_hierarchies_filter_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  changest product_hierarchies_filter change
--rollback: SELECT 1
DROP VIEW IF EXISTS item_smart.product_hierarchies_filter CASCADE;
CREATE OR REPLACE VIEW item_smart.product_hierarchies_filter
AS SELECT distinct product_hierarchies_filter.hierarchy_code,
     	  paf.l0_name,
          paf.l1_name,
          paf.l2_name,
          paf.l3_name,
          paf.l4_name,
          paf.color_description,
          paf.article,
    product_hierarchies_filter.level,
    product_hierarchies_filter.active
   FROM global.product_hierarchies_filter
     JOIN global.product_attributes_filter paf ON (product_hierarchies_filter.path ->> 'article'::text) = paf.article::text
  WHERE product_hierarchies_filter.active = true AND product_hierarchies_filter.level = 7 AND paf.active = true;
