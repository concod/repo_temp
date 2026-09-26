--liquibase formatted sql
--changeset chandrasheakr.s:modified_rule_store_mapping_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-119715
--comment: set all bug fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_rule_store_mapping_v3(refcursor, filters_list jsonb, mapping_attributes jsonb, validity_list jsonb, created_by integer, updated_by integer);
CREATE OR REPLACE FUNCTION global.update_rule_store_mapping_v3(refcursor, filters_list jsonb, mapping_attributes jsonb, validity_list jsonb, created_by integer, updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/* 	
	 * Function/Procedure name: global.update_rule_store_v3
	 * 
	 *
	 * Updated_by       Updated_on      Purpose
	 * ----------       -----------     --------
	 * Arnab Nandy      11-JUL-2024    Handling both select all and inline save scenario
	 */
DECLARE
  fetch_rule_code_flag boolean := false;
  fetch_store_tier_flag boolean := false;
  query text;
  store_tier_query text;
  rule_codes_query text;
  store_tiers text;
  rule_codes text;
  validity_item jsonb;
  validity_value text;
  store_tier_filters jsonb;
  rule_filters jsonb;
  specific_rule_code_flag boolean := true;
  specific_store_tier_flag boolean := true;
  rule_code_list text[];
  store_tier_list text[];
  suffix_multiple_dimension_table text := '';
BEGIN
  SELECT attribute_value->>'suffix' FROM global.tenant_attribute_master tam WHERE name = 'mapping_multidimension_suffix' INTO suffix_multiple_dimension_table;
--   if mapping_attributes contains key  'rule_code' then we will make specific_rule_code_flag as false 
--   and we will take the required rule_code values from each object inside validity_list
--   eg store product mapping inline save scenario rule_code will be fetched from validity_list object
  IF mapping_attributes ? 'rule_code' THEN
    specific_rule_code_flag := false;
    RAISE NOTICE 'specific_rule_code_flag: %', specific_rule_code_flag;
    
    IF mapping_attributes ->> 'rule_code' IS NULL THEN
      rule_filters := ((filters_list::json) ->> 'rule_code_params')::json;
      RAISE NOTICE 'rule_filters: %', rule_filters;
      query := 'select * from global.rule_list_product_only' || '(' || quote_literal($1) || ',' || quote_literal(rule_filters ->> 0) || ',' || quote_literal(rule_filters ->> 1) || ',' || quote_literal(rule_filters ->> 2) || ')';
      RAISE NOTICE 'query: %', query;
      EXECUTE query INTO rule_codes_query;
      rule_codes_query := 'select array(select quote_literal(rule_code) rule_code from (' || rule_codes_query || ') B)';
      RAISE NOTICE 'rule_codes_query: %', rule_codes_query;
      EXECUTE rule_codes_query INTO rule_code_list;
      CLOSE $1;
    ELSE
      RAISE NOTICE 'mapping_attributes ->> rule_code is not null';
      SELECT array_agg(element::text) INTO rule_code_list
      FROM jsonb_array_elements_text(mapping_attributes -> 'rule_code') AS element;
    END IF;
  END IF;
--   if mapping_attributes contains key 'psa_name' then we will make specific_rule_code_flag as false 
--   and we will take the required psa_name values from each object inside validity_list
--   eg product store mapping inline save scenario psa_name will be fetched from validity_list object
  IF mapping_attributes ? 'psa_name' THEN
    specific_store_tier_flag := false;
    RAISE NOTICE 'specific_store_tier_flag: %', specific_store_tier_flag;
    
    IF mapping_attributes ->> 'psa_name' IS NULL THEN
      store_tier_filters := ((filters_list::json) ->> 'store_tier_params')::json;
      query := 'select * from global.distinct_store_info_rcl_level' || '(' || quote_literal($1) || ',' || quote_literal(store_tier_filters ->> 0) || ',' || quote_literal(store_tier_filters ->> 1) || ',' || quote_literal(store_tier_filters ->> 2) || ',' || quote_literal(store_tier_filters ->> 3) || ')';
      RAISE NOTICE 'query: %', query;
      EXECUTE query INTO store_tier_query;
      store_tier_query := 'select array(select quote_literal(psa_name) psa_name from (' || store_tier_query || ') B)';
      RAISE NOTICE 'store_tier_query: %', store_tier_query;
      EXECUTE store_tier_query INTO store_tier_list;
      CLOSE $1;
    ELSE
      RAISE NOTICE 'mapping_attributes ->> psa_name is not null';
      SELECT array_agg(element::text) INTO store_tier_list
      FROM jsonb_array_elements_text(mapping_attributes -> 'psa_name') AS element;
    END IF;
  END IF;
  IF NOT specific_store_tier_flag THEN
    store_tiers := '(' || array_to_string(store_tier_list, ',') || ')';
  END IF;
  IF NOT specific_rule_code_flag THEN
    rule_codes := '(' || array_to_string(rule_code_list, ',') || ')';
  END IF;
  FOR validity_item IN SELECT jsonb_array_elements(validity_list)
  LOOP
    validity_value := COALESCE(validity_item ->> 'validity', NULL);
    query := '
      INSERT INTO global.rcl_product_mapping_product_store (rcl_code, rule_code, psa_code, validity, created_at, updated_at, created_by, updated_by, psa_name, child_sku)
      SELECT DISTINCT 
        rcl_code, 
        rule_code, 
        psa_code,
        ' || CASE WHEN validity_value IS NOT NULL THEN quote_literal(validity_value) ELSE ' NULL ' END || '::datemultirange,
        now(), 
        now(),
        $1,
        $2,
        psa_name, 
        NULL
      FROM 
        global.rcl_product_mapping_product_store_rule rpmpsr
      JOIN 
        global.product_store_attributes_filter' || COALESCE(quote_ident(NULLIF(suffix_multiple_dimension_table, '')), '') || ' psaf ON
        rpmpsr.rcl_dimension->>''l0_name'' = psaf.l0_name
      WHERE 
        rule_code ' || CASE WHEN specific_rule_code_flag THEN ' = ' || quote_literal(validity_item ->> 'rule_code') ELSE ' in ' || rule_codes END || '
        AND psa_name ' || CASE WHEN specific_store_tier_flag THEN ' = ' || quote_literal(validity_item ->> 'psa_name') ELSE ' in ' || store_tiers END || '
      ON CONFLICT (rcl_code, rule_code, psa_code) DO UPDATE
      SET 
        validity = EXCLUDED.validity,
        updated_at = now(),
        updated_by = $2;
    ';
    RAISE NOTICE '_query_part: %', query;
    EXECUTE query USING created_by, updated_by;
  END LOOP;
  query := 'select 1';
  OPEN $1 FOR EXECUTE query;
END;
$function$
;
