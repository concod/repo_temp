--liquibase formatted sql
--changeset nibeel:article_selection_list runOnChange:true stripComments:false splitStatements:false context:MTP-74763 labels:MTP-74763
--comment: MTP-74763 : Product Profile changes on size level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, character varying, integer[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, character varying, integer[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_channel text := $3;
		_product_filters jsonb := $2 || ('{"channel": [{"type": "list", "operator": "in", "values": ["' || _channel || '"]}]}')::jsonb;
		_query_table_filters text := '';
		_query_combine text := '';
		_sg_codes int4[] := $4;
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'channel', $3, 'sg_codes', $4);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.article_selection_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		--_cache_dependencies text[] := '{global.product_master,inventory_smart.ph_configuration_mapping}';
			_cache_dependencies text[] := '{global.product_master, global.product_time_attributes,
						inventory_smart.ph_configuration_mapping, global.product_mapping_product_store, inventory_smart.soft_allocation,
						inventory_smart.plan_master}';
	begin 	
		_query_pa := inventory_smart.form_main_table_filters(
		  'ph_master',
		  _product_filters
		);
		_query_combine := '
			with ph_data as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				' || _query_pa || '
			)
			--select * from ph_data
			, product_dc_map as (
			select
				ph.ph_code,
				channel,
				ph.product->>''product_code'' as product_code,
				ph.product->>''size'' as size,
				pmpd.dc_code,
				mapping_code
			from (
				select
					ph_code,
					channel,
					unnest(product_code_size_map) as product
				from
					ph_data) ph
			join global.product_mapping_product_dc pmpd on
				ph.product->>''product_code'' = pmpd.product_code
			)
			--select * from product_dc_map
			, sku_dc_available_units as (
			  select 
			    ph_code, 
			    sum(oh) as oh, 
			    JSONB_OBJECT_AGG(size, oh_map) as oh_map 
			  from 
			    (
			      select 
			        ph.ph_code, 
			        ph.size, 
			        JSONB_OBJECT_AGG(ph.dc_code, oh) as oh_map, 
			        coalesce(
			          SUM(oh), 
			          0
			        ) oh 
			      from 
			        product_dc_map ph 
			        join inventory_smart.sku_dc_available_units au using(product_code, channel)
			      group by 
			        1, 
			        2
			    ) as t 
			  group by 
			    1
			)
			--select * from sku_dc_available_units
			, sku_dc_reserved_units as (
			  select 
			    ph_code, 
			    SUM(reserve_quantity) as reserve_quantity, 
			    JSONB_OBJECT_AGG(size, rq_map) as rq_map
			  from 
			    (
			      select 
			        ph.ph_code, 
			        ph.size, 
			        SUM(quantity) as reserve_quantity, 
			        JSONB_OBJECT_AGG(ph.dc_code, quantity) as rq_map
			      from 
			        product_dc_map ph 
			        join inventory_smart.sku_dc_reserved_units au using(product_code, channel)
			      group by 
			        1, 
			        2
			    ) as t 
			  group by 
			    1
			)
			--select * from sku_dc_reserved_units
			, sku_dc_allocated_units as (
			  select 
			    ph_code, 
			    SUM(allocated_units) as allocated_units, 
			    JSONB_OBJECT_AGG(size, au_map) as au_map, 
			    max(allocated_time) as allocated_time 
			  from 
			    (
			      select 
			        ph.ph_code, 
			        ph.size, 
			        SUM(quantity) as allocated_units, 
			        JSONB_OBJECT_AGG(ph.dc_code, quantity) as au_map, 
			        max(updated_at) as allocated_time 
			      from 
			        product_dc_map ph 
			        join inventory_smart.sku_dc_allocated_units al 
			        using(product_code, channel)
			        --using(product_code)
			      group by 
			        1, 
			        2
			    ) as t 
			  group by 
			    1
			)
			--select * from sku_dc_allocated_units
			, product_store_mapping as (
			  select 
			    mapping_code, 
			    pmps.store_code, 
			    ph_code 
			  from 
			    ph_data ph 
			    join global.product_mapping_product_store pmps on pmps.product_code = any(ph.product_codes) 
			    --join global.store_attributes_filter saf on ph.channel = saf.channel 
			    --and pmps.store_code = saf.store_code
				where pmps.validity is not null 
			)
			--select * from product_store_mapping
			, constraint_data as (
			  select 
			    ph_code, 
			    ROUND(
			      AVG(aps):: numeric, 
			      2
			    ) as aps, 
			    ROUND(
			      AVG(wos):: numeric, 
			      2
			    ) as wos, 
			    array_agg(store_code) as mapped_stores, 
			    array_length(
			      array_agg(store_code), 
			      1
			    ) as mapped_stores_count 
			  from 
			    (
			      select 
			        ph_code, 
			        cm.store_code, 
			        SUM(aps) as aps, 
			        AVG(wos) as wos 
			      from 
			        product_store_mapping psm 
			        --left join inventory_smart.constraint_master cm using(mapping_code) 
					join inventory_smart.constraint_master cm using(mapping_code) 
			      group by 
			        1, 
			        2
			    ) foo 
			  group by 
			    1
			)
			--select * from constraint_data
			, selected_dc_data as (
			  SELECT 
			    ph_code, 
			    dc.dc_code, 
			    dc.name 
			  FROM 
			    product_store_mapping psm 
			    JOIN global.product_mapping_store_dc pmsd USING(store_code) 
			    join global.distribution_centres dc using(dc_code) 
			  GROUP BY 
			    1, 
			    2, 
			    3
			)
			--select * from selected_dc_data
			, product_profiles_ia as (
			  select 
			    ph.ph_code, 
			    jsonb_build_object(
			      ''value'', pp_code, ''name'', name, ''label'', 
			      special_classification
			    ) as iapp 
			  from 
			    ph_data ph 
			    join inventory_smart.product_profile_master ppm using(ph_code) 
			  where 
			    special_classification = ''ia-recommended''
			)
			--select * from product_profiles_ia
			, article_dc_config as (
			  select 
			    sdc.ph_code, 
			    array_agg(
			      jsonb_build_object(
			        ''value'', dc_code, ''label'', name, 
			        ''is_default'', 
			        (
			          case when default_dc_code is null then false else true end
			        )
			      )
			    ) as dcs 
			  from 
			    (
			      select 
			        ph.ph_code, 
			        unnest(default_dcs) as default_dc_code 
			      from 
			        ph_data ph 
			        join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)
			    ) pcm 
			    right join selected_dc_data sdc on pcm.ph_code = sdc.ph_code 
			    and pcm.default_dc_code = sdc.dc_code 
			  group by 
			    1
			)
			--select * from article_dc_config
			, article_udpp_config as (
			  select 
			    ph.ph_code, 
			    jsonb_build_object(
			      ''value'', pp_code, ''name'', name, ''label'', 
			      special_classification
			    ) as udpp 
			  from 
			    ph_data ph 
				join inventory_smart.product_profile_user_mapping_size ppums 
                on pcm.default_product_profile = ppums.pp_code and ppums.size = any(ph.sizes)
			)
			-- select * from article_udpp_config 
			, article_sg_config as (
			  select 
			    pcm.ph_code, 
			    array_agg(
			      jsonb_build_object(
			        ''value'', sg_code, ''label'', name, ''is_default'', 
			        true
			      )
			    ) as store_groups 
			  from 
			    (
			      select 
			        ph.ph_code, 
			        unnest(default_store_groups) as default_sg_code 
			      from 
			        ph_data ph 
			        join inventory_smart.ph_configuration_mapping pcm using(ph_code, channel)' || 
			        (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then
			        '' else ' where default_store_groups @> ''' || concat(_sg_codes) || '''::int4[]'
			        end)
			    || ') pcm 
			    join global.store_groups sg on pcm.default_sg_code = sg.sg_code 
			  group by 
			    1
			)
			--select * from article_sg_config
			, final_result as (
			  select 
				ph.*,
				ph.product_codes as upc,
			    --ph.l0_name, 
			    --ph.l1_name, 
			    --ph.l2_name, 
			    --ph.l3_name, 
			    --ph.style, 
			    --ph.article,
				--ph.ph_code,
			    --ph.style_description, 
			    --ph.sizes, 
			    --ph.product_codes as upc, 
			    --ph.color, 
			    --ph.color_code, 
			    --ph.human_readable_color, 
			    --ph.launch_date, 
			    --ph.article_status_tag, 
			    --ph.channel, 
			    coalesce(reserve_quantity, 0) as reserve_quantity, 
			    coalesce(oh, 0) as oh,
			    (coalesce(oh, 0) - coalesce(reserve_quantity, 0)) as total_inventory, 
			    oh_map, 
			    rq_map, 
			    coalesce(allocated_units, 0) as allocated_units, 
			    ((coalesce(oh,0) - coalesce(reserve_quantity,0)) - coalesce(allocated_units,0)) as net_available_inventory, 
			    au_map,
			    case
					when udpp is null then array[iapp || ''{"is_default": true}'']
					when iapp = udpp then array[iapp || ''{"is_default": true}'']
					else array[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}''] end as product_profiles, 
			    allocated_time, 
			    -- iapp as ia_product_profiles,
			    -- udpp as ud_product_profiles,
			    dcs, 
				case
					when store_groups is null then store_groups || jsonb_build_object(
				      ''value'', -1, ''label'', ''Default - Mapping'', 
				      ''is_default'', true
				    )
					else store_groups || jsonb_build_object(
				      ''value'', -1, ''label'', ''Default - Mapping'', 
				      ''is_default'', false
				    )
				end as store_groups, 
			   -- store_groups || jsonb_build_object(
			   --   ''value'', -1, ''label'', ''Default - Mapping'', 
			   --   ''is_default'', true
			   -- ) as store_groups,
			    cd.mapped_stores_count, 
			    cd.mapped_stores, 
			    cd.aps, 
			    cd.wos 
			  from 
			    ph_data ph 
				' || (case when coalesce(array_length(_sg_codes, 1), 0) = 0 then 'left' else '' end) || '
				join article_sg_config asgc on ph.ph_code = asgc.ph_code 
			    left join sku_dc_reserved_units ru on ph.ph_code = ru.ph_code 
			    left join sku_dc_available_units avu on ph.ph_code = avu.ph_code 
			    left join sku_dc_allocated_units alu on ph.ph_code = alu.ph_code 
			    left join constraint_data cd on ph.ph_code = cd.ph_code 
			    left join product_profiles_ia ppi on ph.ph_code = ppi.ph_code 
			    join article_dc_config adc on ph.ph_code = adc.ph_code 
			    left join article_udpp_config ppu on ph.ph_code = ppu.ph_code 
			  where 
			    (coalesce(oh, 0) - coalesce(allocated_units, 0)) > 0
				and ph.article_status_tag != ''Old''
				and ph.article_status_tag != ''Retirement''
			) 
			select 
			  * 
			from 
			  final_result';
		raise notice 'A: %', _query_combine;
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		_query_table_filters := global.form_table_query($5);
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
