--liquibase formatted sql
--changeset aniruddh.singh:agent_article_selection_list_v3.3 runOnChange:true stripComments:false splitStatements:false context:EligibilityAGENT labels:EligibilityAGENT
--comment:  handle sizes and product_code separately being out of form_main_table_filters in agent_article_selection_list_v3.3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.agent_article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer, alloc_type text, client_config jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.agent_article_selection_list(
    input refcursor, 
    p_product_filters jsonb, 
    p_store_filters jsonb, 
    p_po_asn_ids integer[], 
    p_articles character[], 
    p_table_filters jsonb, 
    uuid text, 
    default_sg_code integer, 
    alloc_type text, 
    client_config jsonb
)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _query_pa text := '';
        _store_active_filter text := '{"active": []}'::jsonb || $3;
        _query_sa text := global.form_attribute_table_filters_v2('store_attributes', 'store_code', _store_active_filter::jsonb);
        _query_sa_psm text := '';
        _ph_query text := '';
        _product_filters jsonb := $2 ;
        _query_combine text := '';
        _query_combine_count_format text := '';
        _query_combine_count text := '';
 		_final_get text := ' SELECT DISTINCT * FROM final_result';
        _count int := 1;
        _batch_count int := 0;
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _limit_clause text := '';
		vl_unique_identifier text := $7;
		start_time timestamp;
        end_time timestamp;
        ph_data_id text := 'ph_data_' || uuid;
        ph_configuration_mapping text := '_ph_configuration_mapping_' || uuid;
        v_gen_random_uuid text  := gen_random_uuid()::varchar;
		_rcl_psm_resolved_table text := 'public.rcl_psm_resolved_data_' || vl_unique_identifier;
        _resolved_articles varchar[];
        _alloc_type text := $9;
        _filter_articles varchar[];
        _skip_loop boolean := false;

        _alloc_filter text := CASE _alloc_type
            WHEN 'po' THEN ' where po_code in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') '
            WHEN 'asn' THEN ' where asn_id in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') '
            ELSE ''
        END;

    BEGIN
        -- Extract filter_articles from client_config for loop optimization
        _filter_articles := COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(client_config->'filter_articles')),
            '{}'
        );
        
        -- If articles are provided, skip loop and query directly
        IF array_length(_filter_articles, 1) > 0 THEN
            _skip_loop := true;
            _limit := 1000000;  -- Large limit for direct query
            _offset := 0;
        END IF;
        
        -- FILTERS, SEARCH, SORT, LIMIT CLAUSE PREPARATION
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
        select * from inventory_smart.form_product_store_attribute_filter_query('dummy', $2, $3, 'global', 'product_store_attributes_filter_store_code') into _query_sa_psm, _ph_query;

        -- Remove size and product_code filters from product_filters before passing to form_main_table_filters
        -- since these are handled in agent_asl_main_list where JSON is unnested
        _query_pa := inventory_smart.form_main_table_filters(
            'ph_master',
            CASE 
                WHEN _product_filters ? 'size' AND _product_filters ? 'product_code' THEN _product_filters - 'size' - 'product_code'
                WHEN _product_filters ? 'size' THEN _product_filters - 'size'
                WHEN _product_filters ? 'product_code' THEN _product_filters - 'product_code'
                ELSE _product_filters
            END || 
			COALESCE((client_config->'channel_append_on_ph'->_alloc_type)::jsonb, (client_config->'channel_append_on_ph'->'default')::jsonb, '{}'::jsonb)
        );
        
        -- OPTIMIZATION: Apply article filter early if provided
        IF array_length(_filter_articles, 1) > 0 THEN
            _query_pa := _query_pa || ' AND article = ANY(ARRAY[''' || array_to_string(_filter_articles, ''',''') || '''])';
        END IF;
        
        if (client_config->>'client_has_nc')::boolean then
            -- Dynamic new choice alert filtering based on allocation type
            _query_pa := _query_pa || CASE _alloc_type
                WHEN 'nc' THEN ' AND article IN (select article FROM inventory_smart.alerts_product_level where new_choice_flag = 1)'
                WHEN 'asn' THEN '' -- No filtering for ASN
                ELSE ' AND article NOT IN (select article FROM inventory_smart.alerts_product_level where new_choice_flag = 1)' -- Default behavior
            END;
        end if;

        _query_pa := _query_pa || _ph_search || _ph_sort;
        _query_pa := replace(_query_pa, '%', '%%');
        raise notice ' _query_pa %', _query_pa;
        raise notice ' _query_sa_psm % ', _query_sa_psm;

        -- LOOP ITERATION HELPER - COUNT QUERY
        _query_combine_count_format := 'SELECT count(*) FROM ( SELECT * FROM inventory_smart.ph_master ' || _query_pa || '  ' || ' %1$s'||' ) sq;';

        -- OPTIMIZATION: Skip loop if articles provided (direct query)
        IF _skip_loop THEN
            -- Direct query path: create temp tables once and open cursor
            _limit_clause := 'ORDER BY article LIMIT ' || _limit || ' OFFSET 0';
            
            -- PH DATA TEMP TABLE
            perform inventory_smart.create_asl_ph_data_temp_table(
                ph_data_id,
                _alloc_type,
                _alloc_filter,
                _query_pa,
                _ph_sort,
                0,
                v_gen_random_uuid,
                _limit_clause,
                client_config
            );

            -- PH CONFIGURATION MAPPING TEMP TABLE
            perform inventory_smart.create_asl_ph_config_temp_table(
                vl_unique_identifier,
                ph_data_id,
                _alloc_type,
                _alloc_filter,
                default_sg_code,
                v_gen_random_uuid,
                client_config
            );

            -- RCL PSM TEMP TABLE
            perform inventory_smart.create_asl_rcl_psm_temp_tables(
                vl_unique_identifier,
                ph_data_id,
                _alloc_type,
                _alloc_filter,
                default_sg_code,
                _query_sa_psm,
                v_gen_random_uuid,
                client_config
            );

            -- RCL CONSTRAINTS TEMP TABLE
            perform inventory_smart.create_asl_rcl_constraints_temp_tables(
                vl_unique_identifier,
                _rcl_psm_resolved_table,
                v_gen_random_uuid,
                client_config
            );

            -- RESOLVED ARTICLES
            execute format('select array_agg(distinct article) from constraints_resolved_data_%1$s', vl_unique_identifier) into _resolved_articles;
            _resolved_articles := coalesce(_resolved_articles, '{}');
            
            raise notice 'Agent ASL - resolved articles (direct query): %', _resolved_articles;

            -- FINAL RESULT - Using agent_asl_main_list function (base-level query)
            _query_combine = format(
                inventory_smart.agent_asl_main_list(_alloc_type, client_config),
                _final_get,
                _limit,
                _rcl_psm_resolved_table,
                ph_data_id,
                ph_configuration_mapping,
                vl_unique_identifier,
                'ARRAY[''' || array_to_string(_resolved_articles, ''',''') || ''']',
                default_sg_code,
                _alloc_filter
            );
            raise notice 'Agent Query (direct) ------- : %', _query_combine;
            
            start_time := clock_timestamp();
            OPEN $1 SCROLL FOR EXECUTE _query_combine;
            perform global.sp_log(null, 'inventory_smart.agent_article_selection_list', '_query_combine_direct', _query_combine, 
                jsonb_build_object('p_product_filters', p_product_filters, 'p_store_filters', p_store_filters, 'p_po_asn_ids', p_po_asn_ids, 'p_articles', p_articles, 'p_table_filters', p_table_filters, 'uuid', uuid, 'default_sg_code', default_sg_code));
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken to query combine (direct)::::  %', end_time - start_time;
        ELSE
            -- Loop path: original pagination logic
            WHILE _count > 0 AND _batch_count = 0 LOOP
                _limit_clause := 'ORDER BY article  LIMIT ' || _limit || ' OFFSET ' || _offset;

                -- PH DATA TEMP TABLE
                perform inventory_smart.create_asl_ph_data_temp_table(
                    ph_data_id,
                    _alloc_type,
                    _alloc_filter,
                    _query_pa,
                    _ph_sort,
                    _offset,
                    v_gen_random_uuid,
                    _limit_clause,
                    client_config
                );

                -- PH CONFIGURATION MAPPING TEMP TABLE
                perform inventory_smart.create_asl_ph_config_temp_table(
                    vl_unique_identifier,
                    ph_data_id,
                    _alloc_type,
                    _alloc_filter,
                    default_sg_code,
                    v_gen_random_uuid,
                    client_config
                );

                -- RCL PSM TEMP TABLE
                perform inventory_smart.create_asl_rcl_psm_temp_tables(
                    vl_unique_identifier,
                    ph_data_id,
                    _alloc_type,
                    _alloc_filter,
                    default_sg_code,
                    _query_sa_psm,
                    v_gen_random_uuid,
                    client_config
                );

                -- RCL CONSTRAINTS TEMP TABLE
                perform inventory_smart.create_asl_rcl_constraints_temp_tables(
                    vl_unique_identifier,
                    _rcl_psm_resolved_table,
                    v_gen_random_uuid,
                    client_config
                );

                -- RESOLVED ARTICLES
                execute format('select array_agg(distinct article) from constraints_resolved_data_%1$s', vl_unique_identifier) into _resolved_articles;
                _resolved_articles := coalesce(_resolved_articles, '{}');
                
                raise notice 'Agent ASL - resolved articles: %', _resolved_articles;

                -- FINAL RESULT - Using agent_asl_main_list function (base-level query)
                raise notice 'Arguments passed to format function:
                            Argument 1 (_final_get): %
                            Argument 2 (_limit): %
                            Argument 3 (_rcl_psm_resolved_table): %
                            Argument 4 (ph_data_id): %
                            Argument 5 (ph_configuration_mapping): %
                            Argument 6 (vl_unique_identifier): %
                            Argument 7 (_resolved_articles): %
                            Argument 8 (default_sg_code): %
                            Argument 9 (_alloc_filter): %', 
                    _final_get, _limit, _rcl_psm_resolved_table, ph_data_id, ph_configuration_mapping, 
                    vl_unique_identifier, _resolved_articles, default_sg_code, _alloc_filter;
                
                _query_combine = format(
                    inventory_smart.agent_asl_main_list(_alloc_type, client_config),
                    _final_get,
                    _limit,
                    _rcl_psm_resolved_table,
                    ph_data_id,
                    ph_configuration_mapping,
                    vl_unique_identifier,
                    'ARRAY[''' || array_to_string(_resolved_articles, ''',''') || ''']',
                    default_sg_code,
                    _alloc_filter
                );
                raise notice 'Agent Query ------- : %', _query_combine;
                
                start_time := clock_timestamp();
                OPEN $1 SCROLL FOR EXECUTE _query_combine;
                perform global.sp_log(null, 'inventory_smart.agent_article_selection_list', '_query_combine', _query_combine, 
                    jsonb_build_object('p_product_filters', p_product_filters, 'p_store_filters', p_store_filters, 'p_po_asn_ids', p_po_asn_ids, 'p_articles', p_articles, 'p_table_filters', p_table_filters, 'uuid', uuid, 'default_sg_code', default_sg_code));
                end_time := clock_timestamp();
                RAISE NOTICE 'Time taken to query combine::::  %', end_time - start_time;

                -- LOOP ITERATION
                MOVE FORWARD ALL FROM $1;
                GET DIAGNOSTICS _batch_count := ROW_COUNT;
                MOVE BACKWARD ALL FROM $1;
                
                IF _batch_count = 0 THEN
                    _query_combine_count = format(_query_combine_count_format, _limit_clause);
                    perform global.sp_log(null, 'inventory_smart.agent_article_selection_list', '_query_combine_count', _query_combine_count, 
                        jsonb_build_object('p_product_filters', p_product_filters, 'p_store_filters', p_store_filters, 'p_po_asn_ids', p_po_asn_ids, 'p_articles', p_articles, 'p_table_filters', p_table_filters, 'uuid', uuid, 'default_sg_code', default_sg_code));
                    EXECUTE _query_combine_count INTO _count;
                END IF;
                
                _offset := _offset + _limit;
                _limit := _limit + _limit;
                
                IF _batch_count = 0 AND _count > 0 THEN 
                    CLOSE $1; 
                END IF;
            END LOOP;
        END IF;

        RETURN $1;
    END
$function$
;