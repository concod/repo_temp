--liquibase formatted sql
--changeset liquibase:pud_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pud_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.pud_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.pud_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(style character varying, description text, mapped_definition jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
		_query_table_filters := "global".form_table_query($3);
		_query_combine := 'select
								*
							from
								(
								select
									s.style,
									''-'' as description,
									case when count(pud.pud_code) = 0 then
										null
									else
										jsonb_agg(
											json_build_object(
												''pud_code'', pud.pud_code,
												''name'', pud.name,
												''definition_type'', pud.definition_type
											)
										) end as mapped_definition
								from (
									select
										distinct attributes.style
									from
										(' || _query_pm || ') main
									join (' || _query_pa || ') attributes on
										main.product_code = attributes.product_code
								) s left join (
									select style, pud.* from (
										select
											*
										from
											"global".style_mapping
										where
											mapping_type = ''style_product_unit_mapping'') sm
										join (
											SELECT * FROM "global".product_unit_definitions where
											is_deleted = false
										) pud on
									sm.pud_code = pud.pud_code) pud
								on s.style = pud.style
								group by s.style) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.pud_list(input integer)
 RETURNS TABLE(pud_code integer, name character varying, description text, definition_type character varying, metric_type character varying, pack_quantity integer, packs_in_carton_quantity integer, cartons_in_box_quantity integer, metrics jsonb, colors character varying[], sizes character varying[])
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
	_style varchar;
	_query_pa text;
	_input jsonb;
	begin
		execute 'select style from "global".style_mapping where pud_code = ' || $1 || ';' into _style;
		_input := '{"style":[{"type":"list", "operator":"in", "values":["' || _style || '"]}], "color":[], "size":[]}';
		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', _input);
		raise notice '%',_style;
		_query := '
				select
					x.*,
					scsm.colors,
					scsm.sizes
				from (
					select
						pud.pud_code,
						pud.name,
						pud.description,
						pud.definition_type,
						pud.metric_type,
						pud.pack_quantity,
						pud.packs_in_carton_quantity,
						pud.cartons_in_box_quantity,
						case when count(pudm.pud_code) = 0 then null else jsonb_agg(
							json_build_object(
								''size'', pudm.size,
								''color'', pudm.color,
								''value'', pudm.value,
								''product_code'', pudm.product_code
							)
						) end as metrics
				from (
					select
						pud_code,
						name,
						description,
						definition_type,
						pack_quantity,
						packs_in_carton_quantity,
						cartons_in_box_quantity,
						metric_type
					from
						"global".product_unit_definitions
					where
						is_deleted = false
						and pud_code = ' || $1 || ') pud
				left join (
					select
						*
					from
						"global".product_unit_definition_metrics
					where
						pud_code = ' || $1 || ') pudm
					on pud.pud_code = pudm.pud_code
				group by
					pud.pud_code,
					pud.name,
					pud.description,
					pud.definition_type,
					pud.pack_quantity,
					pud.packs_in_carton_quantity,
					pud.cartons_in_box_quantity,
					pud.metric_type) x
				join (
					select
						array_agg(distinct pa.color) as colors,
						array_agg(distinct pa.size) as sizes,
						jsonb_agg(jsonb_build_object(''product_code'', pa.product_code, ''color'', pa.color, ''size'', pa.size)) as metrics
					from
						(' || _query_pa || ') pa
					group by
						style
				) scsm on true';
		raise notice '%', _query;
		RETURN QUERY execute _query;
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.pud_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(style character varying, description text, mapped_definition jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_def text := '';
	_query_table_filters text := '';
	_query_combine text;
	_null_con int := 0;
	begin
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $1));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
 		_query_def := "global".form_attribute_table_filters('product_unit_definition_attributes', 'pud_code', $3);
		_query_table_filters := "global".form_table_query($4);
		select count(1) into _null_con from jsonb_each_text($3) where value is not null and value != '[]';
		if _null_con > 0 then
			if _query_table_filters ILIKE '%WHERE%' then
				_query_table_filters := replace(_query_table_filters, 'WHERE', 'WHERE (mapped_definition IS NOT NULL) AND ');
			else
				_query_table_filters := 'WHERE (mapped_definition IS NOT NULL) ' || _query_table_filters;
			end if;
		end if;
		_query_combine := 'select
								*
							from
								(
								select
									s.style,
									''-'' as description,
									case when count(pud.pud_code) = 0 then
										null
									else
										jsonb_agg(
											json_build_object(
												''pud_code'', pud.pud_code,
												''name'', pud.name,
												''definition_type'', pud.definition_type
											)
										) end as mapped_definition
								from (
									select
										distinct attributes.style
									from
										(' || _query_pm || ') main
									join (' || _query_pa || ') attributes on
										main.product_code = attributes.product_code
								) s left join (
									select style, pud.* from (
										select
											*
										from
											"global".style_mapping
										where
											mapping_type = ''style_product_unit_mapping'') sm
										join (
select attributes.* from (SELECT * FROM "global".product_unit_definitions where
											is_deleted = false) main
									join (' || _query_def || ') attributes on
										main.pud_code = attributes.pud_code
										
) pud on
									sm.pud_code = pud.pud_code) pud
								on s.style = pud.style
								group by s.style) X ' || _query_table_filters;
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.pud_list(input refcursor, jsonb, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_def text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_null_con int := 0;
	_key text;
	_value text;
	_attr_cols text[] := array[$2]::text[];
    _groupby_columns text ;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop 
			_attr_cols := array_append(_attr_cols, 's.'||_key);
		end loop;
		
		raise notice '%',_attr_cols ;
		_groupby_columns:= replace (array_to_string(_attr_cols, ', ', ''),'{},','');
		 
		raise notice '%',_groupby_columns ;
		
	  
		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
 		_query_def := "global".form_attribute_table_filters('product_unit_definition_attributes', 'pud_code', $4);
 		_query_sa := "global".form_attribute_table_filters('store_attributes', 'store_code', $5);
		_query_table_filters := "global".form_table_query($6);
		select count(1) into _null_con from jsonb_each_text($4) where value is not null and value != '[]';
		if _null_con > 0 then
			if _query_table_filters ILIKE '%WHERE%' then
				_query_table_filters := replace(_query_table_filters, 'WHERE', 'WHERE (mapped_definition IS NOT NULL) AND ');
			else
				_query_table_filters := 'WHERE (mapped_definition IS NOT NULL) ' || _query_table_filters;
			end if;
		end if;
		_query_combine := 'select
								*
							from
								(
								select
									ch.channel,
									s.*,
									''-'' as description,
									case when count(pud.pud_code) = 0 then
										null
									else
										jsonb_agg(
											json_build_object(
												''pud_code'', pud.pud_code,
												''name'', pud.name,
												''definition_type'', pud.definition_type
											)
										) end as mapped_definition
								from (
									select
										distinct attributes.*
									from
										(' || _query_pm || ') main
									join (' || _query_pa || ') attributes on
										main.product_code = attributes.product_code
								) s left join (
									select style, pud.* from (
										select
											*
										from
											"global".style_mapping
										where
											mapping_type = ''style_product_unit_mapping'') sm
										join (
									select attributes.* from (SELECT * FROM "global".product_unit_definitions where
																				is_deleted = false) main
																		join (' || _query_def || ') attributes on
																			main.pud_code = attributes.pud_code
																			
									) pud
					
									 on
									sm.pud_code = pud.pud_code
									) pud
								on s.style = pud.style
							left join (select channel,product_code
										select jsonb_agg(distinct saf.channel) channel ,psm.product_code  from 
										global.store_attributes_filter saf join
										global.product_store_mapping psm 
										on saf.store_code =psm.store_code  
										group by psm.product_code ) ch
								 on ch.product_code =s.product_code		
								group by ch.channel,s.product_code,'||_groupby_columns||'
						) X ' || _query_table_filters;
	
	raise notice '%', _query_combine;						
	open $1 for execute _query_combine;
	RETURN $1;					
		
		
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.pud_list(input refcursor, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

/*
 * Function/Procedure name: global.pud_list
 * Created by: Kailash Yadav
 * Created at: 22-June-2022
 * No of input parameter: 5
 * Parameter Description : $1 = refcursor
 *                         $2 = JSON for mostly Blank
 *                         $2 = JSON for attribute details
 *                         $2 = JSON for main_filters details
 *                         $2 = JSON for table_filters details
 * Purpose: This function been created to insert given attribute value in product_master if not found,
 *  if same attribute found in product_master then update the and update the same attribute_code in application_master
 * Calling Statement:
 *  select * from global.pud_list
    ( '',
    '{}',
    '{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [], "l2_name": [],
        "l3_name": [], "style": []}'
    '{"name": [], "definition_type": []}',
    '{"search": [{"column": "style", "pattern": "15279"}], "sort": [{"column": "updated_at", "order": "desc"}],
        "range": [], "limit": {"limit": 10, "page": 1}}'
    )
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    12-July-2022:   Added updated_at column.
 * Pradeep Nayak    01-Aug-2022:    1. Added cache logic , 2. Removed product_code from group by column
 * Kailash Yadav    01-Aug-2022:    Added updated_at column and group_by style.
 * Pradeep Nayak    03-Aug-2022:    Removed updated_at from group, and sorting by updated_at by taking recent updated date
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_query_def text := '';
	_query_table_filters text := '';
	_query_combine text;
	_null_con int := 0;
	_key text;
	_value text;
	_attr_cols text[] := array[$2]::text[];
	_prod_distinct_cols text[] := _attr_cols;
	_distinct_columns text;
    _groupby_columns text ;

    _cache_payload jsonb := jsonb_build_object('product_master', $2, 'product_attributes', $3,
   											   'product_unit_definition_attributes_list', $4);
	_cache_table_id text;
	_cache_schema text := 'global';
	_cache_sp text := '.pud_list';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{global.product_master, global.product_attributes_list,
									global.product_unit_definition_attributes_list, global.style_mapping,
									global.product_unit_definitions
									}';

	begin
		for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
			_attr_cols := array_append(_attr_cols, 's.'||_key);
			_prod_distinct_cols := array_append(_prod_distinct_cols, 'attributes.'||_key);
		end loop;

		raise notice '%',_attr_cols ;
		_groupby_columns:= replace (array_to_string(_attr_cols, ', ', ''),'{},','');
        _distinct_columns := replace (array_to_string(_prod_distinct_cols, ', ', ''),'{},','');
		raise notice '%',_groupby_columns ;
		raise notice '_distinct_columns: %', _distinct_columns;


		_query_pm := 'SELECT * FROM "global".product_master' || ("global".form_main_table_filters('product_master', $2));
 		_query_pa := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
 		_query_def := "global".form_attribute_table_filters('product_unit_definition_attributes', 'pud_code', $4);
 		_query_table_filters := "global".form_table_query($5);
		 -- sorting using nulls last, to avoid null values coming at top
 		_query_table_filters := replace(_query_table_filters , 'updated_at DESC', 'updated_at DESC NULLS LAST');
		select count(1) into _null_con from jsonb_each_text($4) where value is not null and value != '[]';
		if _null_con > 0 then
			if _query_table_filters ILIKE '%WHERE%' then
				_query_table_filters := replace(_query_table_filters, 'WHERE', 'WHERE (mapped_definition IS NOT NULL) AND ');
			else
				_query_table_filters := 'WHERE (mapped_definition IS NOT NULL) ' || _query_table_filters;
			end if;
		end if;
		_query_combine := 'select
									'||_groupby_columns||',
									''-'' as description,
									case when count(pud.pud_code) = 0 then
										null
									else
										jsonb_agg(
											json_build_object(
												''pud_code'', pud.pud_code,
												''name'', pud.name,
												''definition_type'', pud.definition_type
											)
										) end as mapped_definition,
									max(updated_at) as updated_at
 								from (
									select
										distinct '||_distinct_columns||'
									from
										(' || _query_pm || ') main
									join (' || _query_pa || ') attributes on
										main.product_code = attributes.product_code
								) s left join (
									select style, pud.* from (
										select
											style, pud_code
										from
											"global".style_mapping
										where
											mapping_type = ''style_product_unit_mapping'') sm
										join (
									select attributes.*, main.updated_at from (
									        SELECT pud_code, updated_at
									            FROM "global".product_unit_definitions
									                where is_deleted = false) main
												join (' || _query_def || ') attributes
												on main.pud_code = attributes.pud_code
									) pud

									 on
									sm.pud_code = pud.pud_code
									) pud
								on s.style = pud.style
								group by '||_groupby_columns||';';
	select * from cache.wrap_sp(
		_cache_schema,
		_cache_sp,
		_cache_payload,
		_query_combine,
		_cache_dependencies,
		_cache_key_pattern) into _cache_table_id;
	perform set_config('myvars.cache_table_id', _cache_table_id, true);
	raise notice '%', _query_combine;
	raise notice '_query_table_filters %', _query_table_filters;
	open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
	RETURN $1;
 	end
$function$
;
