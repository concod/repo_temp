--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_post_scenario_discount_insert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_post_scenario_discount_insert

DROP PROCEDURE if exists price_promo_opt.pc_opt_post_scenario_discount_insert;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_post_scenario_discount_insert(IN var_promo_id integer, IN arr_speed_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    var_start_date DATE;

    var_end_date DATE;

    var_week_start_date DATE;

    var_week_end_date DATE;

    query VARCHAR;

    table_suffix VARCHAR;

    var_opt_discount_type_id INTEGER;
    var_offer_type VARCHAR;
    var_offer_x_value FLOAT8;
    var_default_ia_json JSONB;
    var_default_fill_query VARCHAR;

BEGIN

-- Purpose: Updates promotion scenario discounts with optimized values from Gurobi output.
-- Example: CALL price_promo_opt.pc_opt_post_scenario_discount_insert(12345, ARRAY[1, 2]);
-- Other Functions Used:
--   * price_promo_opt.fn_get_promo_details - Retrieves promotion date information
--   * price_promo_opt.fn_get_rules_data - Gets promotion rule configurations
--   * price_promo.get_offer_description - Generates readable offer descriptions
-- Tables Used:
--   * price_promo.ps_scenario_discounts - Target table for discount updates
--   * price_promo.ia_ps_scenario_discounts - Temporary storage for scenario discounts
--   * public.gurobi_output_result_* - Optimization output from Gurobi engine
--   * price_promo_opt.master_valid_offers - Reference data for valid offer configurations
-- Returns: No direct return value; deletes existing scenario data and updates ps_scenario_discounts
--   with optimized offer configurations in the ia_recommended_data JSON field


    -- Generate a unique table suffix
    table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_speed_id, '_'));

    RAISE NOTICE 'time_1_%', clock_timestamp();

    -- ================================================================
    -- STEP 0: Reset ia_recommended_data to NULL for this promo
    -- ================================================================
    query := format(
        'UPDATE price_promo.ps_scenario_discounts_%s
         SET ia_recommended_data = NULL
         WHERE ia_recommended_data IS NOT NULL',
        var_promo_id
    );
    EXECUTE query;

    RAISE NOTICE 'time_1b_reset_done_%', clock_timestamp();

    -- ================================================================
    -- STEP 1: Materialize gurobi output into temp table with split
    --         integer keys and pre-built JSON (no lock on target table)
    -- ================================================================
    query := format(
        'DROP TABLE IF EXISTS pg_temp.temp_gurobi_ia;
         CREATE TEMP TABLE temp_gurobi_ia AS
         SELECT DISTINCT
             promo_id,
             split_part(TRIM(opt_level_bins::varchar), ''_'', 1)::int8 AS product_level_id,
             split_part(TRIM(opt_level_bins::varchar), ''_'', 2)::int4 AS store_level_id,
             split_part(TRIM(opt_level_bins::varchar), ''_'', 3)::int8 AS customer_level_id,
             jsonb_build_object(
                 ''0'', jsonb_build_object(
                     ''scenario_id'', 0,
                     ''created_at'', now(),
                     ''scenario_type'', ''ia_recommended'',
                     ''scenario_order_id'', 0,
                     ''offer_type_id'', opt_discount_type_id,
                     ''offer_type'', TRIM(offer_type),
                     ''offer_x_type'', TRIM(offer_x_type),
                     ''offer_x_value'', offer_x_value,
                     ''offer_y_type'', TRIM(offer_y_type),
                     ''offer_y_value'', offer_y_value,
                     ''offer_z_type'', TRIM(offer_z_type),
                     ''offer_z_value'', offer_z_value,
                     ''tier_id'', NULL,
                     ''offer_value'', price_promo.get_offer_description_v2(
                         TRIM(offer_type)::text, offer_x_value::numeric, TRIM(offer_x_type)::text,
                         offer_y_value::numeric, TRIM(offer_y_type)::text,
                         offer_z_value::numeric
                     )::text
                 )
             ) AS ia_recommended_data
         FROM public.gurobi_output_result_%s subq
         LEFT JOIN price_promo_opt.master_valid_offers mv
             USING(offer_identifier, offer_type)
         LEFT JOIN price_promo_opt.fn_get_rules_data(%s) rule_data
             USING (offer_type)',
        table_suffix, var_promo_id
    );
    RAISE NOTICE '%', query;
    EXECUTE query;

    RAISE NOTICE 'time_2_temp_table_created_%', clock_timestamp();

    -- ================================================================
    -- STEP 2: Index the temp table for fast join
    -- ================================================================
    CREATE INDEX ON pg_temp.temp_gurobi_ia (product_level_id, store_level_id, customer_level_id);

    RAISE NOTICE 'time_3_index_created_%', clock_timestamp();

    -- ================================================================
    -- STEP 3: UPDATE partition via integer-based join (index-friendly)
    -- ================================================================
    query := format(
        'UPDATE price_promo.ps_scenario_discounts_%s psd
         SET ia_recommended_data = t.ia_recommended_data
         FROM temp_gurobi_ia t
         WHERE psd.product_level_id = t.product_level_id
           AND psd.store_level_id = t.store_level_id
           AND COALESCE(psd.customer_level_id, 0) = t.customer_level_id',
        var_promo_id
    );
    RAISE NOTICE '%', query;
    EXECUTE query;

    RAISE NOTICE 'time_4_gurobi_update_done_%', clock_timestamp();

    -- ================================================================
    -- STEP 4: Fill remaining NULLs with default values from ps_rules
    --   17 → max_discount, 13 → min_discount, 14/15 → min_discount
    --   others → 0 (percent_off / 15)
    -- ================================================================
    SELECT
        CASE WHEN pr.opt_discount_type_id IN (13, 14, 15, 17) THEN pr.opt_discount_type_id ELSE 15 END,
        CASE WHEN pr.opt_discount_type_id IN (13, 14, 15, 17) THEN tasm.name ELSE 'percent_off' END,
        CASE
            WHEN pr.opt_discount_type_id = 17 THEN COALESCE(pr.max_discount, 0)
            WHEN pr.opt_discount_type_id = 13 THEN COALESCE(pr.min_discount, 0)
            WHEN pr.opt_discount_type_id IN (14, 15) THEN COALESCE(pr.min_discount, 0)
            ELSE 0
        END
    INTO var_opt_discount_type_id, var_offer_type, var_offer_x_value
    FROM price_promo.ps_rules pr
    LEFT JOIN metaschema.tb_app_sub_master tasm
        ON tasm.id = pr.opt_discount_type_id AND tasm.master_id = 2
    WHERE pr.promo_id = var_promo_id;

    -- Same JSON for all remaining NULL rows (no joins needed)
    var_default_ia_json := jsonb_build_object(
        '0', jsonb_build_object(
            'scenario_id', 0, 'scenario_name', NULL,
            'created_at', now(), 'scenario_type', 'ia_recommended',
            'scenario_order_id', 0,
            'offer_type_id', var_opt_discount_type_id,
            'offer_type', var_offer_type,
            'offer_value', NULL, 'offer_x_type', NULL,
            'offer_x_value', var_offer_x_value,
            'offer_y_type', NULL, 'offer_y_value', NULL,
            'offer_z_type', NULL, 'offer_z_value', NULL,
            'tier_id', NULL
        )
    );

    var_default_fill_query := format(
        'UPDATE price_promo.ps_scenario_discounts_%s
         SET ia_recommended_data = %L
         WHERE ia_recommended_data IS NULL',
        var_promo_id, var_default_ia_json::text
    );
    EXECUTE var_default_fill_query;

    -- Cleanup
    DROP TABLE IF EXISTS pg_temp.temp_gurobi_ia;

    RAISE NOTICE 'time_5_all_done_%', clock_timestamp();


END;

$procedure$
;
