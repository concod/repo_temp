--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_product_final_prices_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_update_product_final_prices_v1

DROP PROCEDURE IF EXISTS base_pricing.sp_update_product_final_prices;

CREATE OR REPLACE PROCEDURE base_pricing.sp_update_product_final_prices(IN p_store_id character varying)
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    v_pivot_select_list TEXT;
    v_update_set_list TEXT;
    v_final_query TEXT;
BEGIN
    -- 1. Build the dynamic list of columns for the pivot table
    --    (e.g., "MAX(CASE WHEN sm.segment_code = 'residential' THEN final_price END) AS residential_price_final, ...")
    SELECT string_agg(
               format('MAX(CASE WHEN sm.segment_code = %L THEN final_price END) AS %I',
                      segment_code, segment_code || '_price_final'),
               ', '
           )
    INTO v_pivot_select_list
    FROM base_pricing.bp_customer_segment_master;

    -- 2. Build the dynamic list of assignments for the UPDATE statement
    --    (e.g., "residential_price_final = fp.residential_price_final, c1_price_final = fp.c1_price_final, ...")
    SELECT string_agg(
               format('%I = fp.%I',
                      segment_code || '_price_final', segment_code || '_price_final'),
               ', '
           )
    INTO v_update_set_list
    FROM base_pricing.bp_customer_segment_master;

    -- 3. Construct the final query using format() to safely inject parameters and dynamic SQL strings
    --    %s = simple substitution (for dynamic SQL strings)
    --    %L = literal, quotes the p_store_id parameter to prevent SQL injection
    --    %I = identifier, for column names
    v_final_query := format(
$QUERY$
WITH
-- Get all active strategies (status_id is hardcoded to 210)
active_strategies AS (
    SELECT strategy_id
    FROM base_pricing.bp_strategy_master
    WHERE strategy_status_id = 210
),

-- Get all customer segments
segment_mapping AS (
    SELECT segment_id, segment_code, segment_name
    FROM base_pricing.bp_customer_segment_master
),

-- Get only usable products
usable_products AS (
    SELECT product_id
    FROM base_pricing.bp_product_master
    WHERE usable = TRUE
),

-- Compute weighted average final prices per product & segment, and pivot directly
final_prices_pivoted AS (
    SELECT
        prf.product_id,
        %s -- Injects the dynamic v_pivot_select_list
    FROM (
        SELECT
            prf.product_id,
            prf.segment_id,
            CASE
                WHEN SUM(prf.sales_units) = 0 OR SUM(prf.sales_units) IS NULL
                    THEN AVG(prf.base_price)
                ELSE SUM(prf.base_price * prf.sales_units) / SUM(prf.sales_units)
            END AS final_price
        FROM base_pricing.bp_price_reco_finalized_v2 prf
        INNER JOIN active_strategies ast USING (strategy_id)
        INNER JOIN usable_products up ON prf.product_id = up.product_id
        WHERE prf.store_id = %L -- p_store_id (safely quoted)
        GROUP BY prf.product_id, prf.segment_id
    ) prf
    INNER JOIN segment_mapping sm ON sm.segment_id = prf.segment_id
    GROUP BY prf.product_id
)

-- Update bp_product_attributes with final prices
UPDATE base_pricing.bp_product_attributes pa
SET
    %s -- Injects the dynamic v_update_set_list
FROM final_prices_pivoted fp
WHERE pa.product_id = fp.product_id;
$QUERY$,
        v_pivot_select_list,   -- 1st %s (final_prices_pivoted SELECT)
        p_store_id,            -- 1st %L (prf.store_id)
        v_update_set_list      -- 2nd %s (UPDATE SET)
    );

    -- 4. Execute the fully constructed dynamic query
    EXECUTE v_final_query;

END;
$procedure$
;