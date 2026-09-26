
--liquibase formatted sql
--changeset sanath.kumar@impactanalytics.co:MTP-47024_mns_sg_download runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-47024_mns_sg_download
--comment: Chaged sg.channel to sgmNew.channel in the intial select clause to access respective channel for particular store_code FOR MNS
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.store_group_list_aggregation_download_main(input refcursor, jsonb, jsonb, jsonb, jsonb, text[]);
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
  * Chaitanya             25-Jun-2024     Added store group view logic to support multi channel use case for M&S 
  * Sanath Kumar          26-jun-2024     Changed sg.channel to sgmNew.channel in intial select clause to point the channel column from store_attribute_filters instead of store_groups.
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
		end loop;
		store_attribute_filter_final_select := LEFT(store_attribute_filter_final_select, LENGTH(store_attribute_filter_final_select) - 2 );
		store_attribute_filter_parameters := LEFT(store_attribute_filter_parameters, LENGTH(store_attribute_filter_parameters) - 2);
		store_attribute_filter_required_params := LEFT(store_attribute_filter_required_params, LENGTH(store_attribute_filter_required_params) - 2);
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
		_query_combine := 'SELECT * FROM (
				select
				sg.name as name,
				sg.special_classification as special_classification,
				sgmNew.channel,
				sg.created_at,
				sg.updated_at,
				um.name as created_by,
				umup.name as updated_by,
				' || store_attribute_filter_final_select || ' 
			from
			(
				select
					sg_code,
					sg.name,
					sg.special_classification,
					sg.created_at,
					sg.updated_at,
					sg.created_by,
					sg.channel,
					sg.updated_by 
				from
					(select * from "global".store_groups where sg_code in ( select sg_code from "global".store_group_view ' 
						|| _query_sg || '  )) sg ) sg
					left join
						(
						select
							user_code,
							name 
						from
							"global".user_master um 
						where
							(
								um.is_deleted::bool = ''false''::bool
							)
						)
						um 
						on sg.created_by = um.user_code 
					left join
						(
						select
							user_code,
							name 
						from
							"global".user_master um 
						where
							(
								um.is_deleted::bool = ''false''::bool
							)
						)
						umup 
						on sg.updated_by = umup.user_code'
						|| _filter_con || '
			
					left join
						(
						select
							sg_code,
							' || store_attribute_filter_parameters || ',
							channel 
						from
							"global".store_groups_mapping 
							join
								(
									select
										' || store_attribute_filter_required_params || ',
										channel 
									from
										global.store_attributes_filter 
									where
										active 
								)
								saf using (store_code) 
						where
							sg_code is not null 
						group by
							sg_code,
							'|| store_attribute_filter_parameters ||',
							channel
						)
						sgmNew 
						on sg.sg_code = sgmNew.sg_code 
			) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		open $1 for execute _query_combine;
		return $1;
end $function$
;