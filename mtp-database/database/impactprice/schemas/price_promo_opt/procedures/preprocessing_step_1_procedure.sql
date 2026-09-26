--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:preprocessing_step_1_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for preprocessing_step_1_procedure

DROP PROCEDURE if exists price_promo_opt.preprocessing_step_1_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.preprocessing_step_1_procedure(IN var_promo_id integer, IN var_speed_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    offer_type text;
    psd_kit_id int4;
    psd_bxgy_id int4;
    psd_tier_id int4;
    query text;
    sql_kit text;
    sql_bxgy text;
    sql_tier text;
    sql_normal text;
    table_name text := format('preprocessing_step_1_%s_%s', var_promo_id, var_speed_id);
BEGIN

    RAISE NOTICE 'preprocessing_step_1: Before enable_nestloop=%', current_setting('enable_nestloop', true);
    PERFORM set_config('enable_nestloop', 'off', true);
    RAISE NOTICE 'preprocessing_step_1: enable_nestloop=%', current_setting('enable_nestloop', true);

    -- fetch offer_type from ia_recommended_data (preprocessing always uses ia_recommended_data)
    SELECT ia_recommended_data->>'offer_type'
    INTO offer_type
    FROM price_promo.ps_scenario_discounts
    WHERE promo_id = var_promo_id;

    -- fetch kit_offer_id (if any) - from ia_recommended_data
    SELECT (ia_recommended_data->>'kit_offer_id')::int
    INTO psd_kit_id
    FROM price_promo.ps_scenario_discounts
    WHERE promo_id = var_promo_id;

    -- fetch bxgy_offer_id (if any)
    SELECT (ia_recommended_data->>'bxgy_offer_id')::int
    INTO psd_bxgy_id
    FROM price_promo.ps_scenario_discounts
    WHERE promo_id = var_promo_id;

    -- fetch tier_offer_id (if any)
    SELECT (ia_recommended_data->>'tier_id')::int
    INTO psd_tier_id
    FROM price_promo.ps_scenario_discounts
    WHERE promo_id = var_promo_id;

    ------------------------------------------------------------
    -- KIT OFFER
    ------------------------------------------------------------
    sql_kit := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

        WITH kit_data AS (
            SELECT
                tko.promo_id,
                %s AS scenario_id,
                74 AS offer_type_id,
                'kit_offer' AS offer_type,
                tkot.kit_offer_type_id,
                tkoup.product_id,
                tkou.unit_name,
                tkou.units_count,
                tko.discount_value,
                pdm.promo_base_price AS current_price,
                pdm.cost
            FROM price_promo.tb_kit_offer tko
            JOIN price_promo.tb_kit_offer_type tkot ON tko.kit_offer_type_id = tkot.kit_offer_type_id
            JOIN price_promo.tb_kit_offer_units tkou ON tko.kit_offer_id = tkou.kit_offer_id
            JOIN price_promo.tb_kit_offer_unit_products tkoup ON tkou.kit_offer_units_id = tkoup.kit_offer_units_id
            JOIN price_promo.product_master pdm ON tkoup.product_id = pdm.product_id
            WHERE tko.promo_id = %s
              AND tko.kit_offer_id = %s
        ),
        kit_disc AS (
            SELECT *, (calculated_discount1 / max_slot_price) * 100 AS calculated_discount
            FROM (
                SELECT *, discount_value * max_slot_price / SUM(max_slot_price) OVER () AS calculated_discount1
                FROM (
                    SELECT fd.unit_name,
                           MAX(units_count) * MAX(current_price) AS max_slot_price,
                           MAX(discount_value) AS discount_value
                    FROM kit_data fd
                    GROUP BY fd.unit_name
                ) foo
            ) foo2
        ),
        final_cte AS (
            SELECT
                fd.*,
                CASE
                    WHEN fd.kit_offer_type_id = 1 THEN fd.discount_value
                    WHEN fd.kit_offer_type_id = 2 THEN kd.calculated_discount
                    WHEN fd.kit_offer_type_id = 3 THEN 100 - kd.calculated_discount
                    ELSE 35
                END AS calculated_discount
            FROM kit_data fd
            INNER JOIN kit_disc kd ON fd.unit_name = kd.unit_name
        )

        SELECT
            promo_id, product_id,
            l0_id::integer AS l0_id, l0_cid, l1_cid, l3_cid,
            round(promo_base_price::numeric,2) AS msrp,
            round(promo_base_price::numeric,2) AS current_price,
            cost, promo_duration, product_selection_type,
            hierarchy_level_id, customer_type,
            round(promo_base_price::numeric,2) AS avg_current_price,
            product_discount_level_id, currency_id,
            offer_type_id, kit_offer_type_id, offer_type,
            unit_name, units_count,
            calculated_discount AS calculated_discount_sf
        FROM (
            SELECT
                pp.promo_id, pp.product_id,
                l0_id::integer AS l0_id, l0_cid, l1_cid, pdm.l3_cid,
                round(pdm.cost::numeric,2) AS cost,
                prm.promo_duration, product_selection_type,
                hierarchy_level_id, customer_type,
                product_discount_level_id, pdm.currency_id,
                pdm.promo_base_price AS promo_base_price,
                kt.offer_type_id, kt.offer_type,
                kt.kit_offer_type_id, kt.unit_name,
                kt.units_count, kt.calculated_discount
            FROM (
                SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration
                FROM price_promo.promo_master
                WHERE promo_id = %s
            ) prm
            LEFT JOIN (
                SELECT promo_id,
                       MIN(CASE WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id ELSE 0 END) AS hierarchy_level_id
                FROM (
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_promo_pg_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                    UNION ALL
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_product_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                ) AS combined_data
                GROUP BY promo_id
            ) prh USING(promo_id)
            INNER JOIN price_promo.fn_fetch_products_for_promo(%s) pp USING(promo_id)
            INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            LEFT JOIN (
                SELECT promo_id,
                       CASE WHEN (SELECT MIN(x) FROM unnest(product_discount_level) AS x) >= 1 THEN 1 ELSE NULL END AS product_discount_level_id
                FROM price_promo.ps_rules
            ) pphl USING(promo_id)
            INNER JOIN final_cte kt ON pdm.product_id = kt.product_id
        ) sub_que;
    $fmt$
    , table_name, table_name,
      var_speed_id, var_promo_id, psd_kit_id,
      var_promo_id, var_promo_id, var_promo_id, var_promo_id
    );

    ------------------------------------------------------------
    -- BXGY OFFER
    ------------------------------------------------------------
    sql_bxgy := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

        WITH bxgy_data AS (
            SELECT
                tbxgyo.promo_id,
                %s AS scenario_id,
                75 AS offer_type_id,
                'bxgy_offer' AS offer_type,
                tbxgyot.bxgy_offer_type_id,
                tbxgyup.product_id,
                tbxgyu.unit_name,
                tbxgyu.units_count,
                tbxgyo.discount_value,
                pdm.promo_base_price AS current_price,
                pdm.cost
            FROM price_promo.tb_bxgy_offer tbxgyo
            JOIN price_promo.tb_bxgy_offer_type tbxgyot ON tbxgyo.bxgy_offer_type_id = tbxgyot.bxgy_offer_type_id
            JOIN price_promo.tb_bxgy_offer_units tbxgyu ON tbxgyo.bxgy_offer_id = tbxgyu.bxgy_offer_id
            JOIN price_promo.tb_bxgy_offer_unit_products tbxgyup ON tbxgyu.bxgy_offer_units_id = tbxgyup.bxgy_offer_units_id
            JOIN price_promo.product_master pdm ON tbxgyup.product_id = pdm.product_id
            WHERE tbxgyo.promo_id = %s
              AND tbxgyo.bxgy_offer_id = %s
        ),
        bxgy_disc AS (
            SELECT *, (calculated_discount1 / max_slot_price) * 100 AS calculated_discount
            FROM (
                SELECT *, discount_value * max_slot_price / SUM(max_slot_price) OVER () AS calculated_discount1
                FROM (
                    SELECT bxgyd.unit_name,
                           MAX(units_count) * MAX(current_price) AS max_slot_price,
                           MAX(discount_value) AS discount_value
                    FROM bxgy_data bxgyd
                    GROUP BY bxgyd.unit_name
                ) bxgyoo
            ) bxgyoo2
        ),
        final_cte AS (
            SELECT
                bxgyd.*,
                CASE
                    WHEN bxgyd.bxgy_offer_type_id = 1 AND bxgyd.unit_name = 'X' THEN 0
                    WHEN bxgyd.bxgy_offer_type_id = 2 AND bxgyd.unit_name = 'X' THEN 0
                    WHEN bxgyd.bxgy_offer_type_id = 1 AND bxgyd.unit_name = 'Y' THEN 100
                    WHEN bxgyd.bxgy_offer_type_id = 2 AND bxgyd.unit_name = 'Y' THEN bxgyd.discount_value
                    ELSE 0
                END AS calculated_discount
            FROM bxgy_data bxgyd
        )

        SELECT
            promo_id, product_id,
            l0_id::integer AS l0_id, l0_cid, l1_cid, l3_cid,
            round(promo_base_price::numeric,2) AS msrp,
            round(promo_base_price::numeric,2) AS current_price,
            cost, promo_duration, product_selection_type,
            hierarchy_level_id, customer_type,
            round(promo_base_price::numeric,2) AS avg_current_price,
            product_discount_level_id, currency_id,
            new_product_flag,
            offer_type_id, bxgy_offer_type_id, offer_type,
            unit_name, units_count,
            calculated_discount AS calculated_discount_sf
        FROM (
            SELECT
                pp.promo_id, pp.product_id,
                l0_id::integer AS l0_id, l0_cid, l1_cid, pdm.l3_cid,
                round(pdm.cost::numeric,2) AS cost,
                prm.promo_duration, product_selection_type,
                hierarchy_level_id, customer_type,
                product_discount_level_id, pdm.currency_id,
                pdm.new_product_flag,
                pdm.promo_base_price AS promo_base_price,
                kt.offer_type_id, kt.offer_type,
                kt.bxgy_offer_type_id, kt.unit_name,
                kt.units_count, kt.calculated_discount
            FROM (
                SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration
                FROM price_promo.promo_master
                WHERE promo_id = %s
            ) prm
            LEFT JOIN (
                SELECT promo_id,
                       MIN(CASE WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id ELSE 0 END) AS hierarchy_level_id
                FROM (
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_promo_pg_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                    UNION ALL
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_product_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                ) AS combined_data
                GROUP BY promo_id
            ) prh USING(promo_id)
            INNER JOIN price_promo.fn_fetch_products_for_promo(%s) pp USING(promo_id)
            INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            LEFT JOIN (
                SELECT promo_id,
                       CASE WHEN (SELECT MIN(x) FROM unnest(product_discount_level) AS x) >= 1 THEN 1 ELSE NULL END AS product_discount_level_id
                FROM price_promo.ps_rules
            ) pphl USING(promo_id)
            INNER JOIN final_cte kt ON pdm.product_id = kt.product_id
        ) sub_que;
    $fmt$
    , table_name, table_name,
      var_speed_id, var_promo_id, psd_bxgy_id,
      var_promo_id, var_promo_id, var_promo_id, var_promo_id
    );

    ------------------------------------------------------------
    -- Tier OFFER
    ------------------------------------------------------------
    sql_tier := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

        WITH tier_data AS (
            SELECT
                pp.promo_id,
                %s AS scenario_id,
                77 AS offer_type_id,
                'tiered_offer' AS offer_type,
                pp.product_id,
                LEAST(
                    GREATEST(
                    (SELECT
                        COALESCE(
                            (SUM(td.offer_x_value * td.offer_y_value) FILTER (
                                WHERE td.offer_x_type = 'dollar' AND td.offer_y_type = 'percent_off' AND td.offer_z_type IS NULL
                            ) * 0.01)
                            / NULLIF(SUM(td.offer_x_value) FILTER (
                                WHERE td.offer_x_type = 'dollar' AND td.offer_y_type = 'percent_off' AND td.offer_z_type IS NULL
                            ), 0)
                        , 0) * 100
                        +
                        COALESCE(
                            (SUM(td.offer_y_value) FILTER (
                                WHERE td.offer_x_type = 'dollar' AND td.offer_y_type = 'dollar_off' AND td.offer_z_type IS NULL
                            ))
                            / NULLIF(SUM(td.offer_x_value) FILTER (
                                WHERE td.offer_x_type = 'dollar' AND td.offer_y_type = 'dollar_off' AND td.offer_z_type IS NULL
                            ), 0)
                        , 0) * 100
                        +
                        COALESCE(
                            (1.0 / NULLIF(COUNT(*) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'unit' AND td.offer_z_type IS NULL
                            ), 0))
                            * SUM(td.offer_y_value::float / NULLIF(td.offer_x_value + td.offer_y_value, 0)) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'unit' AND td.offer_z_type IS NULL
                            )
                        , 0) * 100
                        +
                        COALESCE(
                            (1.0 / NULLIF(COUNT(*) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'unit' AND td.offer_z_type = 'percent_off'
                            ), 0))
                            * SUM(td.offer_y_value * td.offer_z_value * 0.01 / NULLIF(td.offer_x_value + td.offer_y_value, 0)) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'unit' AND td.offer_z_type = 'percent_off'
                            )
                        , 0) * 100
                        +
                        COALESCE(AVG(td.offer_y_value) FILTER (
                            WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'percent_off' AND td.offer_z_type IS NULL
                        ), 0)
                        +
                        COALESCE(
                            (SUM(td.offer_y_value) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'dollar_off' AND td.offer_z_type IS NULL
                            ))
                            / NULLIF(current_price * SUM(td.offer_x_value) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'dollar_off' AND td.offer_z_type IS NULL
                            )::numeric, 0)
                        , 0) * 100
                        +
                        COALESCE(
                            (SUM(td.offer_x_value * current_price) - SUM(td.offer_y_value) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'at_dollar' AND td.offer_z_type IS NULL
                            ))
                            / NULLIF(SUM(td.offer_x_value * current_price) FILTER (
                                WHERE td.offer_x_type = 'unit' AND td.offer_y_type = 'at_dollar' AND td.offer_z_type IS NULL
                            ), 0) * 100
                        , 0)
                        AS calculated_discount
                        FROM price_promo.tier_discounts td
                        WHERE td.tier_id = %s)
                    , 0)
                , 100) AS calculated_discount
            FROM (
                SELECT pp.promo_id, pp.product_id, pdm.promo_base_price AS current_price
                FROM price_promo.promo_product_%s pp
                INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            ) pp
        )

        SELECT
            promo_id, product_id,
            l0_id::integer AS l0_id, l0_cid, l1_cid, l3_cid,
            round(promo_base_price::numeric,2) AS msrp,
            round(promo_base_price::numeric,2) AS current_price,
            cost, promo_duration, product_selection_type,
            hierarchy_level_id, customer_type,
            round(promo_base_price::numeric,2) AS avg_current_price,
            product_discount_level_id, currency_id,
            new_product_flag,
            offer_type_id AS tier_offer_type_id, offer_type,
            calculated_discount AS calculated_discount_sf
        FROM (
            SELECT
                pp.promo_id, pp.product_id,
                l0_id::integer AS l0_id, l0_cid, l1_cid, pdm.l3_cid,
                round(pdm.cost::numeric,2) AS cost,
                prm.promo_duration, product_selection_type,
                hierarchy_level_id, customer_type,
                product_discount_level_id, pdm.currency_id,
                pdm.new_product_flag,
                pdm.promo_base_price AS promo_base_price,
                kt.offer_type_id, kt.offer_type,
                kt.calculated_discount
            FROM (
                SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration
                FROM price_promo.promo_master
                WHERE promo_id = %s
            ) prm
            LEFT JOIN (
                SELECT promo_id,
                       MIN(CASE WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id ELSE 0 END) AS hierarchy_level_id
                FROM (
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_promo_pg_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                    UNION ALL
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_product_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                ) AS combined_data
                GROUP BY promo_id
            ) prh USING(promo_id)
            INNER JOIN price_promo.fn_fetch_products_for_promo(%s) pp USING(promo_id)
            INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            LEFT JOIN (
                SELECT promo_id,
                       CASE WHEN (SELECT MIN(x) FROM unnest(product_discount_level) AS x) >= 1 THEN 1 ELSE NULL END AS product_discount_level_id
                FROM price_promo.ps_rules
            ) pphl USING(promo_id)
            INNER JOIN tier_data kt ON pdm.product_id = kt.product_id
        ) sub_que;
    $fmt$
    , table_name, table_name,
      var_speed_id, psd_tier_id, var_promo_id,
      var_promo_id, var_promo_id, var_promo_id, var_promo_id
    );

    ------------------------------------------------------------
    -- Normal OFFER
    ------------------------------------------------------------
    sql_normal := format($fmt$
        DROP TABLE IF EXISTS price_promo_opt_temp.%I;
        CREATE UNLOGGED TABLE price_promo_opt_temp.%I AS

        SELECT
            promo_id, product_id,
            l0_id::integer AS l0_id, l0_cid, l1_cid, l3_cid,
            round(promo_base_price::numeric,2) AS msrp,
            round(promo_base_price::numeric,2) AS current_price,
            cost, promo_duration, product_selection_type,
            hierarchy_level_id, customer_type,
            round(promo_base_price::numeric,2) AS avg_current_price,
            product_discount_level_id, currency_id,
            new_product_flag
        FROM (
            SELECT
                pp.promo_id, pp.product_id,
                l0_id::integer AS l0_id, l0_cid, l1_cid, pdm.l3_cid,
                round(pdm.cost::numeric,2) AS cost,
                prm.promo_duration, product_selection_type,
                hierarchy_level_id, customer_type,
                product_discount_level_id, pdm.currency_id,
                pdm.new_product_flag,
                pdm.promo_base_price AS promo_base_price
            FROM (
                SELECT *, LEAST(end_date - start_date + 1, 42) AS promo_duration
                FROM price_promo.promo_master
                WHERE promo_id = %s
            ) prm
            LEFT JOIN (
                SELECT promo_id,
                       MIN(CASE WHEN min_hierarchy_level_id >= 0 THEN max_hierarchy_level_id ELSE 0 END) AS hierarchy_level_id
                FROM (
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_promo_pg_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                    UNION ALL
                    SELECT promo_id, MIN(hierarchy_level_id) AS min_hierarchy_level_id, MAX(hierarchy_level_id) AS max_hierarchy_level_id
                    FROM price_promo.included_product_hierarchy
                    WHERE promo_id = %s AND hierarchy_level_id <> -2
                    GROUP BY promo_id
                ) AS combined_data
                GROUP BY promo_id
            ) prh USING(promo_id)
            INNER JOIN price_promo.fn_fetch_products_for_promo(%s) pp USING(promo_id)
            INNER JOIN price_promo.product_master pdm ON pp.product_id = pdm.product_id
            LEFT JOIN (
                SELECT promo_id,
                       CASE WHEN (SELECT MIN(x) FROM unnest(product_discount_level) AS x) >= 1 THEN 1 ELSE NULL END AS product_discount_level_id
                FROM price_promo.ps_rules
            ) pphl USING(promo_id)
        ) sub_que;
    $fmt$
    , table_name, table_name,
      var_promo_id, var_promo_id, var_promo_id, var_promo_id
    );

    -- Choose which SQL to run
    IF offer_type = 'kit_offer' THEN
        IF psd_kit_id IS NULL THEN
            RAISE EXCEPTION 'kit_offer but no kit_offer_id found for promo_id=%', var_promo_id;
        END IF;
        query := sql_kit;
    ELSIF offer_type = 'bxgy_offer' THEN
        IF psd_bxgy_id IS NULL THEN
            RAISE EXCEPTION 'bxgy_offer but no bxgy_offer_id found for promo_id=%', var_promo_id;
        END IF;
        query := sql_bxgy;
    ELSIF offer_type = 'tiered_offer' THEN
        IF psd_tier_id IS NULL THEN
            RAISE EXCEPTION 'tiered_offer but no tier_id found for promo_id=%', var_promo_id;
        END IF;
        query := sql_tier;
    ELSE
        query := sql_normal;
    END IF;

    RAISE NOTICE 'preprocessing_step_1: query=%', query;
    EXECUTE query;
    RAISE NOTICE 'preprocessing_step_1: Table price_promo_opt_temp.% created', table_name;

END;
$procedure$
;
