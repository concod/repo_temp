--liquibase formatted sql
--changeset liquibase:product_dc_mapping_agg_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_dc_mapping_agg_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_dc_mapping_agg_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_dc_mapping_agg_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(style character varying, dc_map json)
 LANGUAGE plpgsql
AS $function$
/*
Function to list product and its dc mapping at style level
Updated_by       Updated_on      Purpose
 ----------       -----------     --------
 Pradeep Nayak    07-Sept-2022   handled dynamic attributes 
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	-- for dynamic product attributes, to be used while json_agg
	_key text;
	_value text;
	_product_attribute_json_keys text[] := array['''dc_map''', 'pdm.dc_map', '''product_code''', 'pm.product_code', '''product_name''', 'pm.product_name', '''product_description''', 'pm.product_description']::text[];
	begin
		-- iterate over dynamic product attributes and preare the key value for json_build_object.
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key != 'style' then
				_product_attribute_json_keys := array_append(_product_attribute_json_keys, ''''||_key||'''');
				_product_attribute_json_keys := array_append(_product_attribute_json_keys, 'pm.'|| _key ||'');
			end if;
		end loop;
		--add style column if not exists in input json.
		if $2->'style' IS null then
			$2 := $2 || '{"style": []}'::jsonb;
		end if;
		-- add style to input if not present.
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'SELECT * FROM (
select
	pm.style,
	json_agg (
		json_build_object (
			' || array_to_string(_product_attribute_json_keys, ', ') ||'
		)
	) as products
from
	(
	select
		main.product_name,
		main.product_description,
		attributes.*
	from
		(' || _query_pm || ') main
	join (' || _query_pa || ') attributes on
		main.product_code = attributes.product_code) pm
left join (
	select
		product_code,
		json_agg(jsonb_build_object('' dc_code'', dc.dc_code, '' name'', dc.name)) as dc_map
	from
		"global".product_dc_mapping pdm
	join "global".distribution_centres dc on
		pdm.dc_code = dc.dc_code
	where dc.is_active
	group by
		product_code) pdm on
	pm.product_code = pdm.product_code
group by pm.style
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
