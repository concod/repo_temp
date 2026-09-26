--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_refresh_1_product_group_products_data_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_refresh_1_product_group_products_data - sorted results with changed PGs first

DROP FUNCTION IF EXISTS pricesmart.fn_refresh_1_product_group_products_data;

CREATE OR REPLACE FUNCTION pricesmart.fn_refresh_1_product_group_products_data()
RETURNS TABLE (
    pg_id integer,
    pg_name text,
    created_by text,
    old_products_count integer,
    removed_products_count integer,
    added_products_count integer,
    final_products_count integer,
    description text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS
$function$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'pricesmart.fn_refresh_1_product_group_products_data';
    _log_step varchar;
    _st timestamp := clock_timestamp();
    _pg_ids integer[];
    _pg_id integer;
    old_products_count_var integer;
    new_products integer[];
    new_products_count_var integer;
    removed_products_count_var integer;
    added_products_count_var integer;
BEGIN
    -- logging start
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name',  _sp_name,  true);

    -- get all active PGs
    SELECT array_agg(tpg.pg_id) INTO _pg_ids
    FROM pricesmart.tb_product_group AS tpg
    WHERE tpg.pg_grouping_type = 1 AND tpg.is_deleted = 0;

    IF array_length(_pg_ids, 1) IS NULL THEN
        RETURN;
    END IF;

    -- build temp hierarchy once
    CALL pricesmart.pc_build_temp_pg_user_selected_hierarchies_table(_pg_ids);

    -- temp table for old products
    CREATE TEMP TABLE IF NOT EXISTS tmp_old_pg_products(pg_id_old integer, product_id integer) ON COMMIT DROP;
    CREATE TEMP TABLE IF NOT EXISTS tmp_pg_refresh_results(
        pg_id integer,
        pg_name text,
        created_by text,
        old_products_count integer,
        removed_products_count integer,
        added_products_count integer,
        final_products_count integer,
        description text
    ) ON COMMIT DROP;

    FOREACH _pg_id IN ARRAY _pg_ids LOOP
        DELETE FROM tmp_old_pg_products
        WHERE pg_id_old = _pg_id;

        INSERT INTO tmp_old_pg_products (pg_id_old, product_id)
        SELECT old_pp.pg_id, old_pp.product_id
        FROM pricesmart.tb_pg_product AS old_pp
        WHERE old_pp.pg_id = _pg_id;

        SELECT count(*)::int
        INTO old_products_count_var
        FROM tmp_old_pg_products AS tmp_old
        WHERE tmp_old.pg_id_old = _pg_id;

        new_products := pricesmart.fn_get_updated_products_for_pg(_pg_id);
        new_products_count_var := COALESCE(array_length(new_products, 1), 0);

        DELETE FROM pricesmart.tb_pg_product AS del_pp
        WHERE del_pp.pg_id = _pg_id;

        IF new_products_count_var > 0 THEN
            INSERT INTO pricesmart.tb_pg_product (pg_id, product_id)
            SELECT _pg_id AS pg_id, unnest(new_products) AS product_id;
        END IF;

        WITH old_products_set AS (
            SELECT tmp_old.product_id
            FROM   tmp_old_pg_products AS tmp_old
            WHERE  tmp_old.pg_id_old = _pg_id
        ),
        new_products_set AS (
            SELECT unnest(new_products) AS product_id
        ),
        intersection_set AS (
            SELECT count(*)::int AS intersection_count
            FROM old_products_set old_prod
            JOIN new_products_set new_prod
            USING (product_id)
        )
        SELECT
            old_products_count_var - intersection_set.intersection_count,
            new_products_count_var - intersection_set.intersection_count
        INTO
            removed_products_count_var,
            added_products_count_var
        FROM intersection_set;

        UPDATE pricesmart.tb_product_group AS tpg
        SET products_count = new_products_count_var
        WHERE tpg.pg_id = _pg_id;

        INSERT INTO tmp_pg_refresh_results
        SELECT
            tpg.pg_id::integer, 
            tpg.pg_name::text, 
            um.user_name::text, 
            old_products_count_var::integer, 
            removed_products_count_var::integer, 
            added_products_count_var::integer, 
            new_products_count_var::integer,
            tpg.description::text
        FROM pricesmart.tb_product_group AS tpg
        LEFT JOIN global.user_master AS um
        ON um.user_code = tpg.created_by
        WHERE tpg.pg_id = _pg_id;
    END LOOP;

    -- Return results sorted: changed PGs first, then unchanged
    RETURN QUERY
    SELECT * FROM tmp_pg_refresh_results tprr
    ORDER BY 
        CASE WHEN tprr.removed_products_count > 0 OR tprr.added_products_count > 0 THEN 0 ELSE 1 END,
        tprr.pg_id;

    -- logging end
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'end',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            _log_step,
            SQLERRM,
            (clock_timestamp() - _st)::text,
            NULL
        );
        RAISE EXCEPTION 'Error occurred in the function: %', SQLERRM;
END;
$function$;

