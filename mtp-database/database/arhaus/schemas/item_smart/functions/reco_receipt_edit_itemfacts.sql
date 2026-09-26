--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:reco_receipt_edit_itemfacts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:reco_receipt_edit_itemfacts
--comment: initial changeset for reco_receipt_edit_itemfacts
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.reco_receipt_edit_itemfacts(jsonb, text, text, integer[]);

CREATE OR REPLACE FUNCTION item_smart.reco_receipt_edit_itemfacts(filters jsonb, dept text, planning_level text, hierarchy_code_list integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_row_count INTEGER := 0;
    where_clause TEXT := '';
    wp_table_name TEXT;
    itemfact_sku_table_name TEXT;
    select_query TEXT;
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    update_query1 TEXT;
    update_query2 TEXT;
    update_query3 TEXT;
    is_special_order_condition TEXT := '';
BEGIN
    -- Drop the temporary table
    DROP TABLE IF EXISTS complete_data_reco_receipts;
    wp_table_name := 'item_smart.wp_master_' || dept;
    itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;

    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (SELECT string_agg(quote_literal(value), ', ')
                   FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';
        
        -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
        IF planning_level = 'spo' AND attribute_name = 'l3_name' THEN
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            END IF;
        END IF;

        -- Skip certain attributes
        IF attribute_name NOT IN ('fiscal_month_name_abb', 'fiscal_quarter_name_abb', 'fiscal_year','fiscal_week') THEN
            -- Handle the 'in' operator and format the where_clause
            IF operator = 'in' THEN
                IF where_clause = '' THEN
                    where_clause := format('%I %s (%s)', attribute_name, operator, values);
                ELSE
                    where_clause := where_clause || format(' AND %I %s (%s)', attribute_name, operator, values);
                END IF;
            ELSE
                RAISE NOTICE 'Unsupported operator: %', operator;
            END IF;
        END IF;
    END LOOP;

    -- Append the is_special_order condition if applicable
    IF is_special_order_condition <> '' THEN
        where_clause := where_clause || ' AND ' || is_special_order_condition;
    END IF;
   
    RAISE NOTICE 'v_sql : %', where_clause;

    -- Form the SELECT query to populate the temporary table
    select_query := format(
        '
        CREATE TEMP TABLE complete_data_reco_receipts AS
        WITH hierarchy_data AS (
            SELECT DISTINCT
                pa.hierarchy_code
            FROM (
                SELECT hierarchy_code
                FROM item_smart.mv_product_hierarchies_filter 
                WHERE hierarchy_code = ANY(%L)
                UNION ALL 
                SELECT hierarchy_code
                FROM item_smart.placeholders_info
                WHERE hierarchy_code = ANY(%L)
            ) pa
        ),
        calendar_ref AS (
            -- date dictionary ranked for getting pre launch eligible weeks
            SELECT fiscal_year_week, rank() OVER (ORDER BY fiscal_year_week) AS rank
            FROM (
                SELECT fiscal_year_week
                FROM global.fiscal_date_mapping fdm 
                WHERE calendar_date >= current_date
                GROUP BY 1
            ) a
        ),
        calendar_ref_date AS (
            SELECT calendar_date, fiscal_year_week, rank() OVER (ORDER BY calendar_date) AS rank
            FROM global.fiscal_date_mapping fdm 
            WHERE calendar_date >= current_date
        ),
        calendar_ref_date_new AS (
            SELECT calendar_date, fiscal_year_week, rank, rank_week, 
                   CASE WHEN calendar_date >= min_date AND calendar_date < max_date THEN -1 ELSE 0 END 
            FROM ( 
                SELECT calendar_date, fiscal_year_week, rank, 
                       dense_rank() OVER (ORDER BY fiscal_year_week) AS rank_week,
                       min(calendar_date) OVER(PARTITION BY fiscal_year_week) AS min_date, 
                       max(calendar_date) OVER(PARTITION BY fiscal_year_week) AS max_date
                FROM calendar_ref_date
            ) aa
        ),
        launch_weeks AS (
            SELECT hierarchy_code, launch_date, 
                   CASE WHEN (launch_date IS NOT NULL) AND fiscal_year_week IS NULL 
                        THEN (CASE WHEN launch_date > current_date THEN 300001 ELSE 200001 END)
                        WHEN (launch_date IS NULL)
                        THEN 300001
                        ELSE fiscal_year_week END AS launch_week
            FROM %s a 
            LEFT JOIN global.fiscal_date_mapping fdm 
            ON a.launch_date = fdm.calendar_date 
            WHERE a.launch_date >= current_date AND launch_date <= current_date + interval ''2 years 26 weeks''
            AND hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        launch_minus_initial_receipt AS (
            SELECT * 
            FROM (
                SELECT hierarchy_code, launch_week, cr_1.fiscal_year_week AS fiscal_year_week
                FROM launch_weeks lw
                LEFT JOIN calendar_ref_date cr_1
                ON lw.launch_date - 14 = cr_1.calendar_date
            ) base
            WHERE fiscal_year_week IS NOT NULL AND fiscal_year_week >= (SELECT min(fiscal_year_week) FROM calendar_ref_date)
            AND hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        launch_minus_pres_min_receipt AS (
            SELECT base.hierarchy_code, base.fiscal_year_week AS current_week, presentation_min AS reco_receipt_units
            FROM (
                SELECT hierarchy_code, launch_week, cr_1.fiscal_year_week AS fiscal_year_week
                FROM launch_weeks lw
                LEFT JOIN calendar_ref_date cr_1
                ON lw.launch_date - 56 = cr_1.calendar_date 
            ) base
            LEFT JOIN %s ifs
            ON base.hierarchy_code = ifs.hierarchy_code
            WHERE fiscal_year_week IS NOT NULL AND fiscal_year_week >= (SELECT min(fiscal_year_week) FROM calendar_ref_date)
            AND base.hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        first_eligible_week AS (
            -- finding first eligible week of a sku
            SELECT hierarchy_code, fiscal_year_week AS first_eligible_week, lead_time
            FROM (
                SELECT hierarchy_code, current_date, lead_time,
                       CURRENT_DATE + coalesce(lead_time,0)::int AS calendar_date -- edited week minus
                FROM %s
            ) a
            JOIN global.fiscal_date_mapping fdm 
            USING(calendar_date)
            WHERE hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        last_eligible_week AS (
            SELECT hierarchy_code, coalesce(fdm.fiscal_year_week, max_planning_week) AS last_eligible_week  
            FROM (
                SELECT hierarchy_code, least(markdown_date, exit_date) AS last_eligible_date 
                FROM %s
            ) led
            LEFT JOIN global.fiscal_date_mapping fdm
            ON fdm.calendar_date = led.last_eligible_date
            LEFT JOIN (
                SELECT max(fiscal_year_week) AS max_planning_week FROM calendar_ref_date
            ) aa
            ON true
            WHERE hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        eligible_weeks AS (
            SELECT DISTINCT fiscal_year_week
            FROM (
                SELECT *, rank() OVER (PARTITION BY fiscal_year_month ORDER BY fiscal_year_week)
                FROM (
                    SELECT fiscal_year_month, fiscal_year_week
                    FROM global.fiscal_date_mapping fdm 
                    WHERE calendar_date >= current_date
                    GROUP BY 1,2
                    ORDER BY 1,2
                ) a
            ) b
            WHERE rank = 2
        ),
        hier_eligible_weeks AS (
            SELECT few.hierarchy_code, fiscal_year_week, last_eligible_week
            FROM first_eligible_week few
            LEFT JOIN eligible_weeks ew
            ON ew.fiscal_year_week >= few.first_eligible_week
            LEFT JOIN last_eligible_week lew
            ON few.hierarchy_code = lew.hierarchy_code
            WHERE coalesce(fiscal_year_week <= last_eligible_week, true) 
            AND few.hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
        ),
        reg_eligible_weeks AS (
            SELECT *, 
                   lead(fiscal_year_week) OVER (PARTITION BY hierarchy_code ORDER BY fiscal_year_week) AS next_fiscal_year_week, 
                   rank() OVER (PARTITION BY hierarchy_code ORDER BY fiscal_year_week ASC) AS week_set
            FROM (
                (
                    SELECT hierarchy_code, fiscal_year_week FROM launch_minus_initial_receipt
                    UNION DISTINCT 
                    SELECT hierarchy_code, fiscal_year_week FROM hier_eligible_weeks 
                )
            ) all_eligible
            WHERE hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
            ORDER BY 1,2
        ),
        base AS (
            SELECT hierarchy_code, current_week, fwos_target, 
                   sum(written_sales_units) AS written_sales_units, sum(aoh_units) AS aoh_units,
                   SUM(COALESCE(on_order_placed_total_auc, on_order_unplaced_total_auc, written_auc)) AS on_order_placed_total_auc
            FROM %s
            LEFT JOIN %s
            USING(hierarchy_code)
            WHERE current_week >= (SELECT min(fiscal_year_week) FROM calendar_ref_date) 
            AND hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
            GROUP BY 1,2,3
        ),
        rcpt_demand AS (
            SELECT hierarchy_code, current_week, on_order_placed_total_auc, fwos_target, 
                   CASE WHEN rcpt_demand > 0 
                        THEN rcpt_demand ELSE 0 END AS final_rcpt_demand
            FROM (
                SELECT *, (sales_units_demand - coalesce((lead(sales_units_demand, fwos_target) OVER(PARTITION BY hierarchy_code ORDER BY current_week)),0)) - aoh_units AS rcpt_demand 
                FROM (
                    SELECT hierarchy_code, fwos_target, current_week, written_sales_units, aoh_units, on_order_placed_total_auc,
                           sum(written_sales_units) OVER (PARTITION BY hierarchy_code ORDER BY current_week DESC) AS sales_units_demand
                    FROM base
                    WHERE hierarchy_code IN (SELECT hierarchy_code FROM hierarchy_data)
                ) a
            ) b
            ORDER BY 1,2
        ),
        regular_weeks_reco AS (
            SELECT hierarchy_code, current_week, reco_receipt_units, on_order_placed_total_auc
            FROM ( 
                SELECT *, lead(reco_rcpt_week_set) OVER (PARTITION BY hierarchy_code ORDER BY current_week ASC) AS reco_receipt_units
                FROM (
                    SELECT *, max(final_rcpt_demand) OVER(PARTITION BY hierarchy_code, week_set) AS reco_rcpt_week_set
                    FROM (
                        SELECT rd.*, 
                               CASE WHEN aew_actual.fiscal_year_week IS NULL THEN 0 ELSE 1 END AS status_eligible, 
                               aew_actual.fiscal_year_week, aew.week_set, 
                               lead(aew.week_set) OVER (PARTITION BY rd.hierarchy_code) AS lead_week_set
                        FROM rcpt_demand rd
                        LEFT JOIN reg_eligible_weeks aew
                        ON rd.hierarchy_code = aew.hierarchy_code AND 
                           rd.current_week > aew.fiscal_year_week AND 
                           rd.current_week <= aew.next_fiscal_year_week
                        LEFT JOIN reg_eligible_weeks aew_actual
                        ON rd.current_week = aew_actual.fiscal_year_week
                    ) aa
                ) bb
                WHERE lead_week_set IS NOT NULL
            ) cc
            WHERE fiscal_year_week IS NOT NULL
            GROUP BY hierarchy_code, current_week, reco_receipt_units, on_order_placed_total_auc
            ORDER BY hierarchy_code, current_week
        )
        SELECT * FROM regular_weeks_reco
        ',
        hierarchy_code_list,
        hierarchy_code_list,
        itemfact_sku_table_name,
        itemfact_sku_table_name,
        itemfact_sku_table_name,
        itemfact_sku_table_name,
        wp_table_name,
        itemfact_sku_table_name
    );
    
    RAISE NOTICE 'Formed SELECT query: %', select_query;
    -- Execute the dynamic SELECT query to create and populate the temporary table
    EXECUTE select_query;
    
    update_query1 := format('
        UPDATE %s wp
        SET 
            recomm_receipt_units = cd.reco_receipt_units,
            recomm_receipt_auc = cd.on_order_placed_total_auc
        FROM complete_data_reco_receipts cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = ''Warehouse'' 
        ',
        wp_table_name
    );
    
    RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
    -- Execute the dynamic UPDATE queries sequentially
    EXECUTE update_query1;

    update_query2 := format('
        UPDATE %s wp
        SET 
            recomm_receipt_cost = COALESCE(wp.recomm_receipt_units, 0) * COALESCE(wp.recomm_receipt_auc, 0)
        FROM complete_data_reco_receipts cd
        WHERE wp.hierarchy_code = cd.hierarchy_code
          AND wp.current_week = cd.current_week
          AND wp.channel = ''Warehouse''
        ',
        wp_table_name
    );
    
    RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
    -- Execute the dynamic UPDATE query
    EXECUTE update_query2;   

    -- UPDATE 3: Set NULL for remaining weeks
    update_query3 := format('
        UPDATE %s wp
        SET 
            recomm_receipt_units = NULL,
            recomm_receipt_auc = NULL,
            recomm_receipt_cost = NULL
        WHERE wp.hierarchy_code = ANY(%L)
          AND wp.channel = ''Warehouse''
          AND wp.current_week >= (SELECT MIN(current_week) FROM %s WHERE hierarchy_code = ANY(%L))
          AND wp.current_week <= (SELECT MAX(current_week) FROM %s WHERE hierarchy_code = ANY(%L))
          AND NOT EXISTS (
              SELECT 1 
              FROM complete_data_reco_receipts cd 
              WHERE cd.hierarchy_code = wp.hierarchy_code 
                AND cd.current_week = wp.current_week
          )
        ',
        wp_table_name,
        hierarchy_code_list,
        wp_table_name,
        hierarchy_code_list,
        wp_table_name,
        hierarchy_code_list
    );
    
    RAISE NOTICE 'Formed UPDATE query 3: %', update_query3;
    -- Execute the dynamic UPDATE query
    EXECUTE update_query3;   

    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
    RETURN updated_row_count;
END;
$function$
;