--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_refresh_2_promo_hierarchy_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_refresh_2_promo_hierarchy_data - configurable with sorted results

DROP FUNCTION IF EXISTS price_promo.fn_refresh_2_promo_hierarchy_data;

CREATE OR REPLACE FUNCTION price_promo.fn_refresh_2_promo_hierarchy_data()
RETURNS TABLE (
    promo_id integer,
    promo_name text,
    start_date date,
    end_date date,
    created_by text,
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
    _sp_name varchar := 'price_promo.fn_refresh_2_promo_hierarchy_data';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _promo_id integer;
    _eligible_promo_ids integer[];
    _date_buffer_x int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_x')::int;
    _date_buffer_y int := price_promo.fn_get_configuration_value('promo','scenario_data_refresh_date_buffer_y')::int;
    _eligible_promo_status_for_promo_refresh jsonb := price_promo.fn_get_configuration_value('promo','eligible_promo_status_for_promo_refresh')::jsonb;
    _user_id integer;
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN

    -- Temp table for old products
    CREATE TEMP TABLE IF NOT EXISTS tmp_old_promo_products(promo_id_old integer, product_id bigint) ON COMMIT DROP;

    -- Temp table for collecting results to sort later
    CREATE TEMP TABLE IF NOT EXISTS tmp_promo_refresh_results(
        promo_id integer,
        promo_name text,
        start_date date,
        end_date date,
        created_by_name text,
        old_products_count integer,
        removed_products_count integer,
        added_products_count integer,
        final_products_count integer
    ) ON COMMIT DROP;

    -- Get all promo_ids for product_group and whole_category and sitewide selection types
    SELECT
        array_agg(pm.promo_id)
    INTO _eligible_promo_ids
    FROM
        price_promo.promo_master pm
        JOIN price_promo.product_selection_type_config pstc ON pstc.id = pm.product_selection_type
    WHERE
        (
            pm.exclusion_selection_type = (select id from price_promo.product_selection_type_config pstc where pstc.product_selection_type = 'product_group') --product_group exclusion
            OR
            pstc.product_selection_type NOT IN ('specific_products')
        )
        AND pm.status <> 6
        AND pm.end_date >= current_date
        AND pm.status IN (
            SELECT jsonb_array_elements_text(_eligible_promo_status_for_promo_refresh)::int
        )
        AND pm.start_date > (date(timezone((SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone'), now())) + _date_buffer_x)
        AND pm.start_date < (date(timezone((SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone'), now())) + _date_buffer_y);

    -- Track old products before refresh (for all affected promos at once)
    INSERT INTO tmp_old_promo_products (promo_id_old, product_id)
    SELECT pp.promo_id, pp.product_id
    FROM price_promo.promo_product AS pp
    WHERE pp.promo_id = ANY(COALESCE(_eligible_promo_ids, ARRAY[]::integer[]));

    -- Updating final hierarchy and final product set
    IF array_length(_eligible_promo_ids, 1) > 0 THEN
        FOREACH _promo_id IN ARRAY _eligible_promo_ids LOOP
            _user_id := (SELECT pm.created_by FROM price_promo.promo_master AS pm WHERE pm.promo_id = _promo_id);
            PERFORM price_promo.fn_save_promo_final_hierarchy(_promo_id, _user_id);
            PERFORM price_promo.fn_save_promo_final_products(_promo_id, _user_id);
        END LOOP;

        EXECUTE format('
            WITH count_cte AS (
                SELECT promo_id, count(product_id) AS product_count FROM price_promo.promo_product
                WHERE promo_id IN (%1$s)
                GROUP BY promo_id
            )
            UPDATE price_promo.promo_master A SET products_count = B.product_count FROM count_cte B WHERE A.promo_id = B.promo_id;',
            array_to_string(_eligible_promo_ids, ',')
        );

        PERFORM price_promo.fn_refresh_promos_scenario_data(_eligible_promo_ids);
    END IF;

    -- Calculate deleted and added products for all promos at once (comparing old vs new from promo_product table)
    INSERT INTO tmp_promo_refresh_results
    WITH old_counts AS (
        SELECT 
            tmp_old.promo_id_old AS promo_id,
            count(*)::int AS old_count
        FROM tmp_old_promo_products tmp_old
        GROUP BY tmp_old.promo_id_old
    ),
    new_counts AS (
        SELECT 
            pp.promo_id,
            count(*)::int AS new_count
        FROM price_promo.promo_product pp
        WHERE pp.promo_id = ANY(COALESCE(_eligible_promo_ids, ARRAY[]::integer[]))
        GROUP BY pp.promo_id
    ),
    intersection_counts AS (
        SELECT 
            tmp_old.promo_id_old AS promo_id,
            count(*)::int AS intersection_count
        FROM tmp_old_promo_products tmp_old
        JOIN price_promo.promo_product pp 
            ON pp.promo_id = tmp_old.promo_id_old 
            AND pp.product_id = tmp_old.product_id
        GROUP BY tmp_old.promo_id_old
    ),
    all_promo_ids AS (
        SELECT unnest(COALESCE(_eligible_promo_ids, ARRAY[]::integer[])) AS promo_id
    )
    SELECT
        pm.promo_id::integer,
        pm.name::text AS promo_name,
        pm.start_date::date,
        pm.end_date::date,
        um.user_name::text AS created_by_name,
        COALESCE(oc.old_count, 0)::integer AS old_products_count,
        (COALESCE(oc.old_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS removed_products_count,
        (COALESCE(nc.new_count, 0) - COALESCE(ic.intersection_count, 0))::integer AS added_products_count,
        COALESCE(nc.new_count, 0)::integer AS final_products_count
    FROM all_promo_ids ap
    JOIN price_promo.promo_master pm ON pm.promo_id = ap.promo_id
    LEFT JOIN global.user_master um ON um.user_code = pm.created_by
    LEFT JOIN old_counts oc ON oc.promo_id = ap.promo_id
    LEFT JOIN new_counts nc ON nc.promo_id = ap.promo_id
    LEFT JOIN intersection_counts ic ON ic.promo_id = ap.promo_id;

    -- Return results sorted: most changes first (removed + added), then by promo_id
    RETURN QUERY
    SELECT * FROM tmp_promo_refresh_results tprr
    ORDER BY
        (COALESCE(tprr.removed_products_count, 0) + COALESCE(tprr.added_products_count, 0)) DESC,
        tprr.promo_id;

    CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    RETURN;

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
            RAISE EXCEPTION 'Error occurred in the function: %', SQLERRM;
    END;
END;
$function$;
