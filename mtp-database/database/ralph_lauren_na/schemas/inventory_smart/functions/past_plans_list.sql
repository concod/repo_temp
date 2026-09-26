--liquibase formatted sql
--changeset liquibase:past_plans_list runOnChange:true stripComments:false splitStatements:false context:MTP-66049 labels:MTP-66049_1 total_allocated_qty fix
--comment: MTP-66049 fix Filter total_allocated_qty > 0
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.past_plans_list(input refcursor, jsonb, jsonb, jsonb, character varying, character varying);
DROP FUNCTION IF EXISTS inventory_smart.past_plans_list(input refcursor, jsonb, jsonb, jsonb, character varying, character varying, check_parent_allocation boolean);
CREATE OR REPLACE FUNCTION inventory_smart.past_plans_list(input refcursor, jsonb, jsonb, jsonb, character varying, character varying, check_parent_allocation boolean DEFAULT FALSE)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: global.past_plans_list
 * Created by: Renugopal S
 * Created at: 17-Aug-2022
 * No of input parameter: 6
 * Parameter Description : $1 = Ref cursor
 *                         $2 = Plan_filter
 * 						   $3 = plan_attributes
 * 						   $4 = Filter meta search
 * 						   $5 = start_date
 *  					   $6 = end_date
 * Purpose: This function been created to insert given attribute value in attribute_master if not found,
 *  if same attribute found in attribute_master then update the and update the same attribute_code in applicatiom_master
 * Calling Statement:
	BEGIN;
    select * from inventory_smart.past_plans_list('my_cur',
    '{"status": [{"type": "list", "operator": "in", "values": [3]}]}', 
    '{"l0_name":[]}',
    '{}',
   '1996-05-03',
  	'2022-08-19');
    FETCH ALL IN "my_cur";
    COMMIT;
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 */
declare
	_query_pm text := '';
	_query_pa text := '';
	_date_range text:= '';
--	_pa_input jsonb;
	_query_table_filters text := '';
	_query_combine text;
	_inventory_source_clause text := '';
	_cache_payload jsonb := jsonb_build_object('plan_attributes', $2, 'plan_code', $3, 'start_date', $5, 'end_date', $6);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.past_plans_list';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.plan_master,inventory_smart.plan_attributes}';
	begin
		select jsonb_object_agg(key, value) into $2 from (select * from jsonb_each_text($2) where key != 'is_deleted' union select 'is_deleted', '[{"type":"custom","operator":"=","values":"false"}]') x;
		_query_pm := 'SELECT * FROM "inventory_smart".plan_master' || ("inventory_smart".form_main_table_filters('plan_master', $2));
--		_pa_input := "inventory_smart".form_attributes_list($3, 'plan_attributes');
--		raise notice '_pa_input: %', _pa_input;
 		_query_pa := "inventory_smart".form_attribute_table_filters('plan_attributes', 'plan_code', $3);
		_query_table_filters := "inventory_smart".form_table_query($4);
		
		if ($5 = '') IS FALSE
		then
			_date_range := 'AND DATE(created_at at TIME ZONE ''EST'') between DATE('''||$5||''') and DATE('''||$6||''') ';
			_query_pm := concat(_query_pm, _date_range);
		end if;
		raise notice '_date_range: %', _date_range;

        _inventory_source_clause := '
        CASE
            WHEN ''wholesale dc'' = ANY(attributes.inventory_source) THEN array[''Placeholder PO'']::varchar[]
            WHEN ''dc'' = ANY(attributes.inventory_source) THEN array[''DC'']::varchar[]
            WHEN ''reserved'' = ANY(attributes.inventory_source) THEN array[''User Reserve'']::varchar[]
            ELSE attributes.inventory_source
        END AS inventory_source
        ';
		_query_combine := 'select
				*
			from
				(
				select
						main.name,
						main.status,
						main.type,
						main.description,
						TO_CHAR(main.created_at AT TIME ZONE ''EST'', ''YYYY-MM-DD'') AS created_at,
						to_char(main.updated_at,''yyyy-mm-dd'') as updated_at,
 						u_created.name as created_by,
						u_updated.name as updated_by,
						attributes.*
					from
						(' || _query_pm || ') main
					join (' || _query_pa || ') attributes on
						main.plan_code = attributes.plan_code
 					left join global.user_master u_created ON main.created_by = u_created.user_code
					left join global.user_master u_updated ON main.updated_by = u_updated.user_code
				) X' ;
		IF check_parent_allocation THEN
			_query_combine := _query_combine || ' where X.parent_allocation is not null and X.total_allocated_qty > 0';
		END IF;
		raise notice '%',  _query_combine;
		select * from cache.wrap_sp(
			_cache_schema,
			_cache_sp,
			_cache_payload,
			_query_combine,
			_cache_dependencies,
			_cache_key_pattern) into _cache_table_id;
		_query_table_filters := global.form_table_query($4);
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		-- raise notice '%', 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
 	end
   $function$
;
