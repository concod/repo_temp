--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:refresh_product_time_attributes_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:updated_at_by_info
--comment: initial changeset for refresh_product_time_attributes_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.refresh_product_time_attributes(input text[]);
CREATE OR REPLACE FUNCTION global.refresh_product_time_attributes(input text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 	declare
 	_key text;
 	_value text;
 	_query text;
 	_dc_store_map_query text;
 	_keys text[] := array['created_by']::text[];
 	_agg_code_lst text[] := array[$1]::text[];
 	_prod_code_lst text[] := array[]::text[];
 	_store_code varchar;
 	_dc_code int;
 	_dc_name varchar;
 	_agg_level_db text;
 	_del_query text;
 	begin
	 select (attribute_value->>'dynamicLabelKeys')::json->>'style' as atr_val from global.tenant_attribute_master tam where name = 'core_screen_configuration' into _agg_level_db;
	 	if _agg_level_db is not null and _agg_level_db <> 'product_code'
	 	then
	 	
	 	 _query:= 'SELECT array(select DISTINCT product_code FROM global.product_attributes_filter WHERE ' || _agg_level_db || ' IN (' || ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_agg_code_lst) elem), ',') || '))';
	 	
		EXECUTE _query INTO _prod_code_lst;
		raise notice 'product code list %', _prod_code_lst;
		_del_query = 'delete from global.product_time_attributes where product_code in (' || ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_prod_code_lst) elem), ',') || ') and attribute_name = ''status''';
		raise notice 'delete here %', _del_query;
		execute _del_query;
	 	raise notice 'reached here %', _prod_code_lst;
	 	_query:= 'with cte1 as (
					select
						aggregation_code,
						unnest(products) as pro,
						unnest(l0_name) as l0_name
					from
						global.aggregation_level_filter alf
					where
						aggregation_code in ('|| ARRAY_TO_STRING(ARRAY(SELECT quote_literal(elem) FROM UNNEST(_agg_code_lst) elem), ',') ||'))
					INSERT INTO global.product_time_attributes (attribute_name, attribute_value, start_time, end_time, updated_at, updated_by, product_code, l0_name)
					select
						ata.attribute_name,
						ata.attribute_value,
						ata.start_time,
						ata.end_time,
						ata.updated_at,
						ata.updated_by,
						cte1.pro as product_code,
						cte1.l0_name
					from
						global.aggregation_time_attributes ata
					join cte1 on
						ata.aggregation_code = cte1.aggregation_code';
			end if;
	execute _query;
	--raise notice 'recdcsd %', _query;	 	
 	end $function$
;

