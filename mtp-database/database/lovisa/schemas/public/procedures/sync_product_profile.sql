--liquibase formatted sql
--changeset aleena.reji:sync_product_profile stripComments:false splitStatements:false runOnChange:true context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_profile



DROP PROCEDURE IF EXISTS public.sync_product_profile();

CREATE OR REPLACE PROCEDURE public.sync_product_profile()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE 
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_profile';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _curr_time TIME := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::TIME;

    _hies varchar;
    _ph_hie_level int;
    _sql text;
BEGIN
    --------------------------------------------------------------------
    -- START LOG
    --------------------------------------------------------------------
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    --------------------------------------------------------------------
    -- TIME WINDOW CHECK (Allowed: 23:00–04:30 IST)
    --------------------------------------------------------------------
    IF (_curr_time >= TIME '23:00' OR _curr_time <= TIME '04:30') THEN

        ----------------------------------------------------------------
        -- MAIN LOGIC (inside window)
        ----------------------------------------------------------------
        BEGIN
            _log_step := 'fetch_hierarchy';

            SELECT 
                string_agg(generic_column_name, ', '), 
                max(hierarchy_level)
            INTO _hies, _ph_hie_level
            FROM (
                SELECT generic_column_name, hierarchy_level
                FROM global.product_generic_schema_mapping
                WHERE hierarchy_level <= (
                    SELECT hierarchy_level
                    FROM global.product_generic_schema_mapping
                    WHERE generic_column_name = 'article'
                )
                ORDER BY 2 ASC
            ) x;

            _log_step := 'delete_old_ppm';
            DELETE FROM inventory_smart.product_profile_master 
            WHERE special_classification = 'ia-recommended';

            _log_step := 'insert_master';
            _sql := 'INSERT INTO inventory_smart.product_profile_master (
                        pp_code, "name", description, special_classification, ph_code
                     )
                     SELECT 
                        pp_code, name, description, special_classification,
                        phf.hierarchy_code AS ph_code
                     FROM (
                        SELECT 
                            pp_code, store_code, name, product_code,
                            special_classification, overall_proportion,
                            size_level_proportion, description
                        FROM public.product_profile
                     ) x
                     JOIN global.product_attributes_filter paf USING(product_code)
                     JOIN (
                        SELECT hierarchy_code, ' || _hies || '
                        FROM global.product_hierarchies_filter_flattened
                        WHERE "level" = ' || _ph_hie_level || ' 
                          AND active
                     ) phf USING(' || _hies || ')
                     GROUP BY 1,2,3,4,5';

            RAISE NOTICE '%', _sql;
            EXECUTE _sql;

            _log_step := 'build_partitions';
            CALL global.build_list_partitions('product_profile_mapping');

            _log_step := 'insert_mapping';
            INSERT INTO inventory_smart.product_profile_mapping (
                pp_code, mapping_code, l0_name, size_level_proportion,
                overall_proportion, product_code, store_code
            )
            SELECT 
                pp_code,
                pmps.mapping_code,
                pmps.l0_name,
                size_level_proportion,
                overall_proportion,
                product_code,
                store_code
            FROM public.product_profile x
            LEFT JOIN global.product_mapping_product_store pmps 
                   USING(product_code, store_code)
            WHERE EXISTS (
                SELECT 1 
                FROM inventory_smart.product_profile_master a 
                WHERE a.pp_code = x.pp_code
            );

            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                'end',
                NULL,
                (clock_timestamp() - _st)::text,
                NULL
            );

        EXCEPTION WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::text,
                NULL
            );
            RAISE EXCEPTION 'Error in sync_product_profile: %', SQLERRM;
        END;

    ELSE
        ----------------------------------------------------------------
        -- SKIPPED OUTSIDE TIME WINDOW
        ----------------------------------------------------------------
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'skipped',
            'Outside execution window (23:00–04:30 IST)',
            (clock_timestamp() - _st)::text,
            NULL
        );
    END IF;

END;
$procedure$;