--liquibase formatted sql
--changeset nibeel.yunus:code_refactor runOnChange:true stripComments:false splitStatements:false context:MTP-95638 labels:MTP-95638
--comment: MTP-95638
--rollback: SELECT  1
DROP FUNCTION IF EXISTS inventory_smart.create_asl_rcl_psm_temp_tables(text, text, text, text, integer, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.create_asl_rcl_psm_temp_tables(
    p_vl_unique_identifier text,
    p_ph_data_id text,
    p_alloc_type text,
    p_po_filter text,
    p_default_sg_code integer,
    p_query_sa_psm text,
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
        _rcl_input_query_format text;
        v_gen_random_uuid text := COALESCE(p_gen_random_uuid, '');
        _rcl_input_table text := 'public.rcl_psm_input_data_' || p_vl_unique_identifier;
        _rcl_psm_resolved_table text := 'public.rcl_psm_resolved_data_' || p_vl_unique_identifier;
        ph_configuration_mapping text := '_ph_configuration_mapping_' || p_vl_unique_identifier;
        start_time timestamp;
        end_time timestamp;
        _columns_config text := '';
        _psaf_cols text := '';
        _final_extra_join text := '';
        _key text := '';
        _use_precomputed_data boolean := COALESCE((p_client_config->>'use_precomputed_data')::boolean, false);

    BEGIN
        IF COALESCE(p_client_config->>'store_level_duplicates_on_psafsc', '') <> '' THEN
            _key := p_client_config->>'store_level_duplicates_on_psafsc';
            _columns_config := ', ph.'||_key;
            _psaf_cols := ', '||_key;
            _final_extra_join := 'and sgm.'||_key||' = esg.'||_key;
        END IF;


        -- Generate RCL input query format
        _rcl_input_query_format := format('
            with store_group as (
                select
                    pcm.*,
                    sg.name
                from (
                    select
                        ph.ph_code,
                        unnest(product_code_size_map) as product,
                        coalesce(pcms.default_store_group, %%2$s) as default_sg_code
                        '|| _columns_config ||'
                    from
                        %%1$s ph
                    left join (
                        select ph_code, unnest(default_store_groups) default_store_group from '|| ph_configuration_mapping ||'
                    ) pcms
                    using(ph_code)
                ) pcm
                join global.store_groups sg on pcm.default_sg_code = sg.sg_code
                where is_deleted = false
            ),
            sgm as MATERIALIZED (
                select
                    asgm.sg_code ,
                    psaf.*
                from global.store_groups_mapping asgm
                join (
                    select store_code, psa_code '|| _psaf_cols ||'  '|| p_query_sa_psm ||'
                )psaf on asgm.store_code=psaf.store_code
                join global.store_master sm
                on psaf.store_code = sm.store_code and sm.active
            )
            select
                product->>''product_code'' as product_code,
                sgm.store_code, sgm.psa_code
            from store_group esg
            join sgm on sgm.sg_code = esg.default_sg_code
            '|| _final_extra_join ||'
            group by 1, 2, 3
        ');

        -- RCL PSM INPUT TEMP TABLE
        _rcl_input_query := format(_rcl_input_query_format, p_ph_data_id, p_default_sg_code);
        raise notice '_rcl_input_query: %', _rcl_input_query;
        start_time := clock_timestamp();
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_temp_tables', 'Before executing drop table query for ' || _rcl_input_table, 'drop table if exists ' || _rcl_input_table || ' cascade;', jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        execute 'drop table if exists ' || _rcl_input_table || ' cascade;';
        _rcl_input_query := 'create unlogged table ' || _rcl_input_table || ' with (autovacuum_enabled=false) as ( ' || _rcl_input_query || ' );'||
                            'CREATE INDEX idx_' || p_vl_unique_identifier || '_pm ON ' || _rcl_input_table || ' (product_code);';
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_temp_tables', 'Before executing create table query for _rcl_input_query', _rcl_input_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        raise notice '_rcl_input_query: %', _rcl_input_query;
        execute _rcl_input_query;

        -- RCL PSM RESOLVED TEMP TABLE
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_temp_tables', 'Before executing drop table query for ' || _rcl_psm_resolved_table, 'drop table if exists ' || _rcl_psm_resolved_table || ';', jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        execute 'drop table if exists ' || _rcl_psm_resolved_table || ';';
        _temp_query := format(
            'create unlogged table %2$s with (autovacuum_enabled=false) as (
                select * from global.generate_rcl_psm_data(''%1$s'', 101, current_date, true, ' || _use_precomputed_data || ')
            );',
            _rcl_input_table,
            _rcl_psm_resolved_table
        );
        raise notice 'RCL PSM resolution query : %', _temp_query;
        perform global.sp_log(v_gen_random_uuid, 'inventory_smart.create_asl_rcl_temp_tables', 'Before executing RCL PSM temp_query', _temp_query, jsonb_build_object('$1',$1,'$2',$2,'$3',$3,'$4',$4,'$5',$5,'$6',$6,'$7',$7));
        execute _temp_query;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken to resolve PSM::::  %', end_time - start_time;

    END
 $function$
;
