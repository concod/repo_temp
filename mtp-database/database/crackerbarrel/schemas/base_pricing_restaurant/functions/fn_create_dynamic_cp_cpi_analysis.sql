--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_create_dynamic_cp_cpi_analysis stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_create_dynamic_cp_cpi_analysis

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_create_dynamic_cp_cpi_analysis;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.fn_create_dynamic_cp_cpi_analysis()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    lvl RECORD;
    hierarchy_cols TEXT;
    other_select_cols TEXT;
    group_col TEXT;
    mv_sql TEXT;
    mv_name TEXT;
    total_created INTEGER := 0;
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Starting simplified dynamic CPI analysis...';
    
    -- Create one MV for each active hierarchy level
    FOR lvl IN
        SELECT 
            'l' || product_hierarchy_level_id as col_name,
            product_hierarchy_level_id as level_id,
            'product' as hierarchy_type
        FROM base_pricing_restaurant.bp_product_hierarchy_level
        WHERE COALESCE(report_hierarchy_dropdown, false) = true
        
        UNION ALL
        
        SELECT 
            's' || store_hierarchy_level_id as col_name,
            store_hierarchy_level_id as level_id,
            'store' as hierarchy_type
        FROM base_pricing_restaurant.bp_store_hierarchy_level
        WHERE COALESCE(report_hierarchy_dropdown, false) = true
        
        ORDER BY hierarchy_type, level_id
    LOOP
        mv_name := format('base_pricing_restaurant.mv_competitor_positioning_current_cpi_%s', lvl.col_name);
        group_col := lvl.col_name;
        
        RAISE NOTICE 'Creating MV: % grouped by % and competitor_name', mv_name, group_col;
        
        -- Reset variables
        other_select_cols := '';
        
        -- Build OTHER hierarchy columns in proper order (excluding the group by column)
        FOR col_record IN
            SELECT 'l' || product_hierarchy_level_id || '_name' as col, 
                   'product' as type, 
                   product_hierarchy_level_id as level_id
            FROM base_pricing_restaurant.bp_product_hierarchy_level
            WHERE COALESCE(report_hierarchy_dropdown, false) = true
              AND 'l' || product_hierarchy_level_id || '_name' != lvl.col_name
            
            UNION ALL
            
            SELECT 's' || store_hierarchy_level_id || '_name' as col,
                   'store' as type,
                   store_hierarchy_level_id as level_id
            FROM base_pricing_restaurant.bp_store_hierarchy_level
            WHERE COALESCE(report_hierarchy_dropdown, false) = true
              AND 's' || store_hierarchy_level_id || '_name' != lvl.col_name
              
            ORDER BY type, level_id
        LOOP
            IF other_select_cols != '' THEN
                other_select_cols := other_select_cols || ',
    ';
            END IF;
            other_select_cols := other_select_cols || format('STRING_AGG(DISTINCT %s::text, '', '') as %s', col_record.col, col_record.col);
        END LOOP;
        
        -- Build hierarchy columns for CTE
        hierarchy_cols := '';
        FOR col_record IN
            SELECT 'l' || product_hierarchy_level_id || '_name' as col, 'product' as type, product_hierarchy_level_id as level_id
            FROM base_pricing_restaurant.bp_product_hierarchy_level
            WHERE COALESCE(report_hierarchy_dropdown, false) = true
            
            UNION ALL
            
            SELECT 's' || store_hierarchy_level_id || '_name' as col, 'store' as type, store_hierarchy_level_id as level_id
            FROM base_pricing_restaurant.bp_store_hierarchy_level  
            WHERE COALESCE(report_hierarchy_dropdown, false) = true
            
            ORDER BY type, level_id
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
        mv_sql := format($fmt$
            CREATE MATERIALIZED VIEW %s AS
            WITH segment_lookup AS (
                SELECT segment_id FROM base_pricing_restaurant.bp_customer_segment_master
                WHERE segment_name = 'residential'
            ),
            unnested_attributes AS (
                SELECT
                    psam.product_id, 
                    psam.store_id,
                    COALESCE(cost_values.cost, 0) as cost,
                    COALESCE(price_values.price, 0) as price,
                    attribute->>'attribute_name' as competitor_name,
                    (attribute->'attribute_value'->>'current')::numeric as competitor_price
                FROM base_pricing_restaurant.bp_product_store_attributes_mapping psam
                JOIN segment_lookup sl ON sl.segment_id = psam.segment_id
                LEFT JOIN LATERAL (
                    SELECT (jsonb_path_query(psam.attributes, '$[*] ? (@.attribute_name == "total_cost").attribute_value.current')#>>'{}')::numeric as cost
                ) cost_values ON true
                LEFT JOIN LATERAL (
                    SELECT (jsonb_path_query(psam.attributes, '$[*] ? (@.attribute_name == "price").attribute_value.current')#>>'{}')::numeric as price
                ) price_values ON true
                CROSS JOIN LATERAL jsonb_array_elements(psam.competitor_attributes) as attribute
                WHERE attribute->'attribute_value'->>'current' IS NOT NULL
            ),
            hierarchy AS (
                SELECT %s, ua.product_id, ua.store_id, ua.price, ua.cost, ua.competitor_price, ua.competitor_name,
                       COALESCE(td.sales_units, 1) as sales_units
                FROM unnested_attributes ua
                LEFT JOIN base_pricing_restaurant.bp_product_master pm ON ua.product_id = pm.product_id
                JOIN base_pricing_restaurant.bp_store_master sm ON ua.store_id = sm.store_id
                LEFT JOIN base_pricing_restaurant.bp_transaction_data_agg td ON td.store_id = ua.store_id AND td.product_id = ua.product_id
            )
            SELECT 
                %s,
                competitor_name%s,
                STRING_AGG(DISTINCT product_id::text, ', ') as product_ids,
                STRING_AGG(DISTINCT store_id::text, ', ') as store_ids,
                sum(hierarchy.price*sales_units)/ sum(sales_units) as  price ,
                sum(hierarchy.cost*sales_units)/ sum(sales_units) as  cost ,
                sum(hierarchy.competitor_price*sales_units)/ sum(sales_units) as  competitor_price,
                STRING_AGG(DISTINCT sales_units::text, ', ') as sales_units,
                
                -- CPI Calculations
                CASE WHEN AVG(price) > 0 THEN 
                    ROUND(((AVG(price) - AVG(competitor_price)) / AVG(price)) * 100 + 100, 2)
                END as nvw_cpi,
                
                ROUND((100 * ((SUM(price * sales_units) - SUM(competitor_price * sales_units)) / 
                      NULLIF(SUM(price * sales_units), 0)) + 100)::numeric, 2) AS vwi
                
            FROM hierarchy
            GROUP BY %s, competitor_name
            WITH DATA;
        $fmt$, 
            mv_name, 
            hierarchy_cols, 
            group_col,  -- GROUP BY column first
            CASE WHEN other_select_cols != '' THEN ',' || E'\n    ' || other_select_cols ELSE '' END,  -- Other hierarchy columns
            group_col  -- GROUP BY includes both hierarchy level and competitor_name
        );
        
        RAISE NOTICE 'GROUP BY clause: %, competitor_name', group_col;
        
        -- Execute
        BEGIN
            EXECUTE mv_sql;
            total_created := total_created + 1;
            RAISE NOTICE '✓ Created: %', mv_name;
            
            -- Create index
            EXECUTE format('CREATE INDEX ON %s (%s, competitor_name)', mv_name, group_col);
            
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
