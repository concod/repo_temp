--liquibase formatted sql
--changeset liquibase:product_rule runOnChange:true stripComments:false splitStatements:false context:MTP-70889 labels:MTP-70889
--comment: MTP-79889: Filter store groups by name - Fix to exclude filtering from store count - minor fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule(input refcursor, jsonb, jsonb, integer, text, jsonb);
DROP FUNCTION IF EXISTS  inventory_smart.product_rule(refcursor, jsonb, jsonb, int4, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.product_rule(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 This is signet version
 Calling statement: 
 
 select
    *
from
    inventory_smart.product_rule('my_cur',
    '{
        "l0_name": [{"type": "list","operator": "in", "values": ["Accessories"]}],
        "l1_name": [],
        "l2_name": [],
       -- "l3_name": [],
       -- "l4_name": [],
        "article": [],
       -- "color": [],
        "article_status_tag": [],
        --"erp_gender": [],
        --"style": [],
       -- "style_group": [],
       -- "human_readable_color": []
    }',
    '{
        "channel": [{"type":"list", "operator":"in", "values": ["Factory Line Retail"]}]
    }',
    1,
    '',
    '{
        "search": [],
        "sort": [],
        "range": [],
        "limit": {
            "page": 1,
            "limit": 10
        }
    }');

