--liquibase formatted sql
--changeset sanit.arora:add oh_it runOnChange:true stripComments:false splitStatements:false context:MTP-124226 labels:MTP-124226
--comment: handle oh_it as inv source
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_main_query(text);
DROP FUNCTION IF EXISTS inventory_smart.get_asl_main_query(alloc_type text, client_config jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_main_query(alloc_type text, client_config jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _query_combine_format text;
        _product_dc_map_join text := '';
        _product_dc_map_where text;
        _product_store_dc_mapping_final_clause text;
        _product_store_dc_mapping_select text;
        _product_dc_map_after_store_eligible_select text := '';
        _txs_metrics_columns text;
        p_client_config jsonb;
        _inv_metrics text = '';
        _inv_metrics_dc_level text = '';
        _inv_metrics_size_level text = '';
		_ph_dc text := '';
        _dynamic_kpi_columns TEXT := '';
        _dynamic_kpi_agg_columns_store TEXT := '';
        _dynamic_kpi_agg_columns_dc TEXT := '';
        _dynamic_kpi_select_columns TEXT := '';
        _constraint_wos_col TEXT := '';

    BEGIN

        p_client_config := COALESCE(client_config->'get_asl_main_query_config','{}'::jsonb);
        _txs_metrics_columns := COALESCE(p_client_config->'txs_metrics_columns'->>alloc_type, p_client_config->'txs_metrics_columns'->>'default', '');
        _constraint_wos_col := COALESCE(client_config->>'constraint_wos_col', 'wos');

        if alloc_type = 'po' then
            _product_dc_map_join := '';
            _product_dc_map_where := ' WHERE gdc.is_active AND NOT gdc.is_deleted ';
            _product_store_dc_mapping_select := ', pdc.name as name';
            _product_store_dc_mapping_final_clause := ' group by 1,2,3,4,5,6,7 ';

        elsif alloc_type = 'asn' then
            if COALESCE(p_client_config->'product_dc_map_join'->alloc_type->>'asn_master', 'false')::boolean then
                _product_dc_map_join := 'JOIN (select * from inventory_smart.asn_master %9$s) am on ph.product_code = am.pack_type_id';
            else
                _product_dc_map_join := 'JOIN (select pack_type_id, (select dc_code from global.distribution_centres WHERE is_active AND NOT is_deleted order by linked_store_code asc limit 1) as dc_code from inventory_smart.sku_asn_available_units %9$s) am on ph.product_code = am.pack_type_id';
            end if;
            _product_dc_map_where := 'WHERE gdc.is_active AND NOT gdc.is_deleted';
            _product_store_dc_mapping_select := ', am.asn_id as name, am.asn_id as asn_code';
            _product_store_dc_mapping_final_clause := ' JOIN (select distinct article, channel, asn_id from inventory_smart.sku_asn_available_units %9$s) am USING(article, channel) where pmsd.is_active ';
            _product_dc_map_after_store_eligible_select := ', asn_code';

        else
            _product_dc_map_join := ' JOIN global.product_mapping_product_dc pmpd on ph.product_code = pmpd.product_code ';
            _product_dc_map_where := ' WHERE pmpd.is_active AND gdc.is_active AND NOT gdc.is_deleted ';
            _product_store_dc_mapping_select := ', pdc.name as name';
            _product_store_dc_mapping_final_clause := ' where pmsd.is_active group by 1,2,3,4,5,6,7 ';
        end if;


        if COALESCE(p_client_config->'enable_oh_oo'->>alloc_type, p_client_config->'enable_oh_oo'->>'default', 'false')::boolean then
            _inv_metrics := ',sum(oh_oo) as oh_oo, sum(net_available_inventory_oh_oo) as net_available_inventory_oh_oo';
            _inv_metrics_dc_level := ' ,sum(oh_oo) as oh_oo
                                        ,JSONB_OBJECT_AGG(dc_code, oh_oo) as oh_oo_map
                                        ,JSONB_OBJECT_AGG(dc_code, net_available_inventory_oh_oo) as ctat_oh_oo_map
                                        ,sum(net_available_inventory_oh_oo) as net_available_inventory_oh_oo';
            _inv_metrics_size_level := ',JSONB_OBJECT_AGG(size, oh_oo_map) as oh_oo_map
                                        ,JSONB_OBJECT_AGG(size, ctat_oh_oo_map) as ctat_oh_oo_map
                                        ,sum(oh_oo) as oh_oo
                                        ,sum(net_available_inventory_oh_oo) as net_available_inventory_oh_oo';
        end if;

        if COALESCE(p_client_config->'enable_oh_it'->>alloc_type, p_client_config->'enable_oh_it'->>'default', 'false')::boolean then
            _inv_metrics := ', sum(net_available_inventory_it) as net_available_inventory_it, sum(oh_it) as oh_it, sum(net_available_inventory_oh_it) as net_available_inventory_oh_it';
            _inv_metrics_dc_level := ' ,JSONB_OBJECT_AGG(dc_code, it) as it_map
                                        ,JSONB_OBJECT_AGG(dc_code, net_available_inventory_it) as ctat_it_map
                                        ,sum(net_available_inventory_it) as net_available_inventory_it 
                                        ,sum(oh_it) as oh_it
                                        ,JSONB_OBJECT_AGG(dc_code, oh_it) as oh_it_map
                                        ,JSONB_OBJECT_AGG(dc_code, net_available_inventory_oh_it) as ctat_oh_it_map
                                        ,sum(net_available_inventory_oh_it) as net_available_inventory_oh_it';
            _inv_metrics_size_level := ',JSONB_OBJECT_AGG(size, it_map) as it_map
                                        ,JSONB_OBJECT_AGG(size, ctat_it_map) as ctat_it_map
                                        ,sum(net_available_inventory_it) as net_available_inventory_it 
                                        ,JSONB_OBJECT_AGG(size, oh_it_map) as oh_it_map
                                        ,JSONB_OBJECT_AGG(size, ctat_oh_it_map) as ctat_oh_it_map
                                        ,sum(oh_it) as oh_it
                                        ,sum(net_available_inventory_oh_it) as net_available_inventory_oh_it';
        end if;
        
		if alloc_type IN ('po', 'asn') then
			_ph_dc := ',ph.dc_code';
		end if;

        -- Build dynamic KPI columns if kpi_names is provided in client_config
        IF p_client_config ? 'kpi_names' AND p_client_config->'kpi_names' IS NOT NULL AND jsonb_array_length(p_client_config->'kpi_names') > 0 THEN
            SELECT kpi_columns, kpi_agg_columns_store, kpi_agg_columns_dc, kpi_select_columns
              INTO _dynamic_kpi_columns, _dynamic_kpi_agg_columns_store, _dynamic_kpi_agg_columns_dc, _dynamic_kpi_select_columns
              FROM inventory_smart.build_dynamic_kpi_columns(p_client_config->'kpi_names');
        END IF;

        _query_combine_format := '
            with ph_products as MATERIALIZED (
                select
                    ph.ph_code,
                    ph.article,
                    ph.channel,
                    (p->>''product_code'') as product_code,
                    (p->>''size'')         as size'
					|| _ph_dc || '
                from %4$s ph
                cross join lateral unnest(ph.product_code_size_map) as p
			)
            ,product_dc_map as MATERIALIZED(
                SELECT 
                    ph.ph_code,
                    ph.channel,
                    ph.article,
                    ph.product_code,
                    ph.size,
                    gdc.dc_code,
                    gdc.name
                FROM ph_products ph
                ' || _product_dc_map_join || '
                JOIN global.distribution_centres gdc using(dc_code)
                ' || _product_dc_map_where || '
            )
            ,product_store_dc_mapping as MATERIALIZED(
                SELECT
                    pmps.product_code,
                    pmps.store_code,
                    pdc.ph_code,
					pdc.article as article,
                    pmsd.dc_code,
					pdc.size
                    ' || _product_store_dc_mapping_select || '
                FROM product_dc_map pdc
                JOIN %3$s pmps ON pmps.product_code = pdc.product_code
                JOIN global.product_mapping_store_dc pmsd USING(store_code, dc_code)
				' || _product_store_dc_mapping_final_clause|| '
            )
			,product_dc_map_after_store_eligible as (
				select 
                    ph_code, 
                    product_code, 
                    size, 
                    article, 
                    dc_code
                    ' || _product_dc_map_after_store_eligible_select || '
				from product_store_dc_mapping
				group by ph_code,product_code,size,article,dc_code ' || _product_dc_map_after_store_eligible_select || '
			)
			,product_order as MATERIALIZED(
				select distinct
					ph.product_code, 
					ast."order"
				from product_dc_map_after_store_eligible ph
				join inventory_smart.article_status_tag ast using(product_code) 
			)
			,aid as (
				select 
                    psdm.ph_code, 
                    art.* 
                from inventory_smart.article_inventory_dashboard art
				join (
                    select 
                        ph_code, 
                        article, 
                        store_code 
                    from product_store_dc_mapping 
                    group by 1, 2, 3
                ) psdm 
                on psdm.article=art.article and psdm.store_code = art.store_code
			)
			,txs_metrics as MATERIALIZED(
                select
                    ph_code
                    ' || _txs_metrics_columns || '
                FROM aid
                group by 1
			),
            dynamic_kpi_store as MATERIALIZED(
                select
                    ph_code
                    ' || _dynamic_kpi_agg_columns_store || '
                FROM aid
                group by 1
            ),
            dynamic_kpi_dc as MATERIALIZED(
                select
                    ph_code
                    ' || _dynamic_kpi_agg_columns_dc || '
                from inventory_smart.article_inventory_dashboard art
				join (
                    select 
                        ph_code, 
                        article,
                        saf.store_code
                    from product_store_dc_mapping psdm
                    join global.store_attributes_filter saf on psdm.dc_code = saf.dc_code 
                    and saf.special_classification = ''WHS''
                    group by 1, 2, 3
                ) psdm 
                on psdm.article=art.article and psdm.store_code = art.store_code
                group by 1
            )
			' || inventory_smart.get_asl_before_allocated_query(alloc_type) || '
			' || inventory_smart.get_asl_inventory_details_query(alloc_type) || '
            ,agg_inventory_details_pre as (
				select product_code, ph_code, size, dc_code,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(total_reserve) as total_reserve,
					sum(net_available_inventory) as net_available_inventory,
                    sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
                    '|| _inv_metrics ||'
					from inventory_details_product_dc_level
				group by 1, 2, 3,4
			)
			,agg_inventory_details as (
				select 
                    product_code, 
                    ph_code, 
                    size,
					"order",
					JSONB_OBJECT_AGG(dc_code, oh) as oh_map,
					JSONB_OBJECT_AGG(dc_code, allocated_units) as au_map,
					JSONB_OBJECT_AGG(dc_code, total_reserve) as rq_map,
                    JSONB_OBJECT_AGG(dc_code, net_available_inventory_oh) as ctat_oh_map,
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(total_reserve) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
                    sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
                    '|| _inv_metrics_dc_level ||'
				from agg_inventory_details_pre
				join product_order using(product_code)
				group by 1, 2, 3, 4 order by ph_code, "order"
			)
			,final_inventory as (
				select 
                    ph_code,
					JSONB_OBJECT_AGG(size, oh_map) as oh_map,
					JSONB_OBJECT_AGG(size, au_map) as au_map,
					JSONB_OBJECT_AGG(size, rq_map) as rq_map,
                    JSONB_OBJECT_AGG(size, ctat_oh_map) as ctat_oh_map,
                    array_agg(product_code) as product_code,
                    array_agg(size) as sizes,
					array_agg("order") as "order",
					sum(oh) as oh,
					sum(oo) as oo,
					sum(it) as it,
					sum(reserve_quantity) as reserve_quantity,
					sum(net_available_inventory) as net_available_inventory,
                    sum(net_available_inventory_oh) as net_available_inventory_oh,
					sum(allocated_units) as allocated_units,
					max(allocated_time) as allocated_time
                    '|| _inv_metrics_size_level ||'
				from agg_inventory_details
				group by 1 
			)
            ,constraint_data as (
                SELECT ph_code,
                    ROUND(AVG(aps)::numeric, 2) as aps,
                    ROUND(AVG(wos)::numeric, 2) as wos,
                    ROUND(AVG(min_stock)::numeric, 2) as min_stock,
                    ROUND(AVG(max_stock)::numeric, 2) as max_stock,
                    ROUND(MIN(min_validator)::numeric, 2) as min_stock_validator,
                    Round(MAX(max_validator)::numeric, 2) as max_stock_validator,
                    ARRAY_AGG(store_code) as mapped_stores,
                    ARRAY_LENGTH(ARRAY_AGG(store_code), 1) as mapped_stores_count
                FROM (
                    SELECT 
                        ph_code,
                        cm.store_code,
                        SUM(aps) as aps,
                        AVG(' || _constraint_wos_col || ') as wos,
                        AVG(min_stock) as min_stock,
                        AVG(max_stock) as max_stock,
                        MIN(max_stock) as min_validator,
                        MAX(min_stock) as max_validator
                    FROM constraints_resolved_data_%6$s cm
                    JOIN  product_store_dc_mapping psm using(product_code, store_code)
                    GROUP BY 1, 2
                ) foo
				GROUP BY 1
            )
            ,product_profiles_ia as (
                SELECT 
                    ph.ph_code,
                    JSONB_BUILD_OBJECT(''value'', pp_code, ''name'', name, ''label'', special_classification) as iapp
                FROM %4$s ph
                JOIN inventory_smart.product_profile_master ppm using(ph_code)
                WHERE special_classification = ''ia-recommended''
            )
            ,article_dc_config as (
                SELECT 
                    ph_code,
                    array_agg(jsonb_build_object(''value'', dc_code, ''label'', name, ''is_default'', true))as dcs
                FROM (
                    select 
                        ph_code, 
                        dc_code, 
                        name 
                    from product_store_dc_mapping 
                    group by 1, 2, 3
                ) psdm
                group by 1
            )
            ,article_udpp_config as (
                SELECT 
                    ph.ph_code,
                    JSONB_BUILD_OBJECT(''value'', ppm.pp_code, ''name'', ppm.name, ''label'', ppm.special_classification) as udpp
                FROM %4$s ph
                join %5$s pcm using(ph_code)
                join inventory_smart.product_profile_master ppm
                on pcm.default_product_profile = ppm.pp_code
				join inventory_smart.product_profile_user_mapping_size ppums 
                on pcm.default_product_profile = ppums.pp_code and ppums.size = any(ph.sizes)
            )
            ,article_sg_config as (
                select
                    pcm.ph_code,
                    array_agg(jsonb_build_object(''value'', sg_code, ''label'', name, ''is_default'',true)) as store_groups
                from (
                    select
                        ph.ph_code,
                        coalesce(pcms.default_store_group, %8$s) as default_sg_code
                    from %4$s ph
					left join (
                        select 
                            ph_code, 
                            unnest(default_store_groups) default_store_group 
                        from %5$s
					) pcms using(ph_code)
                ) pcm
                join global.store_groups sg on pcm.default_sg_code = sg.sg_code
				where sg.is_deleted=false
                group by 1
			)
            ' || inventory_smart.get_asl_custom_query(alloc_type, p_client_config) || '
            ' || inventory_smart.get_asl_final_result_query(alloc_type, p_client_config, _dynamic_kpi_select_columns) || '
            %1$s
        ';

        RETURN _query_combine_format;

    END
 $function$
;
