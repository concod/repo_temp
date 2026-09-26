--liquibase formatted sql
--changeset liquibase:rcl_create_configuration runOnChange:true stripComments:false splitStatements:false context:MTP-38503 labels:MTP-38503
--comment: MTP-38503 Used to create rcl configuration
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_configuration(text, jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_configuration(_temp_tbl_name text, _product_filters jsonb, _created_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_product_filter text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_jsonb_body text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    _product_filter := global.form_rcl_product_validity_filter($2, '{}');
    _product_filter := replace(REPLACE(_product_filter, '(rcl_dimension->>''', ''), ''')', '');
    for _key, _value in select * from jsonb_each_text($2) loop
	    	raise notice 'value2: %', _value;
    		_keys := array_append(_keys, _key);
    end loop;
    FOREACH _key IN ARRAY _keys loop
    	_jsonb_arr := array_append(_jsonb_arr, ''|| '''' || _key || '''' || ', ' || _key ||'');
    raise notice 'jsonb_arr: %', _jsonb_arr;
    end loop;
    _jsonb_body := array_to_string(_jsonb_arr, ', ');
    raise notice 'jsonb_body: %', _jsonb_body;
   
   _query_part := 'create table public.' || $1 || ' as
	WITH aggregated_data AS (
	    SELECT 
	        jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
	        NULL::int4 AS rcl_code,
			''''::varchar AS rule_name,
			null::int4 as dc_store_rule,
			null::int4 as auto_allocation_rule,
			null::int4 as auto_allocation_schedular,
			null::int4 as default_product_profile,
			null::int[] as default_store_groups,
	        NULL::daterange AS validity,
	        ' || _created_by || '::int4 AS created_by,
	        ' || quote_literal(now()) || '::timestamp AS created_at,
	        nextval(''inventory_smart.rcl_dc_store_policy_rule_rule_code_seq'') as rule_code
	    FROM global.product_attributes_filter paf
	    ' || _product_filter || '
	    GROUP BY 1
	)
	 SELECT  
	    ad.rcl_dimension, 
	    ad.rcl_code, 
		ad.rule_name,
	    ad.dc_store_rule,
		ad.auto_allocation_rule, 
		ad.auto_allocation_schedular, 
	    ad.default_product_profile, 
	    ad.default_store_groups,
	    ad.validity, 
	    ad.created_by, 
	    ad.created_at, 
	    ad.rule_code
	FROM aggregated_data ad
	GROUP BY 
	    ad.rcl_dimension, 
	    ad.rcl_code, 
		ad.rule_name,
	    ad.dc_store_rule,
		ad.auto_allocation_rule, 
		ad.auto_allocation_schedular, 
	    ad.default_product_profile, 
	    ad.default_store_groups, 
	    ad.validity, 
	    ad.created_by, 
	    ad.created_at, 
	    ad.rule_code;';
	   	raise notice '_query_part: %', _query_part;

	   EXECUTE _query_part;

    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_create_configuration', 'Before returning function value',_query_part,jsonb_build_object('_temp_tbl_name',$1,'_product_filters',$2,'_created_by',$3)) ;		
	   
END
$function$
;