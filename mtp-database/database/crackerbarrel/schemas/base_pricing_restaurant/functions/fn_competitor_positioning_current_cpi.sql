--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_competitor_positioning_current_cpi stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_competitor_positioning_current_cpi

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_competitor_positioning_current_cpi;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_competitor_positioning_current_cpi(p_segment_id integer DEFAULT 10001)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_cols TEXT;
    other_select_cols TEXT;
    mv_sql TEXT;
    mv_name TEXT;
    total_created INTEGER := 0;
    col_record RECORD;
    channel_lvl_id INT;
    channel_col TEXT;
    v_competitor_columns TEXT;
	psam_select_clause_1 TEXT;
	psam_select_clause_2 TEXT;
	psam_select_clause_3 TEXT;
	psam_select_clause_4 TEXT;
	v_lateral_values TEXT;
BEGIN
    RAISE NOTICE 'Starting simplified dynamic CPI analysis...';

    -- Find the Channel store level id
    SELECT store_hierarchy_level_id
    INTO channel_lvl_id
    FROM base_pricing_restaurant.bp_store_hierarchy_level
    WHERE store_hierarchy_level_value = 'Channel'
    LIMIT 1;

    -- Fallback to s0_name if not found or null
    IF channel_lvl_id IS NULL THEN
        channel_col := 's0_name';
        RAISE NOTICE 'Channel hierarchy level not found. Falling back to %', channel_col;
    ELSE
        channel_col := format('s%s_name', channel_lvl_id);
        RAISE NOTICE 'Using column % for channel', channel_col;
   END IF;

    -- Build competitor columns dynamically from metadata
    SELECT 
        STRING_AGG(database_column, ', ')
    INTO 
        v_competitor_columns
    FROM base_pricing_restaurant.bp_competitor_attributes_metadata
    WHERE is_active = true
      AND database_column IS NOT NULL
      AND database_column != '';
    --
    -- Use short name for MV, full column name for grouping
    mv_name := format('mv_competitor_positioning_current_cpi');
    RAISE NOTICE 'Creating MV: % grouped', mv_name;
    
    -- Build OTHER hierarchy columns in proper order (excluding the group by column)
    other_select_cols := ''; -- Initialize as empty string
	FOR col_record IN
	    SELECT
	        'l' || product_hierarchy_level_id || '_name' AS col,
	        'product' AS type, 
	        product_hierarchy_level_id AS level_id
	    FROM base_pricing_restaurant.bp_product_hierarchy_level
	    WHERE
	        COALESCE(report_hierarchy_dropdown, false) = true
	    ORDER BY
	        type,
	        level_id
	LOOP
	    IF other_select_cols != '' THEN
	        other_select_cols := other_select_cols || ',';
	    END IF;
	    other_select_cols := other_select_cols || format('%s', col_record.col);
	END LOOP;

    -- Build hierarchy columns for CTE
    hierarchy_cols := '';
    FOR col_record IN
        SELECT 'l' || product_hierarchy_level_id || '_name' AS col, 'product' AS type, product_hierarchy_level_id AS level_id
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        WHERE COALESCE(report_hierarchy_dropdown, false) = true
        ORDER BY
            type,
            level_id
    LOOP
        IF hierarchy_cols != '' THEN
            hierarchy_cols := hierarchy_cols || ',';
        END IF;
        IF col_record.col LIKE 'l%' THEN
            hierarchy_cols := hierarchy_cols || 'pm.' || col_record.col;
        ELSE
            hierarchy_cols := hierarchy_cols || 'sm.' || col_record.col;
        END IF;
    END LOOP;

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
            format('ROUND(uc.%I::NUMERIC, 2) AS %I', database_column, database_column),
            ', '
        ),
		STRING_AGG(
            format('jd.%I', database_column),
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
     	AND attribute_name IN ('price');

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

    -- Drop existing MV
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS base_pricing_restaurant.%s', mv_name);

    -- Create MV with GROUP BY column and competitor_name
    mv_sql := format(
        $fmt$
        CREATE MATERIALIZED VIEW base_pricing_restaurant.%s AS
        WITH base_data AS (
             SELECT
                psam.product_id,
                psam.store_id,
                %s, --psam_select_clause_1
                %s -- v_competitor_columns
            FROM
                base_pricing_restaurant.bp_product_store_attributes_mapping_v4 psam
            WHERE
                psam.segment_id = %s --segemnt_id
                AND psam.attribute_10 <> 'N' -- eligibility
        ),
        transaction_data AS (
            SELECT
                btda.product_id,
                btda.store_id,
                btda.sales_units
            FROM
                base_pricing_restaurant.bp_transaction_data_agg btda
            WHERE
                btda.segment_id = %L --segement_id::TEXT
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
        joined_data AS (
            SELECT
				%s, -- hierarchy_cols
               	sm.%s, -- channel_col
                uc.product_id,
                uc.store_id,
               	%s, --psam_select_clause_3
                ROUND(uc.competitor_price::NUMERIC, 2) AS competitor_price,
                uc.competitor_name,
                uc.competitor_display_name,
                COALESCE(ROUND(td.sales_units::NUMERIC, 2), 0) AS sales_units
            FROM
                unpivoted_competitors uc
            INNER JOIN base_pricing_restaurant.bp_product_master pm ON uc.product_id = pm.product_id
            INNER JOIN base_pricing_restaurant.bp_store_master sm ON uc.store_id = sm.store_id
            LEFT JOIN transaction_data td
                ON uc.product_id = td.product_id AND uc.store_id = td.store_id
        )
        SELECT
			product_id,
			store_id, 
			%s, -- other_select_cols
           	jd.%s AS channel, -- channel_col
            jd.competitor_name,
            jd.competitor_display_name,
            sales_units,
			%s, -- psam_select_clause_4
			jd.competitor_price
        FROM joined_data jd
        WITH DATA;
        $fmt$, 
            mv_name,
			psam_select_clause_1,
			v_competitor_columns, 
			p_segment_id,
			p_segment_id::TEXT,
			psam_select_clause_2,
			v_lateral_values,
            hierarchy_cols, 
            channel_col,
			psam_select_clause_3,
			other_select_cols,
            channel_col,
			psam_select_clause_4
    );
    RAISE NOTICE 'QUERY %', mv_sql;
    -- Execute
    BEGIN
        EXECUTE mv_sql;
        total_created := total_created + 1;
        RAISE NOTICE '✓ Created: %', mv_name;  
        -- Create index
    	
		EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_product_store 
            ON base_pricing_restaurant.%s(product_id, store_id)', 
            mv_name, mv_name); 

    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating %: %', mv_name, SQLERRM;
    END;

    IF total_created = 0 THEN
        RAISE EXCEPTION 'No hierarchy levels marked with report_hierarchy_dropdown = true';
    END IF;
    RAISE NOTICE '🎉 Created % materialized views successfully!', total_created;
END;
$function$
;