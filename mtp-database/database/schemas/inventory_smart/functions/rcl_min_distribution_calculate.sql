--liquibase formatted sql
--changeset akash.bhandari:inventory_smart_rcl_min_distribution_calculate runOnChange:true stripComments:false splitStatements:false context:initial labels:inventory_smart_rcl_min_distribution_calculate MTP-103848
--comment: Initial changeset for rcl_min_distribution_calculate function in inventory_smart schema
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_min_distribution_calculate(text, text, int4, jsonb);


CREATE OR REPLACE FUNCTION inventory_smart.rcl_min_distribution_calculate(p_distribution_type text, p_temp_table text, p_min integer, x_units_per_size jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_result json;
    v_query text;
BEGIN
    -- Handle different distribution types
    IF p_distribution_type = 'same_min' THEN
        ---------------------------------------------------------------------
        -- Same minimum for all sizes and stores
        -- Distribute the same `p_min` value across all (store, size) pairs
        -- Preserve consistent size order using first store’s size list
        ---------------------------------------------------------------------
        v_query := format(
            $sql$
            WITH size_order AS (
                SELECT ARRAY(
                    SELECT key
                    FROM %1$s t, LATERAL json_each_text(t.normalized_size_level_proportion)
                    WHERE t.store_code = (SELECT store_code FROM %1$s LIMIT 1)
                ) AS sizes
            ),
            expanded AS (
                SELECT 
                    store_code,
                    store_name,
                    key AS size
                FROM %1$s,
                    LATERAL json_each_text(normalized_size_level_proportion)
            ),
            final_alloc AS (
                SELECT 
                    store_code,
                    store_name,
                    size,
                    %s::int AS final_min
                FROM expanded
            )
            SELECT json_agg(store_data)
            FROM (
                SELECT 
                    store_code,
                    store_name,
                    json_object_agg(
                        size,
                        final_min
                        ORDER BY array_position((SELECT sizes FROM size_order), size)
                    ) AS normalized_size_level_proportion
                FROM final_alloc
                GROUP BY store_code, store_name
            ) store_data;
            $sql$,
            p_temp_table,
            p_min
        );

        RAISE NOTICE 'same_min final query: %', v_query;
        EXECUTE v_query INTO v_result;
        RETURN v_result;

    ELSIF p_distribution_type = 'equal_distribute' THEN
        ---------------------------------------------------------------------
        -- Equal distribute: split p_min equally, leftover based on profile
        ---------------------------------------------------------------------
        v_query := format(
            $sql$
            WITH size_order AS (
                SELECT ARRAY(
                    SELECT key
                    FROM %1$s t, LATERAL json_each_text(t.normalized_size_level_proportion)
                    WHERE t.store_code = (SELECT store_code FROM %1$s LIMIT 1)
                ) AS sizes
            ),
            expanded AS (
                SELECT 
                    store_code,
                    store_name,
                    key AS size,
                    (value::numeric) AS profile_val
                FROM %1$s, 
                     LATERAL json_each_text(normalized_size_level_proportion)
            ),
            size_count AS (
                SELECT store_code, COUNT(*) AS cnt
                FROM expanded
                GROUP BY store_code
            ),
            base_alloc AS (
                SELECT 
                    e.store_code,
                    e.store_name,
                    e.size,
                    e.profile_val,
                    floor(%s::numeric / sc.cnt)::int AS base_units,
                    (%s %% sc.cnt) AS leftover_per_store
                FROM expanded e
                JOIN size_count sc USING (store_code)
            ),
            distribute AS (
                SELECT
                    b.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY store_code
                        ORDER BY profile_val DESC, array_position((SELECT sizes FROM size_order), size)
                    ) AS rn
                FROM base_alloc b
            ),
            final_alloc AS (
                SELECT
                    store_code,
                    store_name,
                    size,
                    base_units +
                        CASE WHEN rn <= leftover_per_store THEN 1 ELSE 0 END AS final_min
                FROM distribute
            )
            SELECT json_agg(store_data)
            FROM (
                SELECT 
                    store_code,
                    store_name,
                    json_object_agg(
                        size, 
                        final_min 
                        ORDER BY array_position((SELECT sizes FROM size_order), size)
                    ) AS normalized_size_level_proportion
                FROM final_alloc
                GROUP BY store_code, store_name
            ) store_data;
            $sql$,
            p_temp_table,
            p_min,
            p_min
        );
        RAISE NOTICE 'equal_distribute final query: %', v_query;
        EXECUTE v_query INTO v_result;
        RETURN v_result;
    ELSIF p_distribution_type = 'product_profile' THEN
        /* ---------------------------------------------------------------------
         -- Handles product profile–based minimum distribution.
         -- If all sizes in a store have zero proportion, falls back to equal distribution.
         -- Updated: Preserves size order based on the first store in temp table.
         ---------------------------------------------------------------------
        */
        v_query := format(
            $sql$
            /* -----------------------------------------------------------------
               Step 0: Capture size order from one reference store
               -----------------------------------------------------------------
               - We take the size key order from the first store in temp table.
               - This ensures consistent ordering across all stores in output JSON.
            */
            WITH size_order AS (
                SELECT ARRAY(
                    SELECT key
                    FROM %1$s t, LATERAL json_each_text(t.normalized_size_level_proportion)
                    WHERE t.store_code = (SELECT store_code FROM %1$s LIMIT 1)
                ) AS sizes
            ),
            /* -----------------------------------------------------------------
               Step 1: Expand JSON into rows (one per store × size)
               -----------------------------------------------------------------
               - Convert JSON proportions into numeric values per size.
               - Each store will have multiple rows for each size.
            */
            expanded AS (
                SELECT 
                    store_code,
                    store_name,
                    key AS size,
                    (value::numeric) AS profile_val
                FROM %1$s,
                     LATERAL json_each_text(normalized_size_level_proportion)
            ),
            /* -----------------------------------------------------------------
               Step 2: Compute supporting aggregates
               -----------------------------------------------------------------
               - size_count → number of sizes per store
               - profile_sum → total proportion sum per store (to detect zero case)
            */
            size_count AS (
                SELECT store_code, COUNT(*) AS cnt
                FROM expanded
                GROUP BY store_code
            ),
            profile_sum AS (
                SELECT store_code, SUM(profile_val) AS total_profile
                FROM expanded
                GROUP BY store_code
            ),

            /* -----------------------------------------------------------------
               Step 3: Calculate base minimum units per size
               -----------------------------------------------------------------
               - If all proportions are zero (total_profile = 0):
                     → equally distribute p_min across all sizes.
               - Else:
                     → distribute according to product profile proportions.
            */
            base_calc AS (
                SELECT
                    e.store_code,
                    e.store_name,
                    e.size,
                    e.profile_val,
                    sc.cnt,
                    ps.total_profile,
                    CASE 
                        WHEN ps.total_profile = 0 THEN
                            %s::numeric / sc.cnt
                        ELSE
                            (%s::numeric * e.profile_val / ps.total_profile)
                    END AS raw_min
                FROM expanded e
                JOIN size_count sc USING (store_code)
                JOIN profile_sum ps USING (store_code)
            ),

            /* -----------------------------------------------------------------
               Step 4: Floor fractional units and capture remainders
               -----------------------------------------------------------------
               - Used to handle rounding while keeping total = p_min.
            */
            floored AS (
                SELECT 
                    store_code,
                    store_name,
                    size,
                    floor(raw_min)::int AS floored_min,
                    (raw_min - floor(raw_min)) AS remainder
                FROM base_calc
            ),

            /* -----------------------------------------------------------------
               Step 5: Rank sizes by remainder to distribute leftover units
               -----------------------------------------------------------------
               - Leftover = (p_min - total of floored_min)
               - Assign +1 to top sizes with highest remainder values.
            */
            distribute AS (
                SELECT 
                    f.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY store_code
                        ORDER BY remainder DESC, array_position((SELECT sizes FROM size_order), size)
                    ) AS rn,
                    SUM(floored_min) OVER (PARTITION BY store_code) AS total_floored
                FROM floored f
            ),

            /* -----------------------------------------------------------------
               Step 6: Finalize minimum units per size
               -----------------------------------------------------------------
               - Adds 1 unit to top-ranked sizes until total equals p_min.
            */
            final_alloc AS (
                SELECT
                    store_code,
                    store_name,
                    size,
                    floored_min +
                        CASE 
                            WHEN rn <= (%s - total_floored) THEN 1 ELSE 0
                        END AS final_min
                FROM distribute
            )

            /* -----------------------------------------------------------------
               Step 7: Re-aggregate results back into JSON per store
               Uses captured size_order.sizes for ordering
            */
            SELECT json_agg(store_data) 
            FROM (
                SELECT 
                    store_code,
                    store_name,
                    json_object_agg(
                        size, 
                        final_min 
                        ORDER BY array_position((SELECT sizes FROM size_order), size)
                    ) AS normalized_size_level_proportion
                FROM final_alloc
                GROUP BY store_code, store_name
            ) store_data;
            $sql$,
            p_temp_table,
            p_min,
            p_min,
            p_min
        );
        RAISE NOTICE 'product_profile_type final query: %', v_query;
        EXECUTE v_query INTO v_result;
        RETURN v_result;
        

    ELSIF p_distribution_type = 'x_units_per_size' THEN

        /* ---------------------------------------------------------------------
           Strictly assign given fixed units per size, and redistribute leftover units.
           - Normally leftover is distributed by product profile proportions.
           - If all profile proportions for a store are zero, fallback to equal distribution.
        --------------------------------------------------------------------- */
        v_query := format(
            $sql$
            /* -----------------------------------------------------------------
               Step 1: Parse given fixed units per size from input JSON.
               ----------------------------------------------------------------- */
            WITH size_order AS (
                SELECT ARRAY(
                    SELECT key
                    FROM %2$s t, LATERAL json_each_text(t.normalized_size_level_proportion)
                    WHERE t.store_code = (SELECT store_code FROM %2$s LIMIT 1)
                ) AS sizes
            ),
            given AS (
                SELECT 
                    key AS size,
                    (value::int) AS fixed_units
                FROM jsonb_each('%1$s'::jsonb)
            ),

            /* -----------------------------------------------------------------
               Step 2: Expand temp table JSON proportions per store and size.
               -----------------------------------------------------------------
               - Join each store’s size-level proportions with fixed units.
               - Compute product-profile–based raw_extra for remaining units.
            */
            expanded AS (
                SELECT 
                    t.store_code,
                    t.store_name,
                    g.size,
                    g.fixed_units,
                    (value::numeric) AS profile_val
                FROM %2$s t,
                     LATERAL json_each_text(t.normalized_size_level_proportion) j(key, value)
                     JOIN given g ON g.size = j.key
            ),

            /* -----------------------------------------------------------------
               Step 3: Compute total profile sum and count per store.
               -----------------------------------------------------------------
               - Detect stores where all proportions are zero.
            */
            store_stats AS (
                SELECT 
                    store_code,
                    COUNT(*) AS cnt,
                    SUM(profile_val) AS total_profile
                FROM expanded
                GROUP BY store_code
            ),

            /* -----------------------------------------------------------------
               Step 4: Compute base raw_extra (remaining units distributed).
               -----------------------------------------------------------------
               - If total_profile = 0 → equally distribute leftover units.
               - Else → distribute by product profile proportion.
            */
            base_calc AS (
                SELECT
                    e.store_code,
                    e.store_name,
                    e.size,
                    e.fixed_units,
                    s.cnt,
                    s.total_profile,
                    CASE 
                        WHEN s.total_profile = 0 THEN
                            GREATEST(%s - (SELECT SUM(fixed_units) FROM given), 0)::numeric / s.cnt
                        ELSE
                            (e.profile_val / s.total_profile) * 
                            GREATEST(%s - (SELECT SUM(fixed_units) FROM given), 0)
                    END AS raw_extra
                FROM expanded e
                JOIN store_stats s USING (store_code)
            ),

            /* -----------------------------------------------------------------
               Step 5: Floor fractional extras and capture remainder.
            */
            floored AS (
                SELECT 
                    store_code,
                    store_name,
                    size,
                    fixed_units,
                    floor(raw_extra)::int AS floored_extra,
                    (raw_extra - floor(raw_extra)) AS remainder
                FROM base_calc
            ),

            /* -----------------------------------------------------------------
               Step 6: Distribute leftover units greedily by remainder.
            */
            distribute AS (
                SELECT
                    f.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY store_code
                        ORDER BY remainder DESC, array_position((SELECT sizes FROM size_order), size)
                    ) AS rn,
                    SUM(floored_extra) OVER (PARTITION BY store_code) AS total_floored
                FROM floored f
            ),

            /* -----------------------------------------------------------------
               Step 7: Compute final minimum allocation per size.
            */
            final_alloc AS (
                SELECT
                    store_code,
                    store_name,
                    size,
                    fixed_units + floored_extra +
                        CASE 
                            WHEN rn <= (%s - (SELECT SUM(fixed_units) FROM given) - total_floored) 
                            THEN 1 ELSE 0 
                        END AS final_min
                FROM distribute
            )

            /* -----------------------------------------------------------------
               Step 8: Re-aggregate store-level JSON results.
            */
            SELECT json_agg(store_data) 
            FROM (
                SELECT 
                    store_code,
                    store_name,
                    json_object_agg(
                        size, 
                        final_min 
                        ORDER BY array_position((SELECT sizes FROM size_order), size)
                    ) AS normalized_size_level_proportion
                FROM final_alloc
                GROUP BY store_code, store_name
            ) store_data;
            $sql$,
            x_units_per_size::text,
            p_temp_table,
            p_min,
            p_min,
            p_min
        );

        RAISE NOTICE 'x_units_per_size final query: %', v_query;
        EXECUTE v_query INTO v_result;
        RETURN v_result;

    ELSE
        -- Invalid distribution type
        RAISE EXCEPTION 'Invalid distribution type: %', p_distribution_type;
    END IF;
END;
$function$
;
;

