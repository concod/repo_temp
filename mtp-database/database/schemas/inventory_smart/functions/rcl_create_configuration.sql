--liquibase formatted sql
--changeset liquibase:rcl_create_configuration_1 runOnChange:true stripComments:false splitStatements:false context:MTP-86607 labels:MTP-86607
--comment: MTP-86607 included all the hierarchy list columns when joining with filtered_paf
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_configuration(text, jsonb, int4);
DROP FUNCTION IF EXISTS inventory_smart.rcl_create_configuration(text, jsonb, int4, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_configuration(
	_temp_tbl_name text, 
	_product_filters jsonb, 
	_created_by integer,
	_is_rule_store_level_configuration boolean default false
)
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
_filtered_products_temp_table text;
_temp_table_query text;
_index_creation_query text;
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
       
    -- Create a temporary table containing all filtered products and their attributes
    _filtered_products_temp_table := 'temp_filtered_products_' || replace(gen_random_uuid()::text, '-', '');
    _temp_table_query := 'CREATE TEMPORARY TABLE ' || _filtered_products_temp_table || ' AS 
             SELECT * FROM global.product_attributes_filter paf 
             ' || _product_filter;
    
    raise notice 'Creating temporary filtered products table: %', _filtered_products_temp_table;
    raise notice 'Temp table creation query: %', _temp_table_query;
    EXECUTE _temp_table_query;
    

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
	    FROM ' || _filtered_products_temp_table || '
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
	
	-- if the rule_store_level_configuration is true, then create another temp table for the store level configuration
	if _is_rule_store_level_configuration then
	    -- Create an index on l6_name to speed up the join
        _index_creation_query := 'CREATE INDEX ON ' || _filtered_products_temp_table || ' (l6_name)';
        raise notice 'Creating index on temporary table: %', _index_creation_query;
        EXECUTE _index_creation_query;
        
		_query_part := 'create table public.' || $1 || '_store_level' || ' as
			WITH psaf_cte AS (
				SELECT 
					jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension,
					psaf.store_code,
					saf.store_name,
					saf.channel
				FROM global.product_store_attributes_filter psaf
				JOIN global.store_attributes_filter saf 
				USING (store_code)
				JOIN (
					-- selecting columns from paf which are not there in psaf but are part may be part of hierarchy list
					SELECT subbrand_code_desc, collection, sub_collection, masterstyle_descr, l6_name, product_lifecycle, l7_name
					FROM ' || _filtered_products_temp_table || '
					GROUP BY 1, 2, 3, 4, 5, 6, 7
				) AS filtered_paf
				USING(l6_name)
				WHERE psaf.terminal_flag = 1
			)
			SELECT DISTINCT
				t.rcl_code,
				t.rule_code,
				t.validity,
				psaf_cte.store_code,
				psaf_cte.store_name,
				psaf_cte.channel,
				null::int4 as auto_allocation_schedular,
				t.created_by,
				t.created_at
			FROM psaf_cte
			JOIN public.' || $1 || ' as t 
			ON md5(psaf_cte.rcl_dimension::text) = md5(t.rcl_dimension::text);
		';

		raise notice '_query_part for store level: %', _query_part;
		EXECUTE _query_part;
	end if;
		
	-- Clean up temporary table
	raise notice 'Cleaning up temporary table: %', _filtered_products_temp_table;
	EXECUTE 'DROP TABLE IF EXISTS ' || _filtered_products_temp_table;

    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_create_configuration', 'Before returning function value',_query_part,jsonb_build_object('_temp_tbl_name',$1,'_product_filters',$2,'_created_by',$3,'_is_rule_store_level_configuration',$4));
	   
END
$function$
;