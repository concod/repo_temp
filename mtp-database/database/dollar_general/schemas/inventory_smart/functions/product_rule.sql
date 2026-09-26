--liquibase formatted sql
--changeset liquibase:product_rule runOnChange:true stripComments:false splitStatements:false context:MTP-126379-fix-to-handle-product-rule labels:MTP-44300
--comment: MTP-126379-fix-to-handle-product-rule
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_rule(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_rule(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 This is dollar_general version
 Calling statement: 
 
 select
    *
from
    inventory_smart.product_rule(
		'ee8c3306-0a2e-49c5-a223-9f9d81e80a4e',
		'{"l0_name": [{"type": "list", "operator": "in", "values": ["2323_2021 Gift Sets"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["102_BEAUTY CARE"]}], "l2_name": [{"type": "list", "operator": "in", "values": ["502_BEAUTY CARE"]}]}',
		'{"type": "list", "operator": "not in", "values": ["Ecom", "Wholesale", "Online_Outlet", "Specialty", "Amazon", "Key_Account", "Liquidation", "Annual Outlet Sale"]}]}',
		'{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0, "sub_offset": 0}, "query_type": "AND"}',
		);

fetch all in "ee8c3306-0a2e-49c5-a223-9f9d81e80a4e";


  Updated_by       Updated_on      Purpose
   ----------       -----------     --------

 
 */

	declare
	_table_name text := '';
	_query_ph text := '';
	_query_sa text := '';
	_query_ppa text := '';
	_channel text[] := inventory_smart.get_channel_from_input_new($3);
	_channel_and_postfix_condition text := '';
	_channel_pcm_where_condition text := '';
	_channel_and_prefix_condition text := '';
	_query_table_filters text := '';
	_query_table_sort text :='';
	_query_combine text := '';
	_product_store_query text := '';
	_query text := '';
	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
	_cache_table_id text;
	_cache_schema text := 'inventory_smart';
	_cache_sp text := '.product_rule';
	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
	_cache_dependencies text[] := '{inventory_smart.ph_configuration_mapping, global.store_groups, global.store_groups_mapping,
								global.product_store_attributes_filter,global.product_mapping_store_dc,
								inventory_smart.product_profile_master, global.distribution_centres, 
								global.product_mapping, inventory_smart.product_profile_attributes}';
	_product_json jsonb := $2;
  	_store_json   jsonb := $3;
	begin
		IF (_product_json ? 'psa_name') THEN
    		_store_json   := _store_json || jsonb_build_object('psa_name', _product_json->'psa_name');
    		_product_json := _product_json - 'psa_name';
  		END IF;
		_query_ph := inventory_smart.form_main_table_filters('ph_master', _product_json);
 		_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_json);
		raise notice '_query_ph %', _query_ph;
		raise notice '_query_sa: %', _query_sa;
 		
