--liquibase formatted sql
--changeset aniruddh.singh:agent_asl_main_list_v3.7a runOnChange:true stripComments:false splitStatements:false context:EligibilityAGENT labels:EligibilityAGENT
--comment: bugfix fixing quotation issue of store_grade
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_asl_main_list(text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.agent_asl_main_list(alloc_type text, client_config jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _query_combine_format text;
        _product_dc_map_join text;
        _product_dc_map_where text;
        _product_store_dc_mapping_final_clause text;
        _product_store_dc_mapping_select text;
        _product_dc_map_after_store_eligible_select text;
        _article_sg_config_default_sg_column text;
        _txs_metrics_columns text;
        p_client_config jsonb;
        _product_columns text := '';
        _alloc_specific_columns text := '';
        _inv_metrics text = '';
        _inv_metrics_dc_level text = '';
        _inv_metrics_size_level text = '';
		_ph_dc text := '';
        _other_filters jsonb;
        _other_where_clause text := '';
        _product_filters jsonb;
        _store_filters jsonb;
        _product_filter_where text := '';
        _ph_products_filter_where text := '';
        _store_filter_where text := '';
        _pp_filter_where text := '';

    BEGIN

        p_client_config := COALESCE(client_config->'get_asl_main_query_config','{}'::jsonb);
        _other_filters := COALESCE(client_config->'other_filters', '{}'::jsonb);
        _product_filters := COALESCE(client_config->'product_filters', '{}'::jsonb);
        _store_filters := COALESCE(client_config->'store_filters', '{}'::jsonb);
        _product_dc_map_join := COALESCE(p_client_config->'product_dc_map_join'->>alloc_type, p_client_config->'product_dc_map_join'->>'default', '');
        _product_dc_map_where := COALESCE(p_client_config->'product_dc_map_where'->>alloc_type, p_client_config->'product_dc_map_where'->>'default', '');
        _product_store_dc_mapping_final_clause := COALESCE(p_client_config->'product_store_dc_mapping_final_clause'->>alloc_type, p_client_config->'product_store_dc_mapping_final_clause'->>'default', '');
        _product_store_dc_mapping_select := COALESCE(p_client_config->'product_store_dc_mapping_select'->>alloc_type, p_client_config->'product_store_dc_mapping_select'->>'default', '');
        _product_dc_map_after_store_eligible_select := COALESCE(p_client_config->'product_dc_map_after_store_eligible_select'->>alloc_type, p_client_config->'product_dc_map_after_store_eligible_select'->>'default', '');
        _article_sg_config_default_sg_column := COALESCE(p_client_config->'article_sg_config_default_sg_column'->>alloc_type, p_client_config->'article_sg_config_default_sg_column'->>'default', '');
        _txs_metrics_columns := COALESCE(p_client_config->'txs_metrics_columns'->>alloc_type, p_client_config->'txs_metrics_columns'->>'default', '');
        -- Safely extract and sanitize _product_columns
        _product_columns := COALESCE(p_client_config->'final_select_config'->>'product_columns', '');
        _product_columns := BTRIM(_product_columns, ' ,');
        IF _product_columns != '' THEN
            _product_columns := ', ' || _product_columns;
        END IF;

        -- Safely extract and sanitize _alloc_specific_columns
        _alloc_specific_columns := COALESCE(
            p_client_config->'final_select_config'->'alloc_specific_columns'->>alloc_type,
            (p_client_config->'final_select_config'->'alloc_specific_columns')->>'default',
            ''
        );
        _alloc_specific_columns := BTRIM(_alloc_specific_columns, ' ,');
        IF _alloc_specific_columns != '' THEN
            _alloc_specific_columns := ', ' || _alloc_specific_columns;
        END IF;

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
        
		if COALESCE(p_client_config->'fetch_dc_from_ph'->>alloc_type, p_client_config->'fetch_dc_from_ph'->>'default', 'false')::boolean then
			_ph_dc := ',ph.dc_code';
		end if;
        
        -- Build custom product filter WHERE clause for product_dc_map CTE (early filtering)
        IF jsonb_typeof(_product_filters) = 'object' AND _product_filters != '{}'::jsonb THEN
            -- Extract and apply product filters at source
            IF _product_filters ? 'ph_code' THEN
                _product_filter_where := _product_filter_where || ' AND LOWER(ph.ph_code) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_product_filters->'ph_code') as value) || '])';
            END IF;
            IF _product_filters ? 'article' THEN
                _product_filter_where := _product_filter_where || ' AND LOWER(ph.article) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_product_filters->'article') as value) || '])';
            END IF;
            IF _product_filters ? 'channel' THEN
                _product_filter_where := _product_filter_where || ' AND LOWER(ph.channel) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_product_filters->'channel') as value) || '])';
            END IF;
            IF _product_filters ? 'product_code' THEN
                _ph_products_filter_where := _ph_products_filter_where || ' AND LOWER(p->>''product_code'') = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_product_filters->'product_code') as value) || '])';
            END IF;
            IF _product_filters ? 'size' THEN
                _ph_products_filter_where := _ph_products_filter_where || ' AND LOWER(p->>''size'') = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_product_filters->'size') as value) || '])';
            END IF;
        END IF;
        
        -- Build custom store filter WHERE clause for product_store_dc_mapping CTE
        IF jsonb_typeof(_store_filters) = 'object' AND _store_filters != '{}'::jsonb THEN
            IF _store_filters ? 'store_code' THEN
                _store_filter_where := _store_filter_where || ' AND LOWER(pmps.store_code) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_store_filters->'store_code') as value) || '])';
            END IF;
        END IF;
        
        -- Build other WHERE clause from other_filters (DC, store group, product profile)
        IF jsonb_typeof(_other_filters) = 'object' AND _other_filters != '{}'::jsonb THEN
            _other_where_clause := ' WHERE GREATEST(inv.net_available_inventory, 0) > 0';
            
            -- DC columns (case-insensitive, combined code+name match)
            IF _other_filters ? 'dc_code' THEN
                _other_where_clause := _other_where_clause || ' AND (LOWER(bd.dc_code::varchar) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'dc_code') as value) || ']::varchar[])' ||
                    ' OR LOWER(bd.dc_name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'dc_code') as value) || ']::varchar[]))';
            END IF;
            IF _other_filters ? 'dc_name' THEN
                _other_where_clause := _other_where_clause || ' AND LOWER(bd.dc_name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_other_filters->'dc_name') as value) || '])';
            END IF;
            
            -- Store group columns (case-insensitive, combined code+name match)
            IF _other_filters ? 'store_group_code' THEN
                _other_where_clause := _other_where_clause || ' AND (LOWER(asgc.default_sg_code::varchar) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'store_group_code') as value) || ']::varchar[])' ||
                    ' OR LOWER(asgc.store_group_name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'store_group_code') as value) || ']::varchar[]))';
            END IF;
            IF _other_filters ? 'store_group_name' THEN
                _other_where_clause := _other_where_clause || ' AND LOWER(asgc.store_group_name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_other_filters->'store_group_name') as value) || '])';
            END IF;
            
            -- Product profile columns (case-insensitive, combined code+name match) — applied early inside product_profile_filtered CTE
            IF _other_filters ? 'product_profile_code' THEN
                _pp_filter_where := _pp_filter_where || ' AND (LOWER(ppm.pp_code::varchar) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'product_profile_code') as value) || ']::varchar[])' ||
                    ' OR LOWER(ppm.name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value::text)), ',') FROM jsonb_array_elements(_other_filters->'product_profile_code') as value) || ']::varchar[]))';
            END IF;
            IF _other_filters ? 'product_profile_name' THEN
                _pp_filter_where := _pp_filter_where || ' AND LOWER(ppm.name) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_other_filters->'product_profile_name') as value) || '])';
            END IF;
            IF _other_filters ? 'special_classification' THEN
                _pp_filter_where := _pp_filter_where || ' AND LOWER(ppm.special_classification) = ANY(ARRAY[' || 
                    (SELECT string_agg(quote_literal(LOWER(value)), ',') FROM jsonb_array_elements_text(_other_filters->'special_classification') as value) || '])';
            END IF;
        END IF;
        
        
        _query_combine_format := '
            with ph_products as MATERIALIZED (
                select
                    ph.ph_code,
                    ph.article,
                    ph.channel,
                    ph.article_status_tag,
                    (p->>''product_code'') as product_code,
                    (p->>''size'')         as size'
					|| _ph_dc || '
                from %4$s ph
                cross join lateral unnest(ph.product_code_size_map) as p
                WHERE 1=1 ' || _ph_products_filter_where || '
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
                WHERE 1=1 ' || _product_filter_where || '
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
                WHERE 1=1 ' || _store_filter_where || '
				' || _product_store_dc_mapping_final_clause|| '
            )
            ,product_dc_map_after_store_eligible as NOT MATERIALIZED (
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
            -- Agent-specific: Base-level data with detailed columns for article-store-size-dc output
            ,base_data AS MATERIALIZED (
                SELECT DISTINCT
                    pdm.ph_code,
                    pdm.article,
                    pdc.channel,
                    pdm.product_code,
                    pdm.size,
                    psdm.store_code,
                    pdm.dc_code,
                    pdc.name as dc_name
                FROM product_dc_map_after_store_eligible pdm
                JOIN product_store_dc_mapping psdm USING(ph_code, article, product_code, size, dc_code)
                JOIN product_dc_map pdc USING(ph_code, article, product_code, size, dc_code)
                JOIN constraints_resolved_data_%6$s cd ON pdm.article = cd.article AND psdm.store_code = cd.store_code
            ),
            -- Pre-filter inventory data to only relevant article/product/dc combinations
            relevant_inventory_keys AS MATERIALIZED (
                SELECT DISTINCT article, product_code, dc_code
                FROM base_data
            ),
            alloc AS MATERIALIZED (
                SELECT article, dc_code, pack_type_id as product_code, SUM(quantity) as quantity
                FROM inventory_smart.sku_dc_allocated_units('''', %7$s)
                GROUP BY article, dc_code, pack_type_id
            ),
            rsv AS MATERIALIZED (
                SELECT article, product_code, dc_code, SUM(quantity) as quantity
                FROM inventory_smart.sku_dc_reserved_units
                WHERE article = ANY(%7$s)
                GROUP BY article, product_code, dc_code
            ),
            -- Filter inventory table BEFORE joining to base_data
            filtered_inventory AS MATERIALIZED (
                SELECT
                    inv.article,
                    inv.product_code,
                    inv.dc_code,
                    inv.oh,
                    inv.oo,
                    inv.it
                FROM inventory_smart.sku_dc_available_units inv
                INNER JOIN relevant_inventory_keys rik 
                    ON inv.article = rik.article 
                    AND inv.product_code = rik.product_code
                    AND inv.dc_code = rik.dc_code
            ),
            inventory_data AS MATERIALIZED (
                SELECT
                    bd.ph_code,
                    bd.article,
                    bd.product_code,
                    bd.size,
                    bd.store_code,
                    bd.dc_code,
                    COALESCE(inv.oh, 0) as oh,
                    COALESCE(inv.oo, 0) as oo,
                    COALESCE(inv.it, 0) as it,
                    COALESCE(rsv.quantity, 0) as reserve_quantity,
                    COALESCE(alloc.quantity, 0) as allocated_units,
                    COALESCE(inv.oh, 0) - COALESCE(rsv.quantity, 0) - COALESCE(alloc.quantity, 0) as net_available_inventory
                FROM base_data bd
                LEFT JOIN filtered_inventory inv 
                    ON inv.article = bd.article 
                    AND inv.product_code = bd.product_code
                    AND inv.dc_code = bd.dc_code
                LEFT JOIN rsv
                    ON rsv.article = bd.article
                    AND rsv.product_code = bd.product_code
                    AND rsv.dc_code = bd.dc_code
                LEFT JOIN alloc
                    ON alloc.article = bd.article
                    AND alloc.product_code = bd.product_code
                    AND alloc.dc_code = bd.dc_code
            ),
            article_sg_config AS MATERIALIZED (
                SELECT
                    pcm.ph_code,
                    pcm.default_sg_code,
                    sg.name as store_group_name
                FROM (
                    SELECT
                        ph.ph_code,
                        ' || _article_sg_config_default_sg_column || '
                    FROM %4$s ph
                    LEFT JOIN (
                        SELECT 
                            ph_code, 
                            unnest(default_store_groups) default_store_group 
                        FROM %5$s
                    ) pcms USING(ph_code)
                    WHERE ph.article = ANY(%7$s)
                ) pcm
                JOIN global.store_groups sg ON pcm.default_sg_code = sg.sg_code
                WHERE sg.is_deleted = false
                GROUP BY 1, 2, 3
            ),
            pp_store_counts AS (
                SELECT
                    ppm_map.product_code,
                    ppm.pp_code,
                    ppm.name as product_profile_name,
                    ppm.special_classification as product_profile_type,
                    COUNT(DISTINCT ppm_map.store_code) as store_cnt
                FROM inventory_smart.product_profile_mapping ppm_map
                JOIN inventory_smart.product_profile_master ppm
                    ON ppm_map.pp_code = ppm.pp_code
                WHERE ppm_map.product_code IN (SELECT DISTINCT product_code FROM base_data)
                ' || _pp_filter_where || '
                GROUP BY ppm_map.product_code, ppm.pp_code, ppm.name, ppm.special_classification
            ),
            winning_pp AS (
                SELECT DISTINCT ON (product_code)
                    product_code, pp_code, product_profile_name, product_profile_type
                FROM pp_store_counts
                ORDER BY product_code, store_cnt DESC, pp_code
            ),
            product_profile_filtered AS (
                SELECT DISTINCT
                    bd.ph_code, bd.article, bd.product_code, bd.size,
                    bd.store_code, bd.dc_code,
                    wp.pp_code as product_profile_code,
                    wp.product_profile_name,
                    wp.product_profile_type,
                    ppm_map.overall_proportion,
                    ppm_map.size_level_proportion
                FROM base_data bd
                JOIN winning_pp wp ON bd.product_code = wp.product_code
                JOIN inventory_smart.product_profile_mapping ppm_map
                    ON bd.product_code = ppm_map.product_code
                    AND bd.store_code = ppm_map.store_code
                    AND ppm_map.pp_code = wp.pp_code
            ),
            product_bucket AS (
                SELECT DISTINCT article, product_bucket_code
                FROM "global".product_attributes_filter
            ),
            final_result AS MATERIALIZED (
                SELECT
                    bd.ph_code,
                    bd.article,
                    bd.channel,
                    bd.product_code,
                    bd.size,
                    bd.store_code,
                    bd.dc_code,
                    bd.dc_name,
                    inv.oh,
                    inv.oo,
                    inv.it,
                    inv.reserve_quantity,
                    inv.allocated_units,
                    GREATEST(inv.net_available_inventory, 0) as net_available_inventory,
                    cd.aps,
                    CAST(ROUND(cd.wos) as INTEGER) as wos,
                    CAST(ROUND(cd.min_stock) as INTEGER) as min_stock,
                    CAST(ROUND(cd.max_stock) as INTEGER) as max_stock,
                    asgc.default_sg_code as store_group_code,
                    asgc.store_group_name,
                    ppf.product_profile_code,
                    ppf.product_profile_name,
                    ppf.product_profile_type,
                    ppf.overall_proportion,
                    ppf.size_level_proportion,
                    COALESCE(asg.grade, '''') as store_grade,
                    pb.product_bucket_code
                    ' || _product_columns || '
                    ' || _alloc_specific_columns || '
                FROM base_data bd
                LEFT JOIN inventory_data inv USING(ph_code, article, product_code, size, store_code, dc_code)
                LEFT JOIN constraints_resolved_data_%6$s cd ON bd.article = cd.article AND bd.store_code = cd.store_code
                LEFT JOIN article_sg_config asgc ON bd.ph_code = asgc.ph_code
                JOIN product_profile_filtered ppf ON bd.ph_code = ppf.ph_code 
                    AND bd.article = ppf.article 
                    AND bd.product_code = ppf.product_code
                    AND bd.store_code = ppf.store_code
                    AND bd.dc_code = ppf.dc_code
                LEFT JOIN product_bucket pb ON bd.article = pb.article
                LEFT JOIN inventory_smart.article_store_grade asg ON bd.article = asg.article AND bd.store_code = asg.store_code
                LEFT JOIN inventory_smart.ph_master ph ON bd.ph_code = ph.ph_code                
                ' || _other_where_clause || '
            )
            %1$s
            ORDER BY net_available_inventory DESC, article, store_code, size, dc_code
            LIMIT %2$s
        ';

        RETURN _query_combine_format;

    END;
$function$;
