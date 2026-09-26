--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_competitor_positioning_heatmap stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_competitor_positioning_heatmap

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_competitor_positioning_heatmap;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_competitor_positioning_heatmap(p_segment_id integer DEFAULT 10001)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Dynamic SQL components
	v_lateral_values TEXT;
    v_competitor_columns TEXT;
	price_column TEXT;
    psam_select_clause_1 TEXT;
    psam_select_clause_2 TEXT;
    psam_select_clause_3 TEXT;
	psam_select_clause_4 TEXT;
	psam_select_clause_5 TEXT;
    v_sql_query TEXT;
    v_mv_name TEXT;
BEGIN
    -- Generate materialized view name
    v_mv_name := 'mv_competitor_positioning_heatmap';

    -- Build competitor columns dynamically from metadata
    SELECT 
        STRING_AGG(database_column, ', ')
    INTO 
        v_competitor_columns
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
       MAX(CASE WHEN attribute_name = 'price' THEN database_column END)
   INTO price_column
   FROM base_pricing_restaurant.bp_product_store_attributes_metadata
   WHERE is_active = true
     AND attribute_name IN ('price');

	-- Build product_store_attributes SQL column dynamically
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
            format('uc.%I', database_column),
            ', '
        ),
		STRING_AGG(
            format('cpwp.%I', database_column),
            ', '
        ),
		STRING_AGG(
            format('cp.%I', database_column),
            ', '
        )
   INTO
        psam_select_clause_1,
        psam_select_clause_2,
        psam_select_clause_3,
		psam_select_clause_4,
		psam_select_clause_5
   FROM base_pricing_restaurant.bp_product_store_attributes_metadata
   WHERE is_active = true
     AND database_column IS NOT NULL
     AND attribute_name IN ('price');


    -- Construct the materialized view creation SQL
    v_sql_query := format(
        $fmt$
        CREATE MATERIALIZED VIEW base_pricing_restaurant.%I AS
        WITH base_data AS (
            SELECT
                psam.product_id,
                psam.store_id,
                %s, --psam_select_clause_1
                %s
            FROM
                base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
            WHERE
                psam.segment_id = %s
                AND psam.attribute_10 <> 'N' --eligibility
        ),
		bucket_config AS (
		    SELECT
		        max(bp_price_bucket_details.max_range) AS infinity_threshold
		    FROM base_pricing_restaurant.bp_price_bucket_details
		),
		unpivoted_competitors AS (
           SELECT
               bd.product_id,
               bd.store_id,
               %s,  -- psam_select_clause_2
               bcam.attribute_name AS competitor_name,
               bcam.frontend_display_name AS competitor_display_name,
               comp.competitor_price
           FROM
               base_data bd
           CROSS JOIN LATERAL (
               VALUES %s
           ) AS comp(col_name, competitor_price) -- v_lateral_values
           INNER JOIN base_pricing_restaurant.bp_competitor_attributes_metadata bcam
               ON bcam.database_column = comp.col_name
               AND bcam.is_active = true
           WHERE comp.competitor_price IS NOT NULL
       	),
		competitor_pricing_with_percentage AS (
		    SELECT
		        uc.product_id,
		        uc.store_id,
		        %s, -- psam_select_clause_3
		        uc.competitor_price,
		        uc.competitor_name,
		        uc.competitor_display_name,
		        CASE
		            WHEN uc.competitor_price IS NULL OR uc.competitor_price = 0 THEN NULL::double PRECISION
                   	ELSE abs((%s - uc.competitor_price) / uc.competitor_price * 100)::double precision -- price
		        END AS price_difference_percent,
		        CASE
		            WHEN uc.competitor_price IS NULL OR uc.competitor_price = 0::double PRECISION
		                THEN 'No Data'
		            WHEN %s > uc.competitor_price -- price
		                THEN 'Higher'
		            WHEN %s < uc.competitor_price -- price
		                THEN 'Lower'
		            ELSE 'Similar'
		        END AS price_category
		    FROM unpivoted_competitors uc
		),
		competitor_pricing AS (
            SELECT
                cpwp.product_id,
                cpwp.store_id,
                %s, -- psam_select_clause_4
                cpwp.competitor_price,
                cpwp.competitor_name,
                cpwp.competitor_display_name,
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
        )
        SELECT
		    cp.product_id,
		    cp.store_id,
		    %s, --psam_select_clause_5
		    cp.competitor_price,
		    cp.competitor_name,
		    cp.competitor_display_name,
		    cp.price_bucket
		FROM competitor_pricing cp
        $fmt$,
        v_mv_name,               	-- %I for materialized view name (FIRST placeholder)
		psam_select_clause_1,
		v_competitor_columns,    	-- %s for competitor columns
		p_segment_id,            	-- %s for segment_id in base_data
		psam_select_clause_2,
		v_lateral_values,       	-- %s for CASE statements
		psam_select_clause_3,
		price_column,
		price_column,
		price_column,
		psam_select_clause_4,
		psam_select_clause_5
    );

    -- Drop the materialized view if it exists
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing_restaurant.%I', v_mv_name);
    
    -- Create the materialized view
    EXECUTE v_sql_query;
	
	EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_product_store 
                ON base_pricing_restaurant.%I(product_id, store_id)', 
                v_mv_name, v_mv_name);
    
    RAISE NOTICE 'Materialized view base_pricing_restaurant.% created successfully', v_mv_name;
END;
$function$
;