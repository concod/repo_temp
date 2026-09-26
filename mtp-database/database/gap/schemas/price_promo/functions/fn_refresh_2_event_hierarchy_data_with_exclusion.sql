--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_refresh_2_event_hierarchy_data_with_exclusion runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_refresh_2_event_hierarchy_data_with_exclusion

DROP FUNCTION IF EXISTS price_promo.fn_refresh_2_event_hierarchy_data_with_exclusion;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_2_event_hierarchy_data_with_exclusion()
RETURNS TABLE (
    event_id integer,
    event_name text,
    created_by text,
    product_inclusion_type text,
    start_date date,
    end_date date,
    old_products_count integer,
    removed_products_count integer,
    added_products_count integer,
    final_products_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'price_promo.fn_refresh_2_event_hierarchy_data_with_exclusion';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _event_id integer;
    _eligible_event_ids integer[];
    _user_id integer;
    _date_buffer_x int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_x')::int;
    _date_buffer_y int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_y')::int;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN

    -- Temp table for old products
    CREATE TEMP TABLE IF NOT EXISTS tmp_old_event_products(event_id_old integer, product_id bigint) ON COMMIT DROP;

    -- Temp table for collecting results to sort later
    CREATE TEMP TABLE IF NOT EXISTS tmp_event_refresh_results(
        event_id integer,
        event_name text,
        created_by text,
        product_inclusion_type text,
        start_date date,
        end_date date,
        old_products_count integer,
        removed_products_count integer,
        added_products_count integer,
        final_products_count integer
    ) ON COMMIT DROP;

    -- Get all event_ids for product_group and whole_category and sitewide inclusion types
    SELECT 
        array_agg(em.event_id)
    INTO _eligible_event_ids
    FROM 
        price_promo.event_master em 
    WHERE 
        (
            em.product_exclusion_type IN ('product_group')
            OR
            em.product_inclusion_type NOT IN ('specific_products')
        )
        AND em.start_date > (date(timezone((SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone'), now())) + _date_buffer_x)
        AND em.start_date < (date(timezone((SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone'), now())) + _date_buffer_y);

    -- Track old products before refresh (for all affected events at once)
    INSERT INTO tmp_old_event_products (event_id_old, product_id)
    SELECT iep.event_id, iep.product_id
    FROM price_promo.event_product AS iep
    WHERE iep.event_id = ANY(COALESCE(_eligible_event_ids, ARRAY[]::integer[]));

    IF array_length(_eligible_event_ids, 1) > 0 THEN
        FOREACH _event_id IN ARRAY _eligible_event_ids LOOP
            _user_id := (SELECT em.created_by FROM price_promo.event_master AS em WHERE em.event_id = _event_id);
            PERFORM price_promo.fn_save_event_final_hierarchy(_event_id, _user_id);
            PERFORM price_promo.fn_save_event_final_products(_event_id, _user_id);
        END LOOP;
    END IF;

    -- Calculate deleted and added products for all events at once (comparing old vs new from event_product table)
    INSERT INTO tmp_event_refresh_results
    WITH old_counts AS (
        SELECT 
            tmp_old.event_id_old AS event_id,
            count(*)::int AS old_count
        FROM tmp_old_event_products tmp_old
        GROUP BY tmp_old.event_id_old
    ),
    new_counts AS (
        SELECT 
            ep.event_id,
            count(*)::int AS new_count
        FROM price_promo.event_product ep
        WHERE ep.event_id = ANY(COALESCE(_eligible_event_ids, ARRAY[]::integer[]))
        GROUP BY ep.event_id
    ),
    intersection_counts AS (
        SELECT 
            tmp_old.event_id_old AS event_id,
            count(*)::int AS intersection_count
        FROM tmp_old_event_products tmp_old
        JOIN price_promo.event_product ep 
            ON ep.event_id = tmp_old.event_id_old 
            AND ep.product_id = tmp_old.product_id
        GROUP BY tmp_old.event_id_old
    ),
    all_event_ids AS (
        SELECT unnest(COALESCE(_eligible_event_ids, ARRAY[]::integer[])) AS event_id
    )
    SELECT
        em.event_id::integer,
        em.name::text AS event_name,
        um.user_name::text AS created_by,
        em.product_inclusion_type::text,
        em.start_date::date,
        em.end_date::date,
        COALESCE(oc.old_count, 0)::integer AS old_products_count,
        (COALESCE(oc.old_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS removed_products_count,
        (COALESCE(nc.new_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS added_products_count,
        COALESCE(nc.new_count, 0)::integer AS final_products_count
    FROM all_event_ids ae
    JOIN price_promo.event_master em ON em.event_id = ae.event_id
    LEFT JOIN global.user_master um ON um.user_code = em.created_by
    LEFT JOIN old_counts oc ON oc.event_id = ae.event_id
    LEFT JOIN new_counts nc ON nc.event_id = ae.event_id
    LEFT JOIN intersection_counts ic ON ic.event_id = ae.event_id;

    -- Return results sorted: most changes first (removed + added), then by event_id
    RETURN QUERY
    SELECT * FROM tmp_event_refresh_results terr
    ORDER BY 
        (COALESCE(terr.removed_products_count, 0) + COALESCE(terr.added_products_count, 0)) DESC,
        terr.event_id;

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
