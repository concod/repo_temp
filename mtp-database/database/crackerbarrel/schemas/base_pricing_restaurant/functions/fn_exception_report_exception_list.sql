--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_exception_report_exception_list stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_exception_report_exception_list

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_exception_report_exception_list;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_exception_report_exception_list(p_mv_name text DEFAULT 'mv_exception_report_exception_list'::text, p_drop_if_exists boolean DEFAULT true)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
	v_competitor_columns_select TEXT;
    v_competitor_columns TEXT := '';
    v_competitor_case_statements TEXT := '';
    v_lateral_values TEXT := '';
	v_eligibility_condition TEXT;
    v_final_sql TEXT;
    v_competitor_count INTEGER;
BEGIN
    -- Drop existing materialized view if requested
    IF p_drop_if_exists THEN
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing_restaurant.%I CASCADE', p_mv_name);
    END IF;

    -- ✅ Step 1: Build competitor columns from metadata (NEW SCHEMA)
    SELECT 
        STRING_AGG(database_column, ', ' ORDER BY attribute_id),
        STRING_AGG(
            format('(%L, bd.%I)', database_column, database_column),
            ', ' ORDER BY attribute_id
        ),
        STRING_AGG(
            format('MAX(CASE WHEN uc.competitor_name = %L THEN uc.competitor_price END) AS %I',
                   attribute_name, database_column),
            ',
    ' ORDER BY attribute_id
        ),
		STRING_AGG('cda.'||database_column,',' ORDER BY attribute_id),
        COUNT(*)
    INTO 
        v_competitor_columns,
        v_lateral_values,
        v_competitor_case_statements,
		v_competitor_columns_select,
        v_competitor_count
    FROM base_pricing_restaurant.bp_competitor_attributes_metadata
    WHERE is_active = true
      AND database_column IS NOT NULL
      AND database_column != '';

    -- Validation: Ensure we have competitors
    IF v_competitor_count = 0 OR v_competitor_columns IS NULL THEN
        v_competitor_columns := 'NULL AS no_competitors';
        v_competitor_case_statements := 'NULL AS no_competitors';
        v_lateral_values := '(NULL, NULL)';
        RAISE NOTICE 'No active competitors found in metadata';
    END IF;

	-- Build Dynamic Attribute Query Statements
	SELECT 
		format('psam.%I <> ''N'' ',database_column)
	INTO v_eligibility_condition
	FROM base_pricing_restaurant.bp_product_store_attributes_metadata
	WHERE attribute_name in ('eligibility');
	

    -- ✅ Step 2: Build the complete dynamic SQL
    v_final_sql := format($sql$
	CREATE MATERIALIZED VIEW base_pricing_restaurant.%I AS
	WITH strategy_filter AS (
	    SELECT strategy_id, strategy_name, strategy_status_id
	    FROM base_pricing_restaurant.bp_strategy_master
	    WHERE strategy_status_id IN (110, 200)
	),
	strategy_status AS (
	    SELECT 
	        ssl.strategy_status_display_name,
	        ssl.strategy_status_id,
	        sf.strategy_id,
	        sf.strategy_name
	    FROM strategy_filter sf
	    JOIN base_pricing_restaurant.bp_strategy_status_level ssl 
	        ON sf.strategy_status_id = ssl.strategy_status_id
	),
	rule_lookup AS (
	    SELECT 
	        rm.id AS rule_id,
	        rt.name AS rule_name
	    FROM base_pricing_restaurant.bp_rule_master rm
	    JOIN base_pricing_restaurant.bp_rule_types rt ON rm.rule_type_id = rt.id
	),
	rules_processed AS MATERIALIZED (
	    SELECT
	        fin.strategy_id,
	        fin.product_id,
	        fin.store_id,  -- This is varchar(255) from fin table
			fin.segment_id,
	        STRING_AGG(DISTINCT r.rule_name::text, ', ') AS exception_list
	    FROM base_pricing_restaurant.bp_price_reco_finalized_v2 fin
	    JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
	    CROSS JOIN LATERAL jsonb_array_elements(fin.rules_exception) rule_data(value)
	    JOIN rule_lookup r ON (rule_data.value ->> 'rule_id')::integer = r.rule_id
	    WHERE fin.rules_exception IS NOT NULL
	      AND jsonb_typeof(fin.rules_exception) = 'array'
	      AND jsonb_array_length(fin.rules_exception) > 0
	    GROUP BY fin.strategy_id, fin.product_id, fin.store_id, fin.segment_id
	),
	-- ✅ NEW: Use v4 schema with optimized unpivoting
	base_data AS MATERIALIZED (
	    SELECT DISTINCT
	        psam.product_id,
	        psam.store_id,
	        psam.segment_id,
	        psam.price_zone,
	        psam.effective_price_zone,
	        %s  -- v_competitor_columns
	    FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
	    INNER JOIN (
	        SELECT DISTINCT 
	            fin.product_id,
	            store_unnest AS store_id,
	            fin.segment_id
	        FROM base_pricing_restaurant.bp_price_reco_finalized_v2 fin
	        INNER JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
	        CROSS JOIN LATERAL unnest(fin.store_ids) AS store_unnest
	    ) fin_products ON fin_products.product_id = psam.product_id
	        AND fin_products.store_id = psam.store_id
	        AND fin_products.segment_id = psam.segment_id
	    WHERE %s -- Eligibility Condition
	),
	-- ✅ Optimized unpivoting with CROSS JOIN LATERAL
	unpivoted_competitors AS (
	    SELECT
	        bd.product_id,
	        bd.store_id,
	        bd.segment_id,
	        bd.price_zone,
	        bd.effective_price_zone,
	        bcam.attribute_name AS competitor_name,
	        bcam.frontend_display_name AS competitor_display_name,
	        comp.competitor_price
	    FROM base_data bd
	    CROSS JOIN LATERAL (
	        VALUES %s  -- v_lateral_values
	    ) AS comp(col_name, competitor_price)
	    INNER JOIN base_pricing_restaurant.bp_competitor_attributes_metadata bcam
	        ON bcam.database_column = comp.col_name
	        AND bcam.is_active = true
	    WHERE comp.competitor_price IS NOT NULL
	),
	-- ✅ Aggregate competitor data by product/store
	competitor_data_aggregated AS (
	    SELECT
	        product_id,
	        store_id,
			segment_id,
	        %s,  -- v_competitor_case_statements (MAX CASE for each competitor)
	        ROUND(AVG(competitor_price)::numeric, 2) AS avg_all_competitors
	    FROM unpivoted_competitors uc
	    GROUP BY product_id, store_id, segment_id
	),
	-- ✅ Finalized prices with aggregations
	finalized_prices_optimized AS (
	    SELECT
	        fin.strategy_id,
	        fin.product_id,
	        store_unnest as store_id,
			fin.segment_id,
	        rp.exception_list,
	        STRING_AGG(DISTINCT fin.segment_name, ',') AS segment_name,
	        STRING_AGG(DISTINCT fin.opt_level_bins::text, ', ') AS opt_level_bins,
	        STRING_AGG(DISTINCT fin.product_name::text, ', ') AS product_name,
	        STRING_AGG(DISTINCT fin.store_name::text, ', ') AS store_name,
	        STRING_AGG(DISTINCT fin.price_zone_name::text, ', ') AS price_zone_name,
	        STRING_AGG(DISTINCT fin.channel, ',') AS channel,
	        STRING_AGG(DISTINCT fin.line_group, ',') AS line_group,
	        STRING_AGG(DISTINCT fin.zone_structure_name, ',') AS zone_structure_name,
	        STRING_AGG(DISTINCT fin.size_family, ',') AS size_family,
	        STRING_AGG(DISTINCT fin.size_class, ',') AS size_class,
	        STRING_AGG(DISTINCT fin.brand_family, ',') AS brand_family,
	        STRING_AGG(DISTINCT fin.brand_class, ',') AS brand_class,
	        STRING_AGG(DISTINCT fin.custom_class_1, ',') AS custom_class_1,
	        STRING_AGG(DISTINCT fin.custom_family_1, ',') AS custom_family_1,
	        STRING_AGG(DISTINCT fin.uom, ',') AS uom,
	        STRING_AGG(DISTINCT fin.price_change_reason, ',') AS price_change_reason,
	        ROUND(AVG(fin.base_price)::numeric, 2) AS finalized_price,
	        SUM(fin.sales_units) AS total_sales_units,
	        ROUND(SUM(fin.revenue)::numeric, 2) AS total_revenue,
	        AVG(fin.cost) AS cost,
	        AVG(fin.size) AS size,
	        ROUND(AVG(fin.price)::numeric, 2) AS price
	    FROM base_pricing_restaurant.bp_price_reco_finalized_v2 fin
		CROSS JOIN LATERAL unnest(fin.store_ids) AS store_unnest
	    JOIN strategy_filter sf ON fin.strategy_id = sf.strategy_id
	    JOIN base_pricing_restaurant.bp_price_reco_ia_v2 ia 
	        ON ia.strategy_id = fin.strategy_id
	        AND ia.product_id = fin.product_id
	        AND ia.store_id = fin.store_id
			AND ia.segment_id = fin.segment_id
	    JOIN rules_processed rp 
	        ON rp.strategy_id = fin.strategy_id
	        AND rp.product_id = fin.product_id
	        AND rp.store_id = fin.store_id
			AND rp.segment_id = fin.segment_id
	    GROUP BY fin.strategy_id, fin.product_id, store_unnest, fin. segment_id, rp.exception_list
	)
	-- ✅ Final SELECT with all columns
	SELECT
	    fp.strategy_id,
	    fp.product_id::text,
	    fp.store_id::text,
	    fp.exception_list,
	    fp.segment_name,
	    fp.segment_id,
	    fp.opt_level_bins,
	    fp.product_name,
	    fp.store_name,
	    fp.price_zone_name,
	    fp.finalized_price,
	    fp.total_sales_units,
	    fp.total_revenue,
	    fp.channel,
	    fp.line_group,
	    fp.zone_structure_name,
	    fp.size_family,
	    fp.size_class,
	    fp.brand_family,
	    fp.brand_class,
	    fp.custom_class_1,
	    fp.custom_family_1,
	    fp.cost,
	    fp.size,
	    fp.uom,
	    fp.price_change_reason,
	    %s,  -- All competitor columns + avg_all_competitors
	    fp.price,
	    ss.strategy_status_display_name AS strategy_status,
	    ss.strategy_name
	FROM finalized_prices_optimized fp
	JOIN strategy_status ss ON ss.strategy_id = fp.strategy_id
	LEFT JOIN competitor_data_aggregated cda 
	    ON cda.product_id = fp.product_id
	    AND cda.store_id = fp.store_id
		AND cda.segment_id = fp.segment_id
	ORDER BY fp.strategy_id, fp.product_id, fp.store_id
	$sql$,
	        p_mv_name,                    -- %I for MV name
	        v_competitor_columns,         -- %s competitor columns in base_data
			v_eligibility_condition,		  -- %s Eligibility Condition for <> N
	        v_lateral_values,             -- %s VALUES clause for unpivoting
	        v_competitor_case_statements,  -- %s MAX CASE statements
			v_competitor_columns_select   -- %s SELECT cda.comp1 etc..
	    );

    -- ✅ Step 3: Log generated SQL (optional, comment out in production)
    RAISE NOTICE 'Found % active competitors', v_competitor_count;

    -- ✅ Step 4: Execute the dynamic SQL
    EXECUTE v_final_sql;

    -- ✅ Step 5: Create indexes for performance
    EXECUTE format('CREATE INDEX idx_%I_strategy_product_store 
                    ON base_pricing_restaurant.%I(strategy_id, product_id, store_id)',
                   REPLACE(p_mv_name, 'mv_', ''), p_mv_name);
    
    EXECUTE format('CREATE INDEX idx_%I_strategy 
                    ON base_pricing_restaurant.%I(strategy_id)',
                   REPLACE(p_mv_name, 'mv_', ''), p_mv_name);

    RETURN format('✅ Materialized view %s created successfully with %s competitors', 
                  p_mv_name, v_competitor_count);

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to create materialized view %: % (SQLSTATE: %)', 
                        p_mv_name, SQLERRM, SQLSTATE;
END;
$function$
;
