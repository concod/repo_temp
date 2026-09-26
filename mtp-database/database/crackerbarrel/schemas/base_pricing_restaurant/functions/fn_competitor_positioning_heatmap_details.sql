--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_competitor_positioning_heatmap_details stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_competitor_positioning_heatmap_details

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_competitor_positioning_heatmap_details;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_competitor_positioning_heatmap_details(p_segment_id integer DEFAULT 10001)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    mv_sql TEXT;
    channel_lvl_id INT;
    channel_col TEXT;
    v_competitor_columns TEXT;
    v_lateral_values TEXT;
    psam_select_clause_1 TEXT;
    psam_select_clause_2 TEXT;
    psam_select_clause_3 TEXT;
    psam_select_clause_4 TEXT;
    price_column TEXT;
    cost_column TEXT;
BEGIN
   RAISE NOTICE 'Starting optimized dynamic Heatmap Details...';
   
   -- Find the hierarchy level id for 'Channel'
   SELECT store_hierarchy_level_id
   INTO channel_lvl_id
   FROM base_pricing_restaurant.bp_store_hierarchy_level
   WHERE store_hierarchy_level_value = 'Channel'
   LIMIT 1;
   
   -- Fallback to s0_name if not found
   IF channel_lvl_id IS NULL THEN
       channel_col := 's0_name';
       RAISE NOTICE 'Channel hierarchy level not found. Falling back to %', channel_col;
   ELSE
       channel_col := format('s%s_name', channel_lvl_id);
       RAISE NOTICE 'Using column % for channel', channel_col;
   END IF;
   
   -- Build competitor columns for base_data selection
   SELECT STRING_AGG(database_column, ', ')
   INTO v_competitor_columns
   FROM base_pricing_restaurant.bp_competitor_attributes_metadata
   WHERE is_active = true
     AND database_column IS NOT NULL
     AND database_column != '';

   -- Build VALUES clause for CROSS JOIN LATERAL (optimized unpivoting)
   SELECT STRING_AGG(
       format('(%L, bd.%I)', database_column, database_column),
       ', '
   )
   INTO v_lateral_values
   FROM base_pricing_restaurant.bp_competitor_attributes_metadata
   WHERE is_active = true
     AND database_column IS NOT NULL
     AND database_column != '';

   -- Get dynamic price and cost column names
   SELECT 
       MAX(CASE WHEN attribute_name = 'price' THEN database_column END),
       MAX(CASE WHEN attribute_name = 'total_cost' THEN database_column END)
   INTO price_column, cost_column
   FROM base_pricing_restaurant.bp_product_store_attributes_metadata
   WHERE is_active = true
     AND attribute_name IN ('price', 'total_cost');

   -- Fallbacks
   price_column := COALESCE(price_column, 'attribute_4');
   cost_column := COALESCE(cost_column, 'attribute_3');
   
   RAISE NOTICE 'Using price column: %, cost column: %', price_column, cost_column;

   -- Build attribute select clauses dynamically
   SELECT
        STRING_AGG(
            format('COALESCE(psam.%I, 0) AS %I', database_column, database_column),
            ', '
        ),
        STRING_AGG(
            format('bd.%I', database_column),
            ', '
        ),
        STRING_AGG(
            format('pc.%I', database_column),
            ', '
        ),
        STRING_AGG(
            format('final_joined_data.%I', database_column),
            ', '
        )
   INTO
        psam_select_clause_1,
        psam_select_clause_2,
        psam_select_clause_3,
        psam_select_clause_4
   FROM base_pricing_restaurant.bp_product_store_attributes_metadata
   WHERE is_active = true
     AND database_column IS NOT NULL
     AND attribute_name IN ('total_cost', 'price');

   -- Set defaults
   psam_select_clause_1 := COALESCE(psam_select_clause_1, '');
   psam_select_clause_2 := COALESCE(psam_select_clause_2, '');
   psam_select_clause_3 := COALESCE(psam_select_clause_3, '');
   psam_select_clause_4 := COALESCE(psam_select_clause_4, '');

   -- Drop existing materialized view
   EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS base_pricing_restaurant.mv_competitor_positioning_heatmap_details CASCADE;';
   
   -- Build optimized CREATE MATERIALIZED VIEW DDL
   mv_sql := format($sql$
   CREATE MATERIALIZED VIEW base_pricing_restaurant.mv_competitor_positioning_heatmap_details
   TABLESPACE pg_default
   AS
   WITH
       segment_lookup AS (
           SELECT
               bcsm.segment_id,
               bcsm.segment_name
           FROM base_pricing_restaurant.bp_customer_segment_master bcsm
           WHERE bcsm.segment_id = %s
       ),
       base_data AS (
           SELECT
               psam.product_id,
               psam.store_id,
               sl.segment_id,
               sl.segment_name,
			   psam.price_zone,
               psam.effective_price_zone,
               %s,  -- psam_select_clause_1 (price, cost)
               %s   -- competitor_columns
           FROM
               base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
           INNER JOIN segment_lookup sl
               ON sl.segment_id = psam.segment_id::integer  -- ✅ Type cast fix
           WHERE
               psam.attribute_10 <> 'N'
               AND psam.%I IS NOT NULL  -- ✅ Filter null prices early
               AND psam.%I > 0          -- ✅ Filter zero prices early
       ),
       unpivoted_competitors AS (
           SELECT
               bd.product_id,
               bd.store_id,
               bd.segment_id,
               bd.segment_name,
			   bd.price_zone,
               bd.effective_price_zone,
               %s,  -- psam_select_clause_2
               bcam.attribute_name AS competitor_name,
               bcam.frontend_display_name AS competitor_display_name,
               comp.competitor_price
           FROM
               base_data bd
           CROSS JOIN LATERAL (  -- ✅ Optimized unpivoting
               VALUES %s
           ) AS comp(col_name, competitor_price)
           INNER JOIN base_pricing_restaurant.bp_competitor_attributes_metadata bcam
               ON bcam.database_column = comp.col_name
               AND bcam.is_active = true
           WHERE comp.competitor_price IS NOT NULL  -- ✅ Single filter instead of CASE
       ),
       competitor_pricing_with_percentage AS (
           SELECT
               uc.*,
               CASE
                   WHEN uc.competitor_price = 0
                       THEN NULL::double precision
                   ELSE abs((uc.%I - uc.competitor_price) / uc.competitor_price * 100)::double precision
               END AS price_difference_percent,
			   CASE
					WHEN uc.competitor_price = 0
						THEN NULL::double precision
					ELSE (uc.%I - uc.competitor_price)::double precision
			   END AS price_difference,
               CASE
                   WHEN uc.competitor_price = 0
                       THEN 'No Data'::text
                   WHEN uc.%I > uc.competitor_price
                       THEN 'Higher'::text
                   WHEN uc.%I < uc.competitor_price
                       THEN 'Lower'::text
                   ELSE 'Similar'::text
               END AS price_category
           FROM unpivoted_competitors uc
       ),
       bucket_config AS (
           SELECT 
               max(max_range) AS infinity_threshold,
               direction,
               category,
               min_range,
               max_range
           FROM base_pricing_restaurant.bp_price_bucket_details
           GROUP BY direction, category, min_range, max_range
       ),
       competitor_pricing AS (
           SELECT
               cpwp.product_id,
               cpwp.store_id,
               cpwp.segment_id,
               cpwp.segment_name,
			   cpwp.price_zone,
               cpwp.effective_price_zone,
               cpwp.%I AS %I,  -- cost_column
               cpwp.%I AS %I,  -- price_column
               cpwp.competitor_name,
               cpwp.competitor_display_name,
               cpwp.competitor_price,
               cpwp.price_difference_percent,
			   cpwp.price_difference,
               cpwp.price_category,
               CASE
                    WHEN cpwp.price_difference_percent IS NULL
                        THEN 'No Data'
                    WHEN cpwp.price_category = 'Similar'
                        THEN 'Similar Price'
                    ELSE COALESCE((
                           SELECT pbd.category
                           FROM
                               base_pricing_restaurant.bp_price_bucket_details pbd
                               CROSS JOIN bucket_config bc
                           WHERE
                               upper(TRIM(BOTH FROM pbd.direction)) = upper(cpwp.price_category)
                               AND cpwp.price_difference_percent BETWEEN pbd.min_range AND pbd.max_range
                               AND (pbd.max_range >= 999 OR pbd.min_range <= pbd.max_range)
                           ORDER BY pbd.min_range
                           LIMIT 1
                   ), 'Unknown Range')
                END AS price_bucket
           FROM competitor_pricing_with_percentage cpwp
           LEFT JOIN bucket_config pbd  -- ✅ Optimized with LEFT JOIN
               ON upper(TRIM(pbd.direction)) = upper(cpwp.price_category)
               AND cpwp.price_difference_percent BETWEEN pbd.min_range AND pbd.max_range
               AND cpwp.price_category NOT IN ('Similar', 'No Data')
       ),
       bp_reco AS (
           SELECT
               bprf.product_id,
               bprf.store_ids,
               bprf.segment_id::integer AS segment_id,  -- ✅ Cast for consistency
               bprf.strategy_id,
               bprf.product_name,
               bprf.channel,
               bprf.start_date,
               bprf.end_date,
               bsm.strategy_name,
               ssl.strategy_status_display_name,
               ssl.strategy_status_id,
               bsm.updated_at
           FROM
               base_pricing_restaurant.bp_price_reco_finalized_v2 bprf
               INNER JOIN segment_lookup sl
                   ON sl.segment_id = bprf.segment_id::integer  -- ✅ Type cast fix
               INNER JOIN base_pricing_restaurant.bp_strategy_master bsm
                   ON bsm.strategy_id = bprf.strategy_id
               INNER JOIN base_pricing_restaurant.bp_strategy_status_level ssl
                   ON bsm.strategy_status_id = ssl.strategy_status_id
           WHERE
               CURRENT_DATE BETWEEN bprf.start_date AND bprf.end_date
               AND ssl.strategy_status_id = 200
       ),
       product_attributes AS (
           SELECT
               bpam.product_id,
               COALESCE(
                   (SELECT elem #>> '{attribute_value,current}'  -- ✅ Cleaner extraction
                    FROM jsonb_array_elements(bpam.attributes) elem
                    WHERE elem ->> 'attribute_name' = 'line_group'
                    LIMIT 1),
                   bpam.product_id::text
               ) AS line_group
           FROM base_pricing_restaurant.bp_product_attributes_mapping bpam
       ),
       transaction_data AS (
           SELECT
               btda.product_id,
               btda.store_id,
               btda.retail_unit_price,
               btda.sales_units
           FROM
               base_pricing_restaurant.bp_transaction_data_agg btda
               INNER JOIN segment_lookup sl 
                   ON sl.segment_id = btda.segment_id::integer  -- ✅ Type cast fix
       ),
       final_joined_data AS (
           SELECT
               pc.product_id,
               pc.store_id,
               pc.segment_id,
               pc.segment_name,
			   pc.price_zone,
               pc.effective_price_zone,
               %s,  -- psam_select_clause_3
               pc.competitor_price,
               pc.competitor_name,
               pc.competitor_display_name,
               pc.price_difference_percent,
			   pc.price_difference,
               pc.price_bucket,
               bsm.%I AS channel,
               bpm.product_name,
               br.strategy_id,
               br.strategy_name,
               ROUND(td.retail_unit_price::numeric, 2) AS historical_price,
               COALESCE(ROUND(td.sales_units::numeric, 2), 0) AS sales_volume,
               CASE
                   WHEN br.start_date IS NOT NULL AND br.end_date IS NOT NULL
                       THEN daterange(br.start_date, br.end_date, '[]')
                   ELSE NULL::daterange
               END AS date_range,
               COALESCE(NULLIF(pa.line_group, ''), pc.product_id::text) AS line_group_computed,
               COALESCE(NULLIF(pc.price_zone::text, ''), pc.store_id::text) AS price_zone_computed,
               br.strategy_status_display_name
           FROM
               competitor_pricing pc
               INNER JOIN base_pricing_restaurant.bp_store_master bsm
                   ON pc.store_id = bsm.store_id
               LEFT JOIN product_attributes pa
                   ON pc.product_id = pa.product_id
               LEFT JOIN base_pricing_restaurant.bp_product_master bpm
                   ON pc.product_id = bpm.product_id AND bpm.active = true
               LEFT JOIN transaction_data td
                   ON pc.product_id = td.product_id AND pc.store_id = td.store_id
               LEFT JOIN bp_reco br
                   ON pc.product_id = br.product_id 
                   AND pc.store_id = ANY(br.store_ids)  -- ✅ Type cast fix
       )
   SELECT
       final_joined_data.product_id,
       final_joined_data.store_id,
       final_joined_data.segment_id,
       final_joined_data.segment_name,
       final_joined_data.effective_price_zone,
       %s,  -- psam_select_clause_4
       final_joined_data.competitor_display_name AS competitor,
       final_joined_data.competitor_price,
       final_joined_data.price_difference_percent,
	   final_joined_data.price_difference,
       final_joined_data.price_bucket,
       final_joined_data.channel,
       final_joined_data.product_name,
       final_joined_data.strategy_id,
       final_joined_data.historical_price,
       final_joined_data.sales_volume,
       final_joined_data.date_range,
       final_joined_data.strategy_name,
       final_joined_data.line_group_computed,
       final_joined_data.price_zone_computed,
       final_joined_data.strategy_status_display_name AS strategy_status
   FROM final_joined_data
   WITH DATA;
   $sql$,
   p_segment_id,           -- %s 1: segment_lookup
   psam_select_clause_1,   -- %s 2: price/cost columns
   v_competitor_columns,   -- %s 3: competitor columns in base_data
   price_column,           -- %I 4: price column for NULL filter
   price_column,           -- %I 5: price column for > 0 filter
   psam_select_clause_2,   -- %s 6: price/cost in unpivoted
   v_lateral_values,       -- %s 7: VALUES for LATERAL
   price_column,           -- %I 8: price in percentage calc
   price_column,
   price_column,           -- %I 9: price in Higher comparison
   price_column,           -- %I 10: price in Lower comparison
   cost_column,            -- %I 11: cost_column in SELECT
   cost_column,            -- %I 12: cost_column alias
   price_column,           -- %I 13: price_column in SELECT
   price_column,           -- %I 14: price_column alias
   psam_select_clause_3,   -- %s 15: price/cost in final_joined
   channel_col,            -- %I 16: channel column
   psam_select_clause_4    -- %s 17: final SELECT clause
   );
   
   -- Execute creation
   EXECUTE mv_sql;
   
   RAISE NOTICE 'Creating indexes on materialized view...';
   
   -- Create optimized indexes
   EXECUTE 'CREATE INDEX idx_mv_heatmap_details_product_store 
            ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details(product_id, store_id);';
   
   EXECUTE 'CREATE INDEX idx_mv_heatmap_details_competitor 
            ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details(competitor);';
   
   EXECUTE 'CREATE INDEX idx_mv_heatmap_details_price_bucket 
            ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details(price_bucket);';
   
   EXECUTE 'CREATE INDEX idx_mv_heatmap_details_zones 
            ON base_pricing_restaurant.mv_competitor_positioning_heatmap_details(price_zone_computed, line_group_computed);';
   
   RAISE NOTICE 'Materialized view and indexes created successfully in % ms', 
                clock_timestamp() - statement_timestamp();
END;
$function$
;