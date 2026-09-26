--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_refresh_3_promo_store_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_refresh_3_promo_store_data

DROP FUNCTION IF EXISTS price_promo.fn_refresh_3_promo_store_data;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_3_promo_store_data()
RETURNS TABLE (
    promo_id integer,
    promo_name text,
    created_by text,
    start_date date,
    end_date date,
    old_stores_count integer,
    removed_stores_count integer,
    added_stores_count integer,
    final_stores_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'price_promo.fn_refresh_3_promo_store_data';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _promo_id integer;
    _all_stores_promo_ids integer[];
    _bnm_or_ecom_promo_ids integer[];
    new_stores integer[];
    _date_buffer_x int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_x')::int;
    _date_buffer_y int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_y')::int;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN

    -- Temp table for old stores
    CREATE TEMP TABLE IF NOT EXISTS tmp_old_promo_stores(promo_id_old integer, store_id integer) ON COMMIT DROP;

    -- Temp table for collecting results to sort later
    CREATE TEMP TABLE IF NOT EXISTS tmp_promo_store_refresh_results(
        promo_id integer,
        promo_name text,
        created_by text,
        start_date date,
        end_date date,
        old_stores_count integer,
        removed_stores_count integer,
        added_stores_count integer,
        final_stores_count integer
    ) ON COMMIT DROP;

    -- ALL STORES SELECTION TYPE CASES - START
    SELECT 
        array_agg(pm.promo_id) INTO _all_stores_promo_ids
    FROM 
        price_promo.promo_master pm
    WHERE 
        pm.store_selection_type = (SELECT id FROM price_promo.store_selection_type_config sstc WHERE sstc.store_selection_type = 'all_stores')
    AND pm.start_date > (date(timezone((SELECT config_value FROM price_promo.tb_tool_configurations WHERE config_name = 'client_timezone'), now())) + _date_buffer_x)
    AND pm.start_date < (date(timezone((SELECT config_value FROM price_promo.tb_tool_configurations WHERE config_name = 'client_timezone'), now())) + _date_buffer_y);

    RAISE NOTICE '_all_stores_promo_ids : %', _all_stores_promo_ids;

    IF array_length(_all_stores_promo_ids, 1) > 0 THEN
        FOREACH _promo_id IN ARRAY _all_stores_promo_ids LOOP
            new_stores := NULL::integer[];

            -- Track old stores before refresh
            DELETE FROM tmp_old_promo_stores WHERE promo_id_old = _promo_id;

            INSERT INTO tmp_old_promo_stores (promo_id_old, store_id)
            SELECT ps.promo_id, ps.store_id
            FROM price_promo.promo_store AS ps
            WHERE ps.promo_id = _promo_id;

            SELECT array_agg(sm.store_id) INTO new_stores
            FROM pricesmart.tb_store_master sm
            WHERE sm.is_active = 1;

            RAISE NOTICE 'promo_id: %, calculated_stores (all_stores): %', _promo_id, COALESCE(array_length(new_stores, 1), 0);
            PERFORM price_promo.fn_refresh_promo_stores(_promo_id, new_stores);
        END LOOP;
    END IF;

    -- ALL STORES SELECTION TYPE CASES - END

    -- BNM OR ECOM STORES SELECTION TYPE CASES - START
    SELECT 
        array_agg(pm.promo_id) INTO _bnm_or_ecom_promo_ids
    FROM 
        price_promo.promo_master pm 
    WHERE 
        pm.store_selection_type IN (SELECT id FROM price_promo.store_selection_type_config sstc WHERE sstc.store_selection_type IN ('bnm_stores', 'ecom_stores'))
    AND pm.start_date > (date(timezone((SELECT config_value FROM price_promo.tb_tool_configurations WHERE config_name = 'client_timezone'), now())) + _date_buffer_x)
    AND pm.start_date < (date(timezone((SELECT config_value FROM price_promo.tb_tool_configurations WHERE config_name = 'client_timezone'), now())) + _date_buffer_y);

    RAISE NOTICE '_bnm_or_ecom_promo_ids : %', _bnm_or_ecom_promo_ids;

    -- Build temp hierarchy table once for all bnm_or_ecom promos (configurable approach)
    IF array_length(_bnm_or_ecom_promo_ids, 1) > 0 THEN
        CALL price_promo.pc_build_temp_store_user_selected_hierarchies_table(_bnm_or_ecom_promo_ids,TRUE);

        -- Update store data for each promo
        FOREACH _promo_id IN ARRAY _bnm_or_ecom_promo_ids LOOP
            -- Track old stores before refresh
            DELETE FROM tmp_old_promo_stores WHERE promo_id_old = _promo_id;

            INSERT INTO tmp_old_promo_stores (promo_id_old, store_id)
            SELECT ps.promo_id, ps.store_id
            FROM price_promo.promo_store AS ps
            WHERE ps.promo_id = _promo_id;

            new_stores := NULL::integer[];
            new_stores := price_promo.fn_get_updated_stores(_promo_id);

            RAISE NOTICE 'promo_id: %, calculated_stores: %', _promo_id, COALESCE(array_length(new_stores, 1), 0);
            PERFORM price_promo.fn_refresh_promo_stores(_promo_id, new_stores);
        END LOOP;
    END IF;

    -- BNM OR ECOM STORES SELECTION TYPE CASES - END

    -- Calculate deleted and added stores for all promos at once (comparing old vs new from promo_store table)
    INSERT INTO tmp_promo_store_refresh_results
    WITH old_counts AS (
        SELECT 
            tmp_old.promo_id_old AS promo_id,
            count(*)::int AS old_count
        FROM tmp_old_promo_stores tmp_old
        GROUP BY tmp_old.promo_id_old
    ),
    new_counts AS (
        SELECT 
            ps.promo_id,
            count(*)::int AS new_count
        FROM price_promo.promo_store ps
        WHERE ps.promo_id = ANY(
            COALESCE(_all_stores_promo_ids, ARRAY[]::integer[]) || 
            COALESCE(_bnm_or_ecom_promo_ids, ARRAY[]::integer[])
        )
        GROUP BY ps.promo_id
    ),
    intersection_counts AS (
        SELECT 
            tmp_old.promo_id_old AS promo_id,
            count(*)::int AS intersection_count
        FROM tmp_old_promo_stores tmp_old
        JOIN price_promo.promo_store ps 
            ON ps.promo_id = tmp_old.promo_id_old 
            AND ps.store_id = tmp_old.store_id
        GROUP BY tmp_old.promo_id_old
    ),
    all_promo_ids AS (
        SELECT unnest(COALESCE(_all_stores_promo_ids, ARRAY[]::integer[])) AS promo_id
        UNION
        SELECT unnest(COALESCE(_bnm_or_ecom_promo_ids, ARRAY[]::integer[])) AS promo_id
    )
    SELECT
        pm.promo_id::integer,
        pm.name::text AS promo_name,
        um.user_name::text AS created_by,
        pm.start_date::date,
        pm.end_date::date,
        COALESCE(oc.old_count, 0)::integer AS old_stores_count,
        (COALESCE(oc.old_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS removed_stores_count,
        (COALESCE(nc.new_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS added_stores_count,
        COALESCE(nc.new_count, 0)::integer AS final_stores_count
    FROM all_promo_ids ap
    JOIN price_promo.promo_master pm ON pm.promo_id = ap.promo_id
    LEFT JOIN global.user_master um ON um.user_code = pm.created_by
    LEFT JOIN old_counts oc ON oc.promo_id = ap.promo_id
    LEFT JOIN new_counts nc ON nc.promo_id = ap.promo_id
    LEFT JOIN intersection_counts ic ON ic.promo_id = ap.promo_id;

    -- Return results sorted: most changes first (removed + added), then by promo_id
    RETURN QUERY
    SELECT * FROM tmp_promo_store_refresh_results tpsrr
    ORDER BY 
        (COALESCE(tpsrr.removed_stores_count, 0) + COALESCE(tpsrr.added_stores_count, 0)) DESC,
        tpsrr.promo_id;

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    RETURN;

    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error if an exception occurs during any part of the function
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the function: %', SQLERRM;
    END;
END;
$function$;
