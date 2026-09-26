--liquibase formatted sql
--changeset liquibase:product_rule runOnChange:true stripComments:false splitStatements:false context:MTP-70913,MTP-88398 labels:MTP-70913,MTP-72089,MTP-88398
--comment: MTP-70913 - product rule sp changed to make sure cross_country_allocation is always set as Allowed,MTP-72089, MTP-73444, MTP-73990,store count to calculate from default_select, fix last updated details,MTP-88398
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb)
 RETURNS text
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
	_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
	_application_code int4 := $4;
	_query_table_filters text := '';
	_query_table_sort text :='';
	_query_combine text := '';
	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'application_code', $4, 'client_columns', $5);
	_cache_table_id text;
	_l0_name_updated text := '';
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.product_rule';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.ph_configuration_mapping, global.store_groups, global.store_groups_mapping,
								global.product_mapping_product_store,global.product_mapping_store_dc,
								inventory_smart.product_profile_master, global.distribution_centres, 
								global.product_mapping, inventory_smart.product_profile_attributes}';
	begin
		_query_ph := inventory_smart.form_main_table_filters('ph_master', $2);
 		_query_sa := global.form_main_table_filters('store_attributes', $3);
 		_query_mapped := inventory_smart.form_main_table_filters('ph_master', $7);
 		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into _l0_name_updated;
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
 		select replace(_query_table_filters, 'WHERE', 'AND') into _query_table_filters;
		_query_table_sort := global.form_table_query($6 -'limit' -'search' - 'range');
 		_query_combine := '
			with ph_data as materialized (
				select 
					ph_code,
					article,
					product_description,
					style_color_id,
					color,
					model_description,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					supersede_flag,
					channel,
					product_codes
				from
				inventory_smart.ph_master ph ' || _query_ph || _channel_and_prefix_condition || '
					' || _query_table_filters ||'
				)
				-- select * from ph_data
				, 
			saf as materialized (
				select array_agg(store_code) as store_codes FROM "global".store_attributes_filter '|| _query_sa || '
			),
			product_store_mapping as (
				select ph_code,
				(
					select array_agg(distinct store_code) from global.product_mapping_product_store 
					WHERE (l0_name::varchar = '||_l0_name_updated||') and is_active = true and product_code = ANY (ph.product_codes)
					and store_code = any(saf.store_codes)
				) as store_codes
				from ph_data ph cross join saf
			)
			-- select * from product_store_mapping
			,
			ph_configurations_data as materialized(
				select
					pcm.ph_code,
					pcm.channel,
					default_product_profile,
					default_store_groups,
					default_store_groups_selected,
					default_dcs,
					upload_flag,
					cross_country_allocation
				from inventory_smart.ph_configuration_mapping pcm
				join ph_data ph on pcm.ph_code = ph.ph_code and pcm.channel = ph.channel
			),
			default_channel_level_product_profile as(
				select
					ph_code,
					upload_flag,
					cross_country_allocation,
					default_product_profiles[1] as default_product_profile
				from(
				select 
					ph_code, upload_flag, cross_country_allocation
					,array_remove(array_agg(distinct default_product_profile),null) as default_product_profiles
					from ph_configurations_data
					group by 1,2,3
				) as x
			),
			default_channel_level_dc as (
				select
					ph_code,
					array_agg(distinct default_dcs) as default_dcs
				from(
					select ph_code, unnest(default_dcs) as default_dcs
					from ph_configurations_data
				) as x
				group by 1
			),
			ph_code_default_store_groups as (
				select 
					ph_code,
					array_remove(array_agg(distinct pcm.default_store_group), null) as default_store_groups,
					array_agg(distinct pcm.default_store_groups_selected) as default_store_groups_selected,
					array_agg(DISTINCT sg.name) AS default_sg_names
				from (
					select
						unnest(array_remove(default_store_groups, NULL)) AS default_store_group,
    					unnest(array_remove(default_store_groups_selected, NULL)) AS default_store_groups_selected,
						ph_code
					from ph_configurations_data
					) as pcm
					join "global".store_groups sg on pcm.default_store_groups_selected = sg.sg_code 
					where sg.is_deleted = false and application_code = 1
					group by 1
			)
			--  select * from default_channel_level_product_profile
			,selected_sgs_store_count as (
				select 
					psm.ph_code,
					count(distinct store_code) as store_available_count 
				from 
				ph_code_default_store_groups pcdsg
				join product_store_mapping psm using(ph_code)
				left join global.store_groups_mapping sgm on sgm.sg_code = any(pcdsg.default_store_groups_selected)
				and sgm.store_code = any(psm.store_codes)
				group by 1
			),
			--select * from selected_sgs_store_count
				selected_rule_mapped as (
					select article, channel, STRING_AGG(rm.rule_name, '','') as rule_name FROM (
						(select psm.scheduler_code, psm.article, psm.channel FROM inventory_smart.ph_scheduler_mapping psm
							INNER JOIN ph_data pd on pd.article = psm.article AND pd.channel = psm.channel where psm.is_active)
						UNION
						(select psm.scheduler_code, psm.article, psm.channel FROM inventory_smart.ph_scheduler_store_mapping psm
							INNER JOIN ph_data pd on pd.article = psm.article AND pd.channel = psm.channel where psm.is_active)
					) as x
					JOIN inventory_smart.alloc_rule_master AS rm ON x.scheduler_code = rm.rule_code
					GROUP BY article, channel
				),
			--select * from ph_code_default_store_groups
			auto_rule_mapping_data as (
				SELECT 
					paarm.article,
				 	paarm.channel,
		 			paarm.approval_type,
			 		paarm.threshold
 				FROM
        		inventory_smart.ph_auto_alloc_rule_mapping paarm
    			JOIN
        		ph_data pd ON pd.article = paarm.article AND pd.channel = paarm.channel	
			)

			,latest_updated as (
				select pcm.ph_code , channel,
				greatest(pcm.updated_at , psm.updated_at,paarm.updated_at) as updated_at,
				case 
					when pcm.updated_at = greatest(pcm.updated_at , psm.updated_at, paarm.updated_at) 
					then pcm.updated_by
					when psm.updated_at = greatest(pcm.updated_at , psm.updated_at, paarm.updated_at) 
					then psm.updated_by
					when paarm.updated_at = greatest(pcm.updated_at , psm.updated_at, paarm.updated_at) 
					then paarm.updated_by
				end
				as updated_by
				from inventory_smart.ph_configuration_mapping pcm  
				left join inventory_smart.ph_scheduler_mapping psm using(ph_code,channel)
				left join inventory_smart.ph_auto_alloc_rule_mapping  paarm using (ph_code,channel)
				where psm.is_active
				group by 1,2,3,4
			)
			--select * from latest_updated;	
			,results as (
				select 
				    ph.*,
					pcdsg.default_sg_names,
					pcdsg.default_store_groups_selected,
					dclpp.upload_flag,
					coalesce(dclpp.cross_country_allocation,''Allowed'') as cross_country_allocation,
				    to_char(lu.updated_at AT TIME ZONE '''|| inventory_smart.get_tenant_timezone() ||''', ''DD-MM-YYYY HH24:MI:SS'') as updated_at,
					um.name as updated_by,
				    dclpp.default_product_profile,
					coalesce(srm.rule_name, ''-'') as rule_name,
					approval_type,
					threshold,
				    case when pcdsg.default_store_groups is null then array[] :: int4[] else pcdsg.default_store_groups end as default_store_groups, 
				    case when dcld.default_dcs is null then array[] :: int4[] else dcld.default_dcs end as default_dcs, 
				    case when dclpp.default_product_profile is null then 0 else 1 end as product_profile_mapped, 
				    case when dclpp.default_product_profile is null then ''-'' else ppm."name" end as product_profile_name, 
					case when pcdsg.default_store_groups is null then false else true end as default_store_groups_available,
                    case when dcld.default_dcs is null then false else true end as default_dcs_available,
                    case when dclpp.default_product_profile is null then false else true end as product_profile_mapped_available,
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
					left join latest_updated lu using(ph_code, channel) 
				    left join default_channel_level_product_profile dclpp using(ph_code) 
					left join default_channel_level_dc dcld using(ph_code) 
				    left join ph_code_default_store_groups pcdsg using(ph_code) 
					left join selected_sgs_store_count sssc using(ph_code)
					left join inventory_smart.product_profile_master ppm on dclpp.default_product_profile = ppm.pp_code
					LEFT JOIN selected_rule_mapped srm on srm.article = ph.article and srm.channel = ph.channel
					LEFT JOIN auto_rule_mapping_data armd on armd.article = ph.article and armd.channel = ph.channel
					LEFT JOIN global.user_master um on lu.updated_by = um.user_code
				)
				-- select * from results
				, 
			formated_results as (
				  select 
				    *, 
				    concat('''''''',
				      store_group_mapped, '' / '', store_available_count
					  ,''''''''
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
		--RETURN $1;
		RETURN _query_combine;
	end
$function$
;