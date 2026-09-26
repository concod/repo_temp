--liquibase formatted sql
--changeset liquibase:rule_store_mapping_view runOnChange:true stripComments:false splitStatements:false context:MTP-80320 labels:liquibase_project_start
--comment: rule_store_mapping_view
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.rule_store_mapping_view;

CREATE OR REPLACE VIEW inventory_smart.rule_store_mapping_view
AS SELECT r.rcl_dimension ->> 'article'::text AS article,
    lower(p.validity) AS start_date,
    upper(p.validity) AS end_date,
    p.psa_name,
    p.updated_at,
    p.updated_by
   FROM global.rcl_product_mapping_product_store_rule r
     JOIN global.rcl_product_mapping_product_store p ON r.rule_code = p.rule_code AND r.rcl_code = p.rcl_code
  ORDER BY p.psa_name;