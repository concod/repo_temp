--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.create_asl_rcl_constraints_temp_tables(text, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.create_asl_rcl_constraints_temp_tables(
    p_vl_unique_identifier text,
    p_rcl_psm_resolved_table text,
    p_gen_random_uuid text DEFAULT NULL,
    p_client_config jsonb DEFAULT '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$

    DECLARE
        _temp_query text;
        _rcl_input_query text;
        v_gen_random_uuid text := COALESCE(p_gen_random_uuid, '');
        _constraints_input_table text := 'public.rcl_constraint_input_data_' || p_vl_unique_identifier;
        start_time timestamp;
        end_time timestamp;
        ph_data_id text := 'ph_data_' || p_vl_unique_identifier;
        ph_configuration_mapping text := '_ph_configuration_mapping_' || p_vl_unique_identifier;
        _count_check int;
        _level_name text := COALESCE(
            p_client_config->>'rcl_constraints_psaf_level',
            'l0_name'
        );
        _level_joins text := '';
        _cols text[];
        _col text;
        _use_precomputed_data boolean := COALESCE((p_client_config->>'use_precomputed_data')::boolean, false);
    BEGIN
        -- Dynamically derive _level_joins from _level_name
        _cols := string_to_array(replace(_level_name, ' ', ''), ',');
        FOREACH _col IN ARRAY _cols LOOP
            IF _level_joins <> '' THEN
                _level_joins := _level_joins || ' and ';
            END IF;
            _level_joins := _level_joins || 'paf.' || _col || '=psaf.' || _col;
        END LOOP;

        -- CONSTRAINTS INPUT TEMP TABLE
        start_time := clock_timestamp();
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_constraints_temp_tables', 'Before dropping _constraints_input_table', 'drop table if exists ' || _constraints_input_table || ' cascade;', jsonb_build_object('$1',$1,'$2',$2,'$3',$3));
        execute format('drop table if exists %1$s cascade;', _constraints_input_table);
        _temp_query := format('
            create unlogged table %1$s as (
                select distinct
                    psm.product_code,
					article,
                    psm.store_code
                from %2$s psm
                join
                    (select %4$s, unnest(product_codes) as product_code, article from %3$s) paf using (product_code)
                join
                    global.product_store_attributes_filter psaf
                    on
                    %5$s and psm.store_code=psaf.store_code
            );',
            _constraints_input_table,
            p_rcl_psm_resolved_table,
            ph_data_id,
            _level_name,
            _level_joins
        );
        raise notice 'temp query for constraints  : %', _temp_query;
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_constraints_temp_tables', 'Before executing constraints input temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3));
        execute _temp_query;

        -- CONSTRAINTS RESOLVED TEMP TABLE
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_constraints_temp_tables', 'Before dropping table constraints_resolved_data_' || p_vl_unique_identifier, 'drop table if exists constraints_resolved_data_' || p_vl_unique_identifier || ' cascade;', jsonb_build_object('$1',$1,'$2',$2,'$3',$3));

        execute format('drop table if exists constraints_resolved_data_v_%1$s', p_vl_unique_identifier);
		_rcl_input_query := format('create temp table constraints_resolved_data_v_%2$s as (
			select * from inventory_smart.generate_rcl_constraint_data(''%1$s'', 170, current_date, true, ' || _use_precomputed_data || ')
		)', _constraints_input_table, p_vl_unique_identifier);
		raise notice ' constraints resolution query: % ', _rcl_input_query;

		execute _rcl_input_query;
        execute format('drop table if exists constraints_resolved_data_%1$s', p_vl_unique_identifier);
        execute format('select count(1) from constraints_resolved_data_v_%1$s where min_distribution is not null', p_vl_unique_identifier) into _count_check;

        if (_count_check > 0) then
            _rcl_input_query := format('create temp table constraints_resolved_data_%2$s as (
                select * from inventory_smart.calculate_min_strategy(''%1$s'',''constraints_resolved_data_v_%2$s'')
            )', ph_configuration_mapping, p_vl_unique_identifier);
        else
            _rcl_input_query := format('create temp table constraints_resolved_data_%1$s as (
                select * from constraints_resolved_data_v_%1$s
            )', p_vl_unique_identifier);
        end if;

        raise notice 'constraints resolution query: % ', _rcl_input_query;
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_constraints_temp_tables', 'constraints resolution query', _rcl_input_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3));
        execute _rcl_input_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken to resolve Constraints::::  %', end_time - start_time;

    END
 $function$
;