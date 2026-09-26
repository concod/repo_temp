--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_product_final_prices_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_product_final_prices_v5

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_update_product_final_prices;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_update_product_final_prices(IN p_store_id character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE v_pivot_select_list TEXT;
v_update_set_list TEXT;
v_final_query TEXT;
start_time timestamp;
end_time timestamp;
BEGIN start_time := clock_timestamp();
-- 1. Build the dynamic list of columns for pivoting
SELECT string_agg(
        format(
            'MAX(CASE WHEN sm.segment_code = %L THEN final_price END) AS %I',
            segment_code,
            segment_code || '_price_final'
        ),
        ', '
    ) INTO v_pivot_select_list
FROM base_pricing_restaurant.bp_customer_segment_master;
-- 2. Build key-value pairs for jsonb_build_object
SELECT string_agg(
        format(
            '%L, %I',
            segment_code || '_price_final',
            segment_code || '_price_final'
        ),
        ', '
    ) INTO v_update_set_list
FROM base_pricing_restaurant.bp_customer_segment_master;
-- 3. Build final dynamic SQL
v_final_query := format(
    $QUERY$ WITH active_strategies AS (
        SELECT strategy_id
        FROM base_pricing_restaurant.bp_strategy_master
        WHERE strategy_status_id = 210
    ),
    segment_mapping AS (
        SELECT segment_id,
            segment_code,
            segment_name
        FROM base_pricing_restaurant.bp_customer_segment_master
    ),
    usable_products AS (
        SELECT product_id
        FROM base_pricing_restaurant.bp_product_master
        WHERE usable = TRUE
    ),
    final_prices_pivoted AS (
        SELECT prf.product_id,
            %s
        FROM (
                SELECT prf.product_id,
                    prf.segment_id,
                    CASE
                        WHEN SUM(prf.sales_units) = 0
                        OR SUM(prf.sales_units) IS NULL THEN AVG(prf.base_price)
                        ELSE SUM(prf.base_price * prf.sales_units) / SUM(prf.sales_units)
                    END AS final_price
                FROM base_pricing_restaurant.bp_price_reco_finalized_v2 prf
                    INNER JOIN active_strategies ast USING (strategy_id)
                    INNER JOIN usable_products up ON prf.product_id = up.product_id
                WHERE prf.store_id = %L
                GROUP BY prf.product_id,
                    prf.segment_id
            ) prf
            INNER JOIN segment_mapping sm ON sm.segment_id = prf.segment_id
        GROUP BY prf.product_id
    ),
    final_prices_jsonb AS (
        SELECT product_id,
            jsonb_build_object(%s) AS price_map
        FROM final_prices_pivoted
    ),
    updated_attributes AS (
        SELECT pam.product_id,
            jsonb_agg(
                CASE
                    WHEN elem.value->>'attribute_name' LIKE '%%_price_final'
                    AND fpj.price_map ? (elem.value->>'attribute_name') THEN jsonb_set(
                        elem.value,
                        '{attribute_value,current}',
                        fpj.price_map->(elem.value->>'attribute_name')
                    )
                    ELSE elem.value
                END
                ORDER BY elem.idx
            ) AS updated_attributes
        FROM base_pricing_restaurant.bp_product_attributes_mapping pam
            CROSS JOIN jsonb_array_elements(pam.attributes) WITH ORDINALITY AS elem(value, idx)
            INNER JOIN final_prices_jsonb fpj ON pam.product_id = fpj.product_id
        GROUP BY pam.product_id
    )
    UPDATE base_pricing_restaurant.bp_product_attributes_mapping pam
    SET attributes = ua.updated_attributes,
        updated_at = CURRENT_TIMESTAMP
    FROM updated_attributes ua
    WHERE pam.product_id = ua.product_id;
$QUERY$,
v_pivot_select_list,
p_store_id,
v_update_set_list
);
-- 4. Execute the final dynamic query
EXECUTE v_final_query;
end_time := clock_timestamp();
-- TIME tracking
INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking (
        strategy_id,
        procedure,
        start_date,
        end_date,
        time_taken
    )
VALUES (
        0,
        'sp_update_product_final_prices',
        start_time,
        end_time,
        end_time - start_time
    );
END;
$procedure$
;