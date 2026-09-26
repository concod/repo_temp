--liquibase formatted sql
--changeset liquibase:product_type_hierarchy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_type_hierarchy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_type_hierarchy(refcursor, jsonb, collist character varying);
CREATE OR REPLACE FUNCTION inventory_smart.product_type_hierarchy(refcursor, jsonb, collist character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 * Function/Procedure name: inventory_smart.product_type_hierarchy
 * Created by: Renugopal
 * Created at: 29-Aug-2022
 * No of input parameter: 3
 * Parameter Description : $1 = Ref cursor
 *                         $2 = ph_master attributes
 * 						   $3 = column required

 * Purpose: This function been created to get filter data for article_status_tag or product type
 *  from ph_master
 * Calling Statement:
	begin;
	select * from 
	inventory_smart.product_type_hierarchy('my_cur'::refcursor, 
	'{"l0_name": [{"type": "list", "operator": "in", "values": ["Accessories"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["Fashion Accessories"]}], "l2_name": [], "l3_name": [], "style": [], "color": []}'::jsonb,
	'article_status_tag');
	FETCH ALL IN "my_cur";
	COMMIT;
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * 
 */
declare
	_query_pm text := '';
	v_final_query text;
	_cache_payload jsonb := jsonb_build_object('ph_master', $2, 'hierarchy', $3);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.product_type_hierarchy';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.ph_master,global.product_attributes,global.product_master}';
BEGIN
	_query_pm :=  "inventory_smart".form_main_table_filters('inventory_smart.ph_master', $2) ;

	v_final_query := '
		select distinct('|| colList||')  as attribute
		from inventory_smart.ph_master
		 
			' || _query_pm || ' ';
		
	raise notice '%', v_final_query;

	select
	  * 
	from 
	  cache.wrap_sp(
		_cache_schema, 
		_cache_sp, 
		_cache_payload, 
		v_final_query, 
		_cache_dependencies, 
		_cache_key_pattern
	  ) into _cache_table_id;
	--_query_table_filters := global.form_table_query($4);
	perform set_config(
	  'myvars.cache_table_id', _cache_table_id, 
	  true
	);
	open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
	RETURN $1;
end
$function$
;
