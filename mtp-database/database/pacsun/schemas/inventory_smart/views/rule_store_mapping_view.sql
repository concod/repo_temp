--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:rule_store_mapping_view_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43729_new
--comment: initial changeset for rule_store_mapping_view table
--rollback: SELECT 1

DROP VIEW IF EXISTS inventory_smart.rule_store_mapping_view;

CREATE OR REPLACE VIEW inventory_smart.rule_store_mapping_view
AS select
psm.rcl_code,
rm.module_code,
concat('l0_name::', psm_rule.rcl_dimension ->> 'l0_name'::text, ';;', 'brand::', psm_rule.rcl_dimension ->> 'brand'::text, ';;', 'l1_name::', psm_rule.rcl_dimension ->> 'l1_name'::text, ';;', 'l2_name::', psm_rule.rcl_dimension ->> 'l2_name'::text, ';;', 'l3_id_name::', psm_rule.rcl_dimension ->> 'l3_id_name'::text, ';;', 'article::', psm_rule.rcl_dimension ->> 'article'::text) AS rcl_dimension,
psm.psa_code,
psm_rule.rcl_dimension ->> 'article'::text AS article,
CASE
WHEN psm.rcl_code = 2 THEN psm_rule.rcl_dimension ->> 'size'::text
ELSE NULL::text
END AS size_name,
psm.psa_name,
start_date, end_date,
'rule-store'::text AS mapping_type,
array_to_string(rm.rcl_lowest_level, ', '::text) AS rcl_lowest_level
from
global.rcl_master rm
join global.rcl_product_mapping_product_store_rule psm_rule
using(rcl_code)
join global.rcl_product_mapping_product_store psm
using(rcl_code, rule_code)
left join
(select rcl_code, rule_code, psa_code, lower(unnest(validity)) as start_date,
upper(unnest(validity)) as end_date from global.rcl_product_mapping_product_store) rpmps
using(rcl_code, rule_code, psa_code);