fetch all in "my_cur";


  Updated_by       Updated_on      Purpose
   ----------       -----------     --------


 
 
 */

	declare
	_query_ph text := '';
	_query_sa text := '';
	_query_ppa text := '';
	_query_mapped text := '';
	_channel text[] := inventory_smart.get_channel_from_input_new($3);
	_channel_and_postfix_condition text := '';
	_channel_pcm_where_condition text := '';
	_channel_and_prefix_condition text := '';
	_client_columns text;
	_application_code int4 := $4;
	_store_group_join_type text := 'left join';
	_has_store_group_filters boolean := false;
	_query_table_filters text := '';
	_query_table_sort text :='';
	_query_combine text := '';
	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'application_code', $4, 'client_columns', $5);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.product_rule';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.ph_configuration_mapping, global.store_groups, global.store_groups_mapping,
								global.product_mapping_product_store,global.product_mapping_store_dc,
								inventory_smart.product_profile_master, global.distribution_centres, 
								global.product_mapping, inventory_smart.product_profile_attributes}';
	_store_groups text;
	_store_group_filter text := '';
	_store_group_join text := '';
	_store_filters jsonb;
	_select_clause text := '*';
	begin

		_store_filters := $3;
		
		-- Check if Store Group filters are applied in store_attributes
		-- Dynamically find any store group related key in the JSON
		SELECT EXISTS (
			SELECT 1 FROM jsonb_object_keys($3) AS key 
			WHERE key ILIKE '%store_group%' 
			AND jsonb_array_length($3->key) > 0
		) INTO _has_store_group_filters;
		
		if _has_store_group_filters then
			_store_group_join_type := 'inner join';
			raise notice 'Store Group filters detected in JSON, using INNER JOIN to exclude empty Store Groups';
			raise notice 'store groups %', $3->>'store_group';
			select
				CASE
				WHEN concat(array_agg(value)) IS NULL THEN ARRAY['']
				ELSE array_agg(value)
				END
			into _store_groups from json_array_elements_text(((json_extract_path(($3->>'store_group')::json, '0')::json)->>'values')::json);
			_store_group_join := 'join (select unnest(default_store_groups) as default_store_group, ph_code from inventory_smart.ph_configuration_mapping pcm
						 ' || _channel_pcm_where_condition || ') pcm using (ph_code)
					join "global".store_groups sg on pcm.default_store_group = sg.sg_code';
			_store_group_filter := ' and name = any(''' || _store_groups ||'''::varchar[])';
			_store_filters := $3 - 'store_group';
			_select_clause := 'distinct ph.*';
		end if;
 		
		_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_filters);
 		_query_mapped := inventory_smart.form_main_table_filters('ph_master', $7);

-- 		raise notice '%,',replace (_channel,',','');
 		
 		if length ($5)> 0 then
			_client_columns := ','||$5;
		else 
			_client_columns := '';
		end if;
	
-- 		raise notice '_query_ppa %,',_query_ppa;
		if cardinality(_channel) = 0 then
 			raise notice 'no channel passs %,',_channel;
 			_channel_and_postfix_condition = ' ';
 			_channel_pcm_where_condition = ' ';
 			_channel_and_prefix_condition = ' ';
 		else
 			_channel_and_postfix_condition = ' channel in (''' || array_to_string(_channel, ''',''', '') || ''') and ';
 			_channel_pcm_where_condition = ' where pcm.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
 			_channel_and_prefix_condition = ' and ph.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
 		end if;
 		
 	
 		_query_table_filters := global.form_table_query($6);
		_query_table_sort := global.form_table_query($6 -'limit' -'search' - 'range');
 		_query_combine := '
			with ph_data as (
					select * from (select 
						ph.*
						--paf.drop_ship_ind,
					    --paf.merchandise_brand,
						--paf.metal_color,
						--paf.metal_type
					from (select ' || _select_clause || ', unnest(product_codes) as product_code from inventory_smart.ph_master ph ' || _store_group_join  || ' ' || _query_ph || ' ' || _store_group_filter ||') as ph
					--join global.product_attributes_filter paf on paf.article = ph.article
					) as x
					' || _query_table_filters ||'
				)
				-- select * from ph_data
				, 
				product_store_mapping as (
				  select
				    ph_code,
				    array_agg(distinct pmps.store_code) as store_codes 
				  from
				    ph_data ph
				    join global.product_mapping_product_store pmps on pmps.product_code = ANY (ph.product_codes)
					and current_date <@ validity
					and pmps.l0_name = ph.l0_name 
				    join (' || _query_sa || ') saf on
				    pmps.store_code = saf.store_code
				  where
				    is_active = true and validity is not null
				  group by
				    1
				)
				-- select * from product_store_mapping
				,
 				default_channel_level_product_profile as (
					select ph_code, default_product_profiles[1] as default_product_profile from(
					  select 
					    ph.ph_code,
					    array_remove(array_agg(distinct default_product_profile),null) as default_product_profiles
					  from 
					    (select ph_code, channel, default_product_profile from inventory_smart.ph_configuration_mapping pcm
						' || _channel_pcm_where_condition || ' ) as pcm 
					    join ph_data ph on pcm.ph_code = ph.ph_code
					    ' || _channel_pcm_where_condition || '
						group by 1) as x
				),
				default_channel_level_dc as (
					select ph_code, default_dcs from(
					  select 
					    ph.ph_code,
					    array_agg(distinct default_dcs) as default_dcs
					  from 
					    (select ph_code, unnest(default_dcs) as default_dcs, channel from inventory_smart.ph_configuration_mapping pcm
						' || _channel_pcm_where_condition || ' ) as pcm 
					    join ph_data ph on pcm.ph_code = ph.ph_code
					    ' || _channel_pcm_where_condition || '
						group by 1) as x
				)
				--  select * from default_channel_level_dc_product_profile
				,ph_code_default_store_groups as (
					select
						ph.ph_code,
						array_agg(distinct pcm.default_store_group) as default_store_groups,
--						array_agg(distinct sgm.store_code) as sg_store_codes,
						array_agg(distinct sg.name) as sg_names
					from
						(select unnest(default_store_groups) as default_store_group, ph_code from inventory_smart.ph_configuration_mapping pcm
						' || _channel_pcm_where_condition || ') as pcm
					join ph_data ph on pcm.ph_code = ph.ph_code
--					join "global".store_groups_mapping sgm on pcm.default_store_group = sgm.sg_code
					join "global".store_groups sg on pcm.default_store_group = sg.sg_code
					where sg.is_deleted = false and application_code = ' || _application_code || '
					group by 1
				)
				--select * from ph_code_default_store_groups
				,selected_sgs_store_count as (
					select
						psm.ph_code,
						count(distinct store_code) as store_available_count
					from
						ph_code_default_store_groups pcdsg
						join product_store_mapping psm using(ph_code)
						left join global.store_groups_mapping sgm on sgm.sg_code = any(pcdsg.default_store_groups)
						and sgm.store_code = any(psm.store_codes)
					group by 1
				)
--				select * from selected_sgs_store_count
				, 
				results as (
				  select
				    ph.*,
					pcdsg.sg_names,
				    dcldpp.default_product_profile,
				    case when pcdsg.default_store_groups is null then array[] :: int4[] else pcdsg.default_store_groups end as default_store_groups,
 				    case when dcld.default_dcs is null then array[] :: int4[] else dcld.default_dcs end as default_dcs, 
				    case when dcldpp.default_product_profile is null then 0 else 1 end as product_profile_mapped,
				    case when dcldpp.default_product_profile is null then ''-'' else ppm."name" end as product_profile_name,
					case when pcdsg.default_store_groups is null then false else true end as default_store_groups_available, 
 				    case when dcld.default_dcs is null then false else true end as default_dcs_available, 
 				    case when dcldpp.default_product_profile is null then false else true end as product_profile_mapped_available, 
				    coalesce(
				      array_length(pcdsg.default_store_groups, 1),
				      0
				    ) as store_group_mapped,
				    coalesce(
 				      array_length(dcld.default_dcs, 1), 
				      0
				    ) as dc_mapped,
				    ''{}'':: int4[] as store_group_available,
					''{}'' :: int4[] as product_profile_available,
				    ''{}'' :: int4[] as dc_available,
				--    coalesce(
				--      array_length(sgs.sg_codes, 1),
				--      0
				--    ) as store_group_available_count,
				    coalesce(sssc.store_available_count, 0) as store_available_count
				  from
				    ph_data ph
 				    left join default_channel_level_product_profile dcldpp using(ph_code) 
					left join default_channel_level_dc dcld using(ph_code) 
				    ' || _store_group_join_type || ' ph_code_default_store_groups pcdsg using(ph_code)
					left join selected_sgs_store_count sssc using(ph_code)
					left join inventory_smart.product_profile_master ppm on dcldpp.default_product_profile = ppm.pp_code
					
				)
				-- select * from results
				,
				formated_results as (
				  select
				    *,
				    concat(
				      store_group_mapped, '' / '', store_available_count
				    ) as store_group_mapped_display 
				  from
				    results
					'|| _query_mapped ||'
				)
				select 
				  * 
				from 
				  formated_results'|| _query_table_sort ||'';
		raise notice 'Query: %', _query_combine;
--		select * from cache.wrap_sp(
--			_cache_schema,
--			_cache_sp,
--			_cache_payload,
--			_query_combine,
--			_cache_dependencies,
--			_cache_key_pattern) into _cache_table_id;
--		_query_table_filters := global.form_table_query($6);
--		perform set_config('myvars.cache_table_id', _cache_table_id, true);
--		open $1 for execute _query_combine;
--		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		open $1 for execute _query_combine;
		RETURN $1;
	end
$function$
;