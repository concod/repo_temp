--liquibase formatted sql
--changeset liquibase:product_hierarchies_filter runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchies_filter
--rollback: SELECT 1
DROP VIEW IF EXISTS assort.product_hierarchies_filter;
CREATE OR REPLACE VIEW assort.product_hierarchies_filter
AS SELECT product_hierarchies_filter.hierarchy_code,
  (product_hierarchies_filter.path ->> 'l0_name'::text)::character varying AS l0_name,
  (product_hierarchies_filter.path ->> 'l1_name'::text)::character varying AS l1_name,
  (product_hierarchies_filter.path ->> 'l2_name'::text)::character varying AS l2_name,
  (product_hierarchies_filter.path ->> 'l3_name'::text)::character varying AS l3_name,
  (product_hierarchies_filter.path ->> 'l4_name'::text)::character varying AS l4_name,
  (product_hierarchies_filter.path ->> 'style'::text)::character varying AS style,
  (product_hierarchies_filter.path ->> 'product_code'::text)::character varying AS product_code,
  product_hierarchies_filter.level
 FROM global.product_hierarchies_filter;
