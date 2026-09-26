--liquibase formatted sql
--changeset swapnil-bhange:rule_store_mapping_view runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rule_store_mapping_view
--rollback: SELECT 1

-- inventory_smart.rule_store_mapping_view source
DROP VIEW IF EXISTS inventory_smart.rule_store_mapping_view;

CREATE OR REPLACE VIEW inventory_smart.rule_store_mapping_view
AS 
SELECT DISTINCT psm.rcl_code,
    rm.module_code,
    concat('l0_name::', psm_rule.rcl_dimension ->> 'l0_name'::text, ';;', 
    	   'l1_name::', psm_rule.rcl_dimension ->> 'l1_name'::text, ';;', 
    	   'l2_name::', psm_rule.rcl_dimension ->> 'l2_name'::text, ';;', 
    	   'l3_name::', psm_rule.rcl_dimension ->> 'l3_name'::text, ';;', 
    	   'l4_name::', psm_rule.rcl_dimension ->> 'l4_name'::text, ';;', 
    	   'range_name::', psm_rule.rcl_dimension ->> 'range_name'::text, ';;') AS rcl_dimension,
    psm.psa_code,
    CONCAT(psm_rule.rcl_dimension ->> 'l4_name'::text,'-',psm_rule.rcl_dimension ->> 'l0_name'::text) AS article,
    psm.rule_code,
--        CASE
--            WHEN psm.rcl_code = 2 THEN psm_rule.rcl_dimension ->> 'size'::text
--            ELSE NULL::text
--        END AS size,
    psm.psa_name,
    to_date(psm.eligibility_start_date, 'YYYY-MM-DD'::text) AS start_date,
    to_date(psm.eligibility_end_date, 'YYYY-MM-DD'::text) AS end_date,
    'product_store'::text AS mapping_type,
    array_to_string(rm.rcl_lowest_level, ', '::text) AS rcl_lowest_level
   FROM ( SELECT b.rcl_code,
            b.rule_code,
            b.psa_code,
            b.psa_name,
            split_part(split_part(b.range_list, ','::text, 1), '['::text, 2) AS eligibility_start_date,
            split_part(split_part(b.range_list, ','::text, 2), ')'::text, 1) AS eligibility_end_date
           FROM ( SELECT a.rcl_code,
                    a.rule_code,
                    a.psa_code,
                    a.psa_name,
                    a.validity,
                    a.range,
                        CASE
                            WHEN "right"(a.range, 1) <> '}'::text THEN concat(a.range, ')}')
                            WHEN "left"(a.range, 2) <> '{['::text THEN concat('{[', a.range)
                            ELSE a.range
                        END AS range_list
                   FROM ( SELECT a_1.rcl_code,
                            a_1.rule_code,
                            a_1.psa_code,
                            a_1.psa_name,
                            a_1.validity,
                            regexp_split_to_table(a_1.validity::text, '\),\['::text) AS range
                           FROM ( SELECT DISTINCT rcl_product_mapping_product_store.rcl_code,
                                    rcl_product_mapping_product_store.rule_code,
                                    rcl_product_mapping_product_store.psa_code,
                                    rcl_product_mapping_product_store.psa_name,
                                    rcl_product_mapping_product_store.validity
                                   FROM global.rcl_product_mapping_product_store) a_1) a) b) psm
     JOIN ( SELECT rcl_product_mapping_product_store_rule.rule_code,
            rcl_product_mapping_product_store_rule.rcl_code,
            rcl_product_mapping_product_store_rule.rcl_dimension
           FROM global.rcl_product_mapping_product_store_rule) psm_rule USING (rcl_code, rule_code)
     LEFT JOIN global.rcl_master rm USING (rcl_code);
     