-- 		raise notice '%,',replace (_channel,',','');
-- 		raise notice '_query_ppa %,',_query_ppa;
 		
 	
 		_query_table_filters := global.form_table_query($4);
		_query_table_sort := global.form_table_query($4);
		select name from "global".table_configurations tc where tc_code = 82 into _table_name;
		select * from inventory_smart.form_product_store_filters(_table_name, _product_json, _store_json) into _query, _product_store_query;
 	
		_query_combine := '
				with ph_data as (
					select ph_code, article,l0_code,l0_name,l1_code,l1_name,l3_code,l3_name,l4_code,l4_name,primary_sku,product_description 
					from inventory_smart.ph_master ph ' || _query_ph || '
					)
				-- select * from ph_data
				,product_store_data as (
					select store_code, psa_name, psa_code, ph_code, article,l0_code,l0_name,l1_code,l1_name,l3_code,l3_name,l4_code,l4_name,primary_sku,product_description from (select * ' || _query  || ' )as saf join ph_data using (l0_code,l0_name,l1_code,l1_name,l3_code,l3_name,l4_code,l4_name)
				),
				product_attributes_data as (
        		select article, set_date, inner_pack_size
        		from global.product_attributes_filter
        		where article in (select article from ph_data)
    			),
				-- select * from product_store_data
				
				default_product_profile_cte as (
					select ph_code, default_product_profiles[1] as default_product_profile from(
					  select 
					    ph.ph_code,
					    array_remove(array_agg(distinct default_product_profile),null) as default_product_profiles
					  from 
					    (select 
							ph_code, default_product_profile 
							from inventory_smart.ph_configuration_mapping pcm) as pcm 
					    join ph_data ph on pcm.ph_code = ph.ph_code
						group by 1) as x
				),
				default_dc_cte as (
					select ph_code, default_dcs from(
					  select 
					    ph.ph_code,
					    array_agg(distinct dc_code::INT) as default_dcs
					  from 
					    (select 
							ph_code, unnest(default_dcs) as default_dcs 
							from inventory_smart.ph_configuration_mapping pcm) as pcm 
						join global.distribution_centres dc
						on dc.dc_code = pcm.default_dcs
					    join ph_data ph on pcm.ph_code = ph.ph_code
						group by 1) as x
				)
				--  select * from default_dc_cte
				,ph_code_default_store_groups as (
					select 
						ph.ph_code,
						array_agg(distinct pcm.default_store_group) as default_store_groups,
--						array_agg(distinct sgm.store_code) as sg_store_codes,
						array_agg(distinct sg.name) as sg_names
					from 
						(select 
							unnest(default_store_groups) as default_store_group, ph_code 
							from inventory_smart.ph_configuration_mapping pcm) as pcm
					join ph_data ph on pcm.ph_code = ph.ph_code 
--					join "global".store_groups_mapping sgm on pcm.default_store_group = sgm.sg_code
					join "global".store_groups sg on pcm.default_store_group = sg.sg_code
					where sg.is_deleted = false
					group by 1
				)
				--select * from ph_code_default_store_groups
				,selected_sgs_store_count as (
					select 
						pcdsg.ph_code,
						sum(store_count) as store_available_count
					from 
						ph_code_default_store_groups pcdsg
						left join "global".aggregated_store_groups_mapping sgm 
						on sgm.sg_code = any(pcdsg.default_store_groups)
					group by 1
				)
--				select * from selected_sgs_store_count
				, 
				results as (
				  select 
				    ph.*,
					pad.set_date,
            		pad.inner_pack_size,
					pcdsg.sg_names,
				    dppc.default_product_profile, 
				    case when pcdsg.default_store_groups is null then array[] :: int4[] else pcdsg.default_store_groups end as default_store_groups, 
				    case when ddc.default_dcs is null then array[] :: int4[] else ddc.default_dcs end as default_dcs, 
				    case when dppc.default_product_profile is null then 0 else 1 end as product_profile_mapped, 
				    case when dppc.default_product_profile is null then ''IA Recommended'' else ppm."name" end as product_profile_name, 
				    coalesce(
				      array_length(pcdsg.default_store_groups, 1), 
				      0
				    ) as store_group_mapped, 
				    coalesce(
				      array_length(ddc.default_dcs, 1), 
				      0
				    ) as dc_mapped,
				    ''{}'':: int4[] as store_group_available, 
					''{}'' :: int4[] as product_profile_available, 
				    ''{}'' :: int4[] as dc_available,
				--    coalesce(
				--      array_length(sgs.sg_codes, 1), 
				--      0
				--    ) as store_group_available_count, 
					coalesce(pcm.auto_allocation_status,false) as auto_allocation_status ,
				    coalesce(sssc.store_available_count, 0) as store_available_count 
				  from 
				    ph_data ph 
					left join product_attributes_data pad using(article)
				    left join default_product_profile_cte dppc using(ph_code) 
					left join default_dc_cte ddc using(ph_code) 
				    left join ph_code_default_store_groups pcdsg using(ph_code) 
					left join selected_sgs_store_count sssc using(ph_code)
					left join inventory_smart.product_profile_master ppm on dppc.default_product_profile = ppm.pp_code
					left join inventory_smart.ph_configuration_mapping pcm on pcm.ph_code = ph.ph_code
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
				) 
				select 
				  * 
				from 
				  formated_results '|| _query_table_sort ||' ';
		
		raise notice 'Qeury: %', _query_combine;
--		select * from cache.wrap_sp(
--			_cache_schema,
--			_cache_sp,
--			_cache_payload,
--			_query_combine,
--			_cache_dependencies,
--			_cache_key_pattern) into _cache_table_id;
--		_query_table_filters := global.form_table_query($4);
--		perform set_config('myvars.cache_table_id', _cache_table_id, true);
--		open $1 for execute _query_combine;
--		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		open $1 for execute _query_combine;
		RETURN $1;
	end
$function$
;