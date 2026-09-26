--liquibase formatted sql
--changeset nuttu.hariprasad@impactanalytics.co:store_group_list_aggregation_download_main runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-99547 - added select wrapper to the query
--comment: optimized the query for store_groups_list_aggregation_download_main and added select wrapper to the query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".store_group_list_aggregation_download_main(input refcursor, jsonb, jsonb, jsonb, jsonb, text[]);

CREATE OR REPLACE FUNCTION global.store_group_list_aggregation_download_main(input refcursor, jsonb, jsonb, jsonb, jsonb, text[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$ 
/*
  * Function/Procedure name: global.store_group_list_aggregation_download_main
  * Created by: Shreyan Haldankar
  * Created at: 28-Feb-2024
  * No of input parameter: 6
  * Parameter Description : $1 = Input Refcursor 
  *                         $2 = JSON for Store Group Filter
  * 						$3 = JSON for Store Master Filter
  *                         $5 = JSON for search, sort and limit clause
  *                         $6 = JSON for store_attribute_filter_columns
  * Purpose: This function been created to get the store group list after select the different filter like store, store_attribute, product and product_attribute
  * Calling Statement:
  *  select * from global.store_group_list_aggregation_download_main(
  * 		'edbc89dd-f873-41d8-8f2c-961a18583ae1',
  * 		'{"channel": [{"type": "list", "operator": "in", "values": ["PFS"]}], "application_code": [{"type": "custom", "operator": "=", "values": 1}]}',
  * 		'{}',
  * 		'{"country": [{"type": "list", "operator": "in", "values": ["CANADA"]}]}',			
  * 		'{"search": [], "sort": [{"column": "updated_at", "order": "desc"}], "range": [], "limit": null, "query_type": "AND"}',
  * 		array['store_code', 'store_name', 'country'])
  * 		
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       	Updated_on      Purpose
  * ----------       	-----------     --------
  * Shreyan Haldankar     01-Mar-2024     Add SG Filter Aggregation Download SP
  * Shreyan Haldankar	  26-Mar-2024	  Updated SQL Function to handle store_code if not present (for rl retail_facility_code)
  * Nuttu Hariprasad      02-Dec-2025	  Optimized the query for store_group_list_aggregation_download_main
  */
declare 
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text := '';
	_main_filter_cnt int := 0;
	_attr_filter_cnt int := 0;
	_filter_con text := ' ';
	_query_sg text;
	_query_sa_where_clause text := '';
	store_attribute_filter_array text[] := $6;
	store_attribute_filter_parameters text := '';
	store_attribute_filter_final_select text := '';
	store_attribute_filter_required_params_array text[];
	store_attribute_filter_required_params text := '';
	store_attribute_filter_required_params_saf text := '';
	val text := '';
	store_code_array_index int;
	
	begin
		$2 := $2 || ('{"is_deleted": [{"type": "custom", "operator": "=", "values": false}]}'::jsonb);
		$3 := $3 || ('{"active": [{"type": "custom", "operator": "=", "values": true}]}'::jsonb);
		_query_sg := global.form_main_table_filters('store_groups', $2);
		$2 := $2 || ('{"store_name": []}'::jsonb);

		SELECT count(*) INTO _main_filter_cnt from jsonb_each_text($3);
		select count(*) into _attr_filter_cnt from jsonb_each_text($2);
		raise notice '%,%', _main_filter_cnt, _attr_filter_cnt;

		store_attribute_filter_required_params_array := store_attribute_filter_required_params_array || store_attribute_filter_array;
		store_code_array_index := array_position(store_attribute_filter_required_params_array, 'store_code');

		if store_code_array_index is null then
			store_attribute_filter_required_params_array := array_append(store_attribute_filter_required_params_array, 'store_code');
		end if;

		foreach val in array store_attribute_filter_array loop 
			store_attribute_filter_final_select := store_attribute_filter_final_select || 'sgmNew.' || val || ' AS ' || val || ', ';
			store_attribute_filter_parameters := store_attribute_filter_parameters || val || ', ';
		end loop;

		foreach val in array store_attribute_filter_required_params_array loop 
			store_attribute_filter_required_params := store_attribute_filter_required_params || val || ', ';
			store_attribute_filter_required_params_saf := store_attribute_filter_required_params_saf || 'saf.' || val || ', ';
		end loop;
		store_attribute_filter_final_select := LEFT(store_attribute_filter_final_select, LENGTH(store_attribute_filter_final_select) - 2 );
		store_attribute_filter_parameters := LEFT(store_attribute_filter_parameters, LENGTH(store_attribute_filter_parameters) - 2);
		store_attribute_filter_required_params := LEFT(store_attribute_filter_required_params, LENGTH(store_attribute_filter_required_params) - 2);
		store_attribute_filter_required_params_saf := LEFT(store_attribute_filter_required_params_saf, LENGTH(store_attribute_filter_required_params_saf) - 2);
		raise notice '%,%,%', store_attribute_filter_final_select, store_attribute_filter_parameters, store_attribute_filter_required_params;
		_query_table_filters := global.form_table_query($5);

		raise notice ' _main_filter_cnt : %', _main_filter_cnt;
		raise notice ' _attr_filter_cnt : % ', _attr_filter_cnt;

		if _main_filter_cnt = 0 and _attr_filter_cnt != 0 then
			_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sa || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		elseif _main_filter_cnt != 0 and _attr_filter_cnt = 0 then
			_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		elseif _main_filter_cnt != 0 and _attr_filter_cnt != 0 then
			_query_sm := 'SELECT * FROM global.store_master' || (global.form_main_table_filters('store_master', $3));
			_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $4);
			_filter_con := ' JOIN (SELECT sgm.sg_code FROM (' || _query_sm || ') x JOIN (' || _query_sa || ') y on x.store_code = y.store_code join "global".store_groups_mapping sgm ON x.store_code = sgm.store_code group by sgm.sg_code) f ON sg.sg_code = f.sg_code ';
		end if;
		raise notice '_filter_con%', _filter_con;
		--combine query
		_query_combine := 'WITH active_stores AS (
				SELECT ' || store_attribute_filter_required_params || ', channel
				FROM global.store_attributes_filter
				WHERE active
			),
			valid_store_groups AS (
				SELECT
					sg.sg_code,
					sg.name,
					sg.special_classification,
					sg.created_at,
					sg.updated_at,
					sg.created_by,
					sg.updated_by,
					sg.channel
				FROM "global".store_groups sg ' || _query_sg || '
			),
			filtered_mapping AS (
				SELECT DISTINCT ON (sgm.sg_code, sgm.store_code)
					sgm.sg_code,
					' || store_attribute_filter_required_params_saf || '
				FROM "global".store_groups_mapping sgm
				JOIN active_stores saf
					ON sgm.store_code = saf.store_code
				WHERE sgm.sg_code IS NOT NULL
				ORDER BY sgm.sg_code, sgm.store_code
			),
			filtered_grades AS (
				SELECT sgtg.store_code, sgtg.name, sgtg.grade
				FROM "global".store_groups_to_grade sgtg
				WHERE EXISTS (
					SELECT 1
					FROM "global".store_groups_mapping sgm
					WHERE sgm.store_code = sgtg.store_code
					AND sgm.sg_code IS NOT NULL
				)
			),
			valid_users AS (
				SELECT user_code, name
				FROM "global".user_master
				WHERE is_deleted = false
			)
			select * from ( SELECT
				sg.name,
				sg.special_classification,
				sg.channel,
				sg.created_at,
				sg.updated_at,
				u1.name AS created_by,
				u2.name AS updated_by,
				' || store_attribute_filter_final_select || ',
				fg.grade AS store_grade
			FROM valid_store_groups sg ' || _filter_con || '
			JOIN filtered_mapping sgmNew
			  ON sg.sg_code = sgmNew.sg_code
			LEFT JOIN filtered_grades fg
			  ON sgmNew.store_code = fg.store_code
			  AND sg.name = fg.name
			LEFT JOIN valid_users u1
			  ON sg.created_by = u1.user_code
			LEFT JOIN valid_users u2
			  ON sg.updated_by = u2.user_code ) as result ' || _query_table_filters;
		raise notice '%',_query_combine;
		open $1 for execute _query_combine;
		return $1;
end $function$
;
