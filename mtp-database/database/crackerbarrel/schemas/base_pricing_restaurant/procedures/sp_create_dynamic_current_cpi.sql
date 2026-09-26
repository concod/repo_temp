--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_create_dynamic_current_cpi stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_create_dynamic_current_cpi

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_dynamic_current_cpi;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_dynamic_current_cpi()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    lvl RECORD;
    hierarchy_cols TEXT;
    other_select_cols TEXT;
    group_col TEXT;
    group_col_short TEXT;
    mv_sql TEXT;
    mv_name TEXT;
    total_created INTEGER := 0;
    col_record RECORD;
    channel_lvl_id INT;
    channel_col TEXT;
BEGIN
    RAISE NOTICE 'Starting simplified dynamic CPI analysis...';
    -- Find the Channel store level id
    SELECT store_hierarchy_level_id
    INTO channel_lvl_id
    FROM base_pricing_restaurant.bp_store_hierarchy_level
    WHERE store_hierarchy_level_value = 'Channel'
    LIMIT 1;
    --
    -- fallback to s0_name if not found or null
    IF channel_lvl_id IS NULL THEN
        channel_col := 's0_name';
        RAISE NOTICE 'Channel hierarchy level not found. Falling back to %', channel_col;
    ELSE
        channel_col := format('s%s_name', channel_lvl_id);
        RAISE NOTICE 'Using column % for channel', channel_col;
   END IF;
    --
    -- Create one MV for each active hierarchy level
    FOR lvl IN
        SELECT 
            'l' || product_hierarchy_level_id AS col_short,
            'l' || product_hierarchy_level_id || '_name' AS col_name,
            product_hierarchy_level_id AS level_id,
            'product' AS hierarchy_type
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        WHERE COALESCE(report_hierarchy_dropdown, false) = true
        -- UNION ALL
        -- SELECT 
        --     's' || store_hierarchy_level_id AS col_short,
        --     's' || store_hierarchy_level_id || '_name' AS col_name,
        --     store_hierarchy_level_id AS level_id,
        --     'store' AS hierarchy_type
        -- FROM base_pricing_restaurant.bp_store_hierarchy_level
        -- WHERE COALESCE(report_hierarchy_dropdown, false) = true
        ORDER BY
            hierarchy_type,
            level_id
    LOOP
        -- Use short name for MV, full column name for grouping
        mv_name := format('base_pricing_restaurant.mv_competitor_positioning_current_cpi_%s', lvl.col_short);
        group_col_short := lvl.col_short;
        group_col := lvl.col_name;
        RAISE NOTICE 'Creating MV: % grouped by % and competitor_name', mv_name, group_col;
        -- Reset variables
        other_select_cols := '';
        -- Build OTHER hierarchy columns in proper order (excluding the group by column)
        FOR col_record IN
            SELECT
                'l' || product_hierarchy_level_id || '_name' AS col,
                'product' AS type, 
                product_hierarchy_level_id AS level_id
            FROM base_pricing_restaurant.bp_product_hierarchy_level
            WHERE
                COALESCE(report_hierarchy_dropdown, false) = true
                AND 'l' || product_hierarchy_level_id || '_name' != lvl.col_name
            -- UNION ALL
            -- SELECT
            --     's' || store_hierarchy_level_id || '_name' AS col,
            --     'store' AS type,
            --     store_hierarchy_level_id AS level_id
            -- FROM base_pricing_restaurant.bp_store_hierarchy_level
            -- WHERE
            --     COALESCE(report_hierarchy_dropdown, false) = true
            --     AND 's' || store_hierarchy_level_id || '_name' != lvl.col_name
            ORDER BY
                type,
                level_id
        LOOP
            IF other_select_cols != ''
                THEN other_select_cols := other_select_cols || ',';
            END IF;
            other_select_cols := other_select_cols || format('STRING_AGG(DISTINCT %s::text, '', '') as %s', col_record.col, col_record.col);
        END LOOP;
        -- Build hierarchy columns for CTE
        hierarchy_cols := '';
        FOR col_record IN
            SELECT 'l' || product_hierarchy_level_id || '_name' AS col, 'product' AS type, product_hierarchy_level_id AS level_id
            FROM base_pricing_restaurant.bp_product_hierarchy_level
            WHERE COALESCE(report_hierarchy_dropdown, false) = true
            -- UNION ALL
            -- SELECT 's' || store_hierarchy_level_id || '_name' AS col, 'store' AS type, store_hierarchy_level_id AS level_id
            -- FROM base_pricing_restaurant.bp_store_hierarchy_level  
            -- WHERE COALESCE(report_hierarchy_dropdown, false) = true
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
        -- Drop existing MV
        EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %s', mv_name);
        -- Create MV with GROUP BY column and competitor_name
        mv_sql := format(
            $fmt$
            CREATE MATERIALIZED VIEW %s AS
            WITH
                segment_lookup AS (
                    SELECT
                        bcsm.segment_id,
                        bcsm.segment_name
                    FROM base_pricing_restaurant.bp_customer_segment_master bcsm
                    WHERE bcsm.segment_id = 10001
            ),
            transaction_data AS (
                SELECT
                    btda.product_id,
                    btda.store_id,
                    btda.sales_units
                FROM
                    base_pricing_restaurant.bp_transaction_data_agg btda
                    INNER JOIN segment_lookup sl ON sl.segment_name = btda.customer_type
            ),
            base_data AS (
                SELECT
                    psam.product_id,
                    psam.store_id,
                    psam.segment_id,
                    sl.segment_name,
                    psam.effective_price_zone,
                    COALESCE(
                        (
                            SELECT (attribute.value -> 'attribute_value' ->> 'current')::NUMERIC
                            FROM jsonb_array_elements(psam.attributes) attribute(value)
                            WHERE attribute.value ->> 'attribute_name' = 'total_cost'
                            LIMIT 1
                        ),
                        0
                    ) AS cost,
                    COALESCE(
                        (
                            SELECT (attribute.value -> 'attribute_value' ->> 'current')::NUMERIC
                            FROM jsonb_array_elements(psam.attributes) attribute(value)
                            WHERE attribute.value ->> 'attribute_name' = 'price'
                            LIMIT 1
                        ),
                        0
                    ) AS price,
                    COALESCE(
                        (
                            SELECT (attribute.value -> 'attribute_value' ->> 'current')::TEXT
                            FROM jsonb_array_elements(psam.attributes) attribute(value)
                            WHERE attribute.value ->> 'attribute_name' = 'eligibility'
                            LIMIT 1
                        ),
                        'N'
                    ) AS eligibility,
                    jsonb_array_elements(psam.competitor_attributes) ->> 'attribute_name'::TEXT AS competitor_name,
                    ((jsonb_array_elements(psam.competitor_attributes) -> 'attribute_value') ->> 'current')::NUMERIC AS competitor_price
                FROM
                    base_pricing_restaurant.bp_product_store_attributes_mapping psam
                    INNER JOIN segment_lookup sl
                        ON sl.segment_id = psam.segment_id
            ),
            joined_data AS (
                SELECT
                    %s,
                    sm.%s,
                    bd.product_id,
                    bd.store_id,
                    bd.segment_id,
                    bd.segment_name,
                    bd.effective_price_zone,
                    ROUND(bd.cost::NUMERIC, 2) AS cost,
                    ROUND(bd.price::NUMERIC, 2) AS price,
                    ROUND(bd.competitor_price::NUMERIC, 2) AS competitor_price,
                    bd.competitor_name,
                    bcam.frontend_display_name AS competitor_display_name,
                    COALESCE(ROUND(td.sales_units::NUMERIC, 2), 0) as sales_volume
                FROM (
                        SELECT *
                        FROM base_data
                        WHERE
                            cost > 0
                            AND price > 0
                            AND eligibility <> 'N'
                            AND competitor_name IS NOT NULL
                            AND competitor_price IS NOT NULL 
                    ) bd
                    INNER JOIN base_pricing_restaurant.bp_competitor_attributes_metadata bcam
                        ON bd.competitor_name = bcam.attribute_name
                    INNER JOIN base_pricing_restaurant.bp_product_master pm ON bd.product_id = pm.product_id
                    INNER JOIN base_pricing_restaurant.bp_store_master sm ON bd.store_id = sm.store_id
                    LEFT JOIN transaction_data td
                        ON bd.product_id = td.product_id AND bd.store_id = td.store_id
            )
            SELECT 
                %s,
                joined_data.segment_id,
                joined_data.segment_name,
                string_agg(DISTINCT joined_data.%s::text, ', ') AS channel,
                STRING_AGG(DISTINCT product_id::text, ', ') AS product_ids,
                STRING_AGG(DISTINCT store_id::text, ', ') AS store_ids,
                joined_data.competitor_name,
                joined_data.competitor_display_name,
                STRING_AGG(DISTINCT sales_volume::text, ', ') AS sales_volume,
                -- CPI Calculations
                ROUND(((AVG(price) - AVG(competitor_price)) / AVG(price))::numeric * 100 + 100, 2) AS nvw_cpi,
                ROUND((((SUM(price * GREATEST(1, joined_data.sales_volume)) - SUM(competitor_price * GREATEST(1, joined_data.sales_volume))) / 
                      SUM(price * GREATEST(1, joined_data.sales_volume))))::numeric * 100 + 100, 2) AS vwi_cpi
            FROM joined_data
            GROUP BY
                %s,
                joined_data.segment_id,
                joined_data.segment_name,
                joined_data.competitor_name,
                joined_data.competitor_display_name
            WITH DATA;
            $fmt$, 
                mv_name, 
                hierarchy_cols, 
                channel_col,
                group_col,  -- GROUP BY column first
                channel_col,
                group_col  -- GROUP BY includes both hierarchy level and competitor_name
        );
        RAISE NOTICE 'GROUP BY clause: %, competitor', group_col;
        RAISE NOTICE 'QUERY %', mv_sql;
        -- Execute
        BEGIN
            EXECUTE mv_sql;
            total_created := total_created + 1;
            RAISE NOTICE '✓ Created: %', mv_name;  
            -- Create index
            EXECUTE format('CREATE INDEX ON %s (%s, competitor)', mv_name, group_col);
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Error creating %: %', mv_name, SQLERRM;
        END;
    END LOOP;
    IF total_created = 0 THEN
        RAISE EXCEPTION 'No hierarchy levels marked with report_hierarchy_dropdown = true';
    END IF;
    RAISE NOTICE '🎉 Created % materialized views successfully!', total_created;
END;
$procedure$
;