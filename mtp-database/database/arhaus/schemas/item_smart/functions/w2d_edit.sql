--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:w2d_edits runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:place holders.
--comment: initial changeset for w2d_edits
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.w2d_edit(date, date, jsonb, text, text, text, text);

CREATE OR REPLACE FUNCTION item_smart.w2d_edit(sdate date, edate date, filters jsonb, dept text, channel text, editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_row_count INTEGER := 0;
    where_clause TEXT := '';
    wp_table_name TEXT;
    select_query TEXT;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    update_query1 TEXT;
    update_query2 TEXT;
    is_special_order_condition TEXT := '';
    dynamic_where_clause TEXT;
BEGIN
    -- Construct the working table name based on department and channel
    wp_table_name := 'item_smart.wp_master_' || dept || '_' || channel;
    
    -- Drop the temporary table if it exists
    DROP TABLE IF EXISTS complete_data;

    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (
            SELECT string_agg(quote_literal(value), ', ')
            FROM jsonb_array_elements_text(filter->'value') value
        );
        operator := filter->>'operator';
       
        -- Special order condition handling
        IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (
                    SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                    FROM jsonb_array_elements_text(filter->'value') value
                );
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (
                    SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                    FROM jsonb_array_elements_text(filter->'value') value
                );
            END IF;
        END IF;

        -- Append the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;
   
    -- Append the is_special_order condition if applicable
    IF is_special_order_condition <> '' THEN
        where_clause := where_clause || ' AND ' || is_special_order_condition;
    END IF;
    RAISE NOTICE 'v_sql : %', where_clause;
    -- Prepare the dynamic WHERE clause
    dynamic_where_clause := COALESCE(where_clause, '1=1');

    -- Form the SELECT query to populate the temporary table
    select_query := format(
        'CREATE TEMP TABLE complete_data AS
        WITH hierarchy_data AS (
            SELECT DISTINCT 
                sku_hierarchy.sku_hier AS hierarchy_code, 
                sku_hierarchy.class, 
                sku_hierarchy.fiscal_year_week AS current_week,
                class_hierarchy.class_hier
            FROM (
                SELECT DISTINCT 
                    path ->> ''l3_name'' AS class, 
                    hierarchy_code AS class_hier  
                FROM "global".product_hierarchies_filter
                WHERE level = 4
            ) AS class_hierarchy
            INNER JOIN (
                -- First data source: mv_product_hierarchies_filter
                SELECT fdm.fiscal_year_week,
                       pa.hierarchy_code AS sku_hier,
                       pa.l3_name AS class
                FROM item_smart.mv_product_hierarchies_filter pa
                CROSS JOIN "global".fiscal_date_mapping fdm
                WHERE (%s)
                  AND "date" BETWEEN %L AND %L

                UNION all

                -- Second data source: placeholder_info
                SELECT fdm.fiscal_year_week,
                       pi.hierarchy_code AS sku_hier,
                       pi.l3_name AS class
                FROM item_smart.placeholders_info pi
                CROSS JOIN "global".fiscal_date_mapping fdm
                WHERE (%s)
                  AND "date" BETWEEN %L AND %L
            ) AS sku_hierarchy
            ON class_hierarchy.class = sku_hierarchy.class
        ),
        
        w2d_data AS (
            SELECT 
                hd.hierarchy_code,
                hd.class_hier,
                wdcs.delivered_week,
                wdcs.delivered_rates,
                wdcs.channel,
                wdcs.current_week
            FROM hierarchy_data hd
            JOIN item_smart.w2d_contribution_basedata wdcs
                ON hd.class_hier = wdcs.hierarchy_code 
                AND hd.current_week = wdcs.current_week 
            WHERE wdcs.channel IN (''Store'', ''Ecom'') 
              AND wdcs.delivered_rates != 0
            GROUP BY hd.hierarchy_code, hd.class_hier, wdcs.delivered_week, wdcs.delivered_rates, wdcs.channel, wdcs.current_week
        ),
        
        current_week_data AS (
            SELECT 
                w2d.hierarchy_code,
                w2d.channel,
                wdc.delivered_rates,
                w2d.delivered_week,
                wdc.current_week
            FROM w2d_data w2d
            JOIN item_smart.w2d_contribution_basedata wdc
                ON w2d.channel = wdc.channel
                AND w2d.delivered_week = wdc.delivered_week
                AND w2d.class_hier = wdc.hierarchy_code 
                AND wdc.delivered_rates != 0
            GROUP BY w2d.hierarchy_code, w2d.channel, wdc.current_week, wdc.delivered_rates, w2d.delivered_week
        ),
        
        final_aggregated_data AS (
            SELECT 
                wp.hierarchy_code,
                cwd.delivered_week AS current_week,
                cwd.channel,
                %s
            FROM %s wp
            JOIN current_week_data cwd
            ON wp.hierarchy_code = cwd.hierarchy_code 
            AND wp.channel = cwd.channel 
            AND wp.current_week = cwd.current_week
            GROUP BY wp.hierarchy_code, cwd.delivered_week, cwd.channel
        )
        SELECT 
            wp.delivered_net_sales_units,
            wp.delivered_net_sales_dollars,
            wp.delivered_net_sales_cost,
            wp.delivered_gm,
            fad.*
        FROM %s wp
        JOIN final_aggregated_data fad
        ON wp.hierarchy_code = fad.hierarchy_code 
        AND wp.channel = fad.channel 
        AND wp.current_week = fad.current_week',
        dynamic_where_clause,
        sdate,
        edate,
        dynamic_where_clause,
        sdate,
        edate,
        CASE
            WHEN editable_kpi = 'written_sales_$'
            THEN 'SUM(wp.written_sales_dollars * cwd.delivered_rates) AS delivered_net_sales_dollars_agg_val'
            WHEN editable_kpi = 'written_discount_%'
            THEN 'SUM(wp.written_sales_dollars * cwd.delivered_rates) AS delivered_net_sales_dollars_agg_val'
            WHEN editable_kpi = 'written_sales_units'
            THEN 'SUM(wp.written_sales_dollars * cwd.delivered_rates) AS delivered_net_sales_dollars_agg_val, SUM(wp.written_sales_units * cwd.delivered_rates) AS delivered_net_sales_units_agg_val, SUM(wp.written_sales_cost * cwd.delivered_rates) AS delivered_net_sales_cost_agg_val'
            ELSE 'NULL AS delivered_net_sales_dollars_agg_val, NULL AS delivered_net_sales_units_agg_val, NULL AS delivered_net_sales_cost_agg_val'
        END,
        wp_table_name,
        wp_table_name
    );

    RAISE NOTICE 'Formed SELECT query: %', select_query;

    -- Execute the dynamic SELECT query to create and populate the temporary table
    EXECUTE select_query;

    -- Form and execute the first UPDATE query
    update_query1 := format(
        'UPDATE %s wp
         SET %s
         FROM complete_data cd
         WHERE wp.hierarchy_code = cd.hierarchy_code
           AND wp.channel = cd.channel
           AND wp.current_week = cd.current_week',
        wp_table_name,
        CASE
        WHEN editable_kpi = 'written_sales_$' THEN 
            'delivered_net_sales_dollars = cd.delivered_net_sales_dollars_agg_val::double precision'
        WHEN editable_kpi = 'written_discount_%' THEN 
            'delivered_net_sales_dollars = cd.delivered_net_sales_dollars_agg_val::double precision'
        WHEN editable_kpi = 'written_sales_units' 
        THEN 
            'delivered_net_sales_dollars = cd.delivered_net_sales_dollars_agg_val::double precision, 
             delivered_net_sales_units = cd.delivered_net_sales_units_agg_val::double precision,
             delivered_net_sales_cost = cd.delivered_net_sales_cost_agg_val::double precision'
        ELSE ''
        END
    );

    RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
    EXECUTE update_query1;

    -- Form and execute the second UPDATE query
    update_query2 := format(
        'UPDATE %s wp
         SET %s
         FROM complete_data cd
         WHERE wp.hierarchy_code = cd.hierarchy_code
           AND wp.channel = cd.channel
           AND wp.current_week = cd.current_week',
        wp_table_name,
        CASE
            WHEN editable_kpi = 'written_sales_$' THEN 
                'delivered_aur = wp.delivered_net_sales_dollars / NULLIF(wp.delivered_net_sales_units, 0),
                 delivered_gm = wp.delivered_net_sales_dollars - wp.delivered_net_sales_cost,
                 delivered_gmperc = wp.delivered_gm / NULLIF(wp.delivered_net_sales_dollars, 0)'
            WHEN editable_kpi = 'written_discount_%' THEN 
                'delivered_aur = wp.delivered_net_sales_dollars / NULLIF(wp.delivered_net_sales_units, 0),
                 delivered_gm = wp.delivered_net_sales_dollars - wp.delivered_net_sales_cost,
                 delivered_gmperc = wp.delivered_gm / NULLIF(wp.delivered_net_sales_dollars, 0)'
            WHEN editable_kpi = 'written_sales_units' 
            THEN 
                'delivered_aur = wp.delivered_net_sales_dollars / NULLIF(wp.delivered_net_sales_units, 0),
                 delivered_auc = wp.delivered_net_sales_cost / NULLIF(wp.delivered_net_sales_units, 0),
                 delivered_gm = wp.delivered_net_sales_dollars - wp.delivered_net_sales_cost,
                 delivered_gmperc = wp.delivered_gm / NULLIF(wp.delivered_net_sales_dollars, 0)'
            ELSE 'NULL'
        END
    );
   
    RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
    EXECUTE update_query2;
   
    -- Get the number of updated rows
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
	
    RETURN updated_row_count;
END;
$function$
;
