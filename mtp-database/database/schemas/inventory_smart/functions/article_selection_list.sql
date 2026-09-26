--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer, alloc_type text, client_config jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list(input refcursor, jsonb, jsonb, integer[], character[], jsonb, uuid text, default_sg_code integer, alloc_type text, client_config jsonb)
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
        _result_table text := 'result_table_' || vl_unique_identifier;
		_temp_query text;
        _channel_value text := '';
        _channel_filter jsonb := '{}'::jsonb;

        _alloc_filter text := CASE _alloc_type
            WHEN 'po' THEN ' where po_code in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') '
            WHEN 'asn' THEN ' where asn_id in ('''||ARRAY_TO_STRING( $5, ''','' ', '')||''') '
            ELSE ''
        END;

    BEGIN
        -- FILTERS, SEARCH, SORT, LIMIT CLAUSE PREPARATION
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;
        select * from inventory_smart.form_product_store_attribute_filter_query('dummy', $2, $3, 'global', 'product_store_attributes_filter_store_code') into _query_sa_psm, _ph_query;

        _channel_value := COALESCE(
            client_config->'channel_level_filtering'->>_alloc_type,
            client_config->'channel_level_filtering'->>'default',
            ''
        );

        IF _channel_value <> '' THEN
            _channel_filter := jsonb_build_object(
                'channel', jsonb_build_array(
                    jsonb_build_object('type', 'list', 'operator', 'in', 'values', jsonb_build_array(_channel_value))
                )
            );
        ELSE
            _channel_filter := '{}'::jsonb;
        END IF;

        _query_pa := inventory_smart.form_main_table_filters(
            'ph_master',
            _product_filters || _channel_filter
        );
        
        if COALESCE(client_config->>'enable_nc_alloc', 'false')::boolean then
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
            raise notice 'resolved articles: %', _resolved_articles;

            -- FINAL RESULT
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
                inventory_smart.get_asl_main_query(_alloc_type, client_config),
				_final_get,
				_limit,
				_rcl_psm_resolved_table,
				ph_data_id,
                ph_configuration_mapping,
                vl_unique_identifier,
                _resolved_articles,
                default_sg_code,
                _alloc_filter
			);
			raise notice 'Query ------- : %', _query_combine;
            start_time := clock_timestamp();

			EXECUTE 'DROP TABLE IF EXISTS ' || _result_table || ' CASCADE';
			_temp_query := 'CREATE unlogged TABLE IF NOT EXISTS ' || _result_table || ' as (' || _query_combine || ' where false)';
			execute _temp_query;
			EXECUTE 'INSERT INTO ' || _result_table || ' ' || _query_combine;

            --OPEN $1 SCROLL FOR EXECUTE _query_combine;
            perform  global.sp_log(null, 'inventory_smart.article_selection_list', '_query_combine' ,_query_combine,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken to query combine::::  %', end_time - start_time;

            -- Get count from result table (instant, no cursor traversal needed)
            start_time := clock_timestamp();
            execute('select count(*) from ' || _result_table) into _batch_count;
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken to count result::::  %', end_time - start_time;

            -- LOOP ITERATION
            IF _batch_count = 0 THEN
                _query_combine_count = format(_query_combine_count_format, _limit_clause);
                start_time := clock_timestamp();
                perform  global.sp_log(null, 'inventory_smart.article_selection_list', '_query_combine_count' ,_query_combine_count,jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;		
                EXECUTE _query_combine_count INTO _count;
                end_time := clock_timestamp();
				RAISE NOTICE 'Time taken to _query_combine_count::::  %', end_time - start_time;
            END IF;
            _offset := _offset + _limit;
            _limit := _limit + _limit;
        END LOOP;

        open $1 for execute('select * from '|| _result_table);
		perform global.sp_log(v_gen_random_uuid, 'inventory_smart.article_selection_list', 'Before return', 'select * from '|| _result_table, jsonb_build_object('$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7,'$8',$8)) ;

        RETURN $1;
    end
 $function$
;
