--liquibase formatted sql
--changeset sanit.arora:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-124226 labels:MTP-124226
--comment: Handle 'it' and 'oh_it' as inv source 
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.get_asl_final_result_query(text);
DROP FUNCTION IF EXISTS inventory_smart.get_asl_final_result_query(text, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_asl_final_result_query(text, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_asl_final_result_query(p_alloc_type text, p_client_config jsonb, _dynamic_kpi_select_columns text DEFAULT '')
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _product_columns text := '';
        _raw_product_columns text := '';
        _raw_aid_columns text := '';
        _col text;
        _aid_columns text := '';
        _alloc_specific_columns text := '';
        _cte_list jsonb := '[]'::jsonb;
        _custom_cte_columns text := '';
        _custom_cte_joins text := '';
        _cte_name text;
        _final_result_query text := '';
        _inv_metric_specific_columns text := '';
        _inv_metric_condition_columns text := 'oh';

    BEGIN

        -- Handle oh_oo based colums for clients having oh_oo enabled
        if (p_client_config ? 'enable_oh_oo') and COALESCE(p_client_config->'enable_oh_oo'->>p_alloc_type, p_client_config->'enable_oh_oo'->>'default', 'false')::boolean then
            _inv_metric_specific_columns := ', b_alloc.eaches_oh_oo as beginning_available_to_allocate_eaches_oh_oo,
                b_alloc.packs_oh_oo as beginning_available_to_allocate_packs_oh_oo,
                b_alloc.eaches_oh_oo_map as beginning_available_to_allocate_eaches_oh_oo_map,
                b_alloc.packs_oh_oo_map as beginning_available_to_allocate_packs_oh_oo_map,
                COALESCE(oh_oo, 0) as oh_oo,
                oh_oo_map,
                ctat_oh_oo_map,
                GREATEST(((COALESCE(oh_oo, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)), 0) as net_available_inventory_oh_oo ';
                _inv_metric_condition_columns := 'oh_oo';
        end if;

        if (p_client_config ? 'enable_oh_it') and COALESCE(p_client_config->'enable_oh_it'->>p_alloc_type, p_client_config->'enable_oh_it'->>'default', 'false')::boolean then
            _inv_metric_specific_columns := ',
                COALESCE(oh_it, 0) as oh_it,
                it_map,
                oh_it_map,
                ctat_it_map,
                ctat_oh_it_map,
                GREATEST(((COALESCE(it, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)), 0) as net_available_inventory_it,
                GREATEST(((COALESCE(oh_it, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)), 0) as net_available_inventory_oh_it ';
            _inv_metric_condition_columns := 'oh_it';
        end if;


        _raw_product_columns := COALESCE(
            p_client_config->'final_select_config'->>'product_columns',''
        );
        IF _raw_product_columns <> '' THEN
            FOREACH _col IN ARRAY string_to_array(replace(_raw_product_columns, ' ', ''), ',')
            LOOP
                IF _col <> '' THEN
                    _product_columns := _product_columns || ', ph.' || _col;
                END IF;
            END LOOP;
        END IF;

        _cte_list := COALESCE(
            p_client_config->'custom_ctes'->p_alloc_type,
            p_client_config->'custom_ctes'->'default',
            '[]'::jsonb
        );

        _raw_aid_columns := COALESCE(
            p_client_config->'final_select_config'->>'aid_columns',''
        );
        IF _raw_aid_columns <> '' THEN
            FOREACH _col IN ARRAY string_to_array(replace(_raw_aid_columns, ' ', ''), ',')
            LOOP
                IF _col <> '' THEN
                    IF _col = 'in_stock_perc' AND _cte_list @> '"inventory_stock_stats"'::jsonb THEN
                        -- Skip: already selected as iss.in_stock_perc via custom_cte_columns
                        CONTINUE;
                    END IF;
                    _aid_columns := _aid_columns || ', tm.' || _col;
                END IF;
            END LOOP;
        END IF;

        _alloc_specific_columns := COALESCE(
            p_client_config->'final_select_config'->'alloc_specific_columns'->>p_alloc_type,''
        );

        -- Build custom cte columns and joins by CTEs based on the list
        FOR _cte_name IN SELECT jsonb_array_elements_text(_cte_list)
        LOOP
            CASE _cte_name
                WHEN 'allocation_rule' THEN
                    _custom_cte_columns := _custom_cte_columns || ', alloc_rule.alloc_rules as allocation_rules';
                    _custom_cte_joins := _custom_cte_joins || ' left join allocation_rule alloc_rule on ph.ph_code = alloc_rule.ph_code ';
                WHEN 'inventory_stock_stats' THEN
                    _custom_cte_columns := _custom_cte_columns || ', iss.in_stock_perc ';
                    _custom_cte_joins := _custom_cte_joins || ' left join inventory_stock_stats iss on ph.ph_code = iss.ph_code';
                -- Add more CTEs here as needed
            END CASE;
        END LOOP;


        -- Single query template with parameters
        _final_result_query := format(',final_result as (
            SELECT %%2$s as limit,
                ph.offset,
                ph.l0_name,
                ph.l1_name,
                ph.l2_name,
                ph.article,
                ph.ph_code,
                ph.product_description,
                inv_info.sizes,
                inv_info.product_code upc,
                ph.article_status_tag,
                STRING_TO_ARRAY(ph.channel, '','')  as channel,
                COALESCE(reserve_quantity, 0) as reserve_quantity,
                COALESCE(oh, 0) as oh,
                COALESCE(oo, 0) as oo,
                COALESCE(it, 0) as it,
                null as pack_type_id,
                oh_map,
                rq_map,
                ctat_oh_map,
                COALESCE(allocated_units, 0) as allocated_units,
                GREATEST(((COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)), 0) as net_available_inventory,
                GREATEST(((COALESCE(oh, 0) - COALESCE(reserve_quantity, 0)) - COALESCE(allocated_units, 0)), 0) as net_available_inventory_oh,
                au_map,
                CASE 
                    WHEN udpp IS NULL THEN ARRAY[iapp || ''{"is_default": true}'']
                    WHEN iapp = udpp THEN ARRAY[iapp || ''{"is_default": true}'']
                    ELSE ARRAY[udpp || ''{"is_default": true}'', iapp || ''{"is_default": false}'']
                END as product_profiles,
                allocated_time::date as last_allocated,
                dcs,
                store_groups,
                cd.mapped_stores_count,
                cd.mapped_stores,
                cd.aps,
                CAST(ROUND(cd.wos) as INTEGER) as wos,
                CAST(ROUND(cd.min_stock) as INTEGER) as min_stock,
                CAST(ROUND(cd.max_stock) as INTEGER) as max_stock,
                CAST(ROUND(cd.min_stock_validator) as INTEGER) as min_stock_validator,
                CAST(ROUND(cd.max_stock_validator) as INTEGER) as max_stock_validator,
                b_alloc.eaches_oh as beginning_available_to_allocate_eaches_oh,
                b_alloc.packs_oh as beginning_available_to_allocate_packs_oh,
                b_alloc.eaches_oh_map as beginning_available_to_allocate_eaches_oh_map,
                b_alloc.packs_oh_map as beginning_available_to_allocate_packs_oh_map       
                %1$s 
                %2$s 
                %3$s
                %4$s
                %5$s
                %8$s
            FROM %%4$s ph
            JOIN article_sg_config asgc on ph.ph_code = asgc.ph_code
            left join final_inventory inv_info on inv_info.ph_code = ph.ph_code
            JOIN constraint_data cd on ph.ph_code = cd.ph_code
            LEFT JOIN product_profiles_ia ppi on ph.ph_code = ppi.ph_code
            JOIN article_dc_config adc on ph.ph_code = adc.ph_code
            LEFT JOIN article_udpp_config ppu on ph.ph_code = ppu.ph_code
            LEFT JOIN txs_metrics tm on ph.ph_code = tm.ph_code
            LEFT JOIN before_allocated b_alloc on b_alloc.ph_code = ph.ph_code
            LEFT JOIN dynamic_kpi_store b on b.ph_code = ph.ph_code
            LEFT JOIN dynamic_kpi_dc c on c.ph_code = ph.ph_code
            %6$s
            WHERE (COALESCE(%7$s, 0) - COALESCE(reserve_quantity, 0) - COALESCE(allocated_units, 0)) > 0
        )',
        _product_columns,
        _aid_columns,
        _alloc_specific_columns,
        _custom_cte_columns,
        _inv_metric_specific_columns,
        _custom_cte_joins,
        _inv_metric_condition_columns,
        _dynamic_kpi_select_columns
        );

        RETURN _final_result_query;

    END
$function$
;