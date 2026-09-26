--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:recommended_units_supply_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_recommended_units_supply_v3
--comment: initial changeset for recommended_units_supply_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.recommended_units_supply_v3(date, date, jsonb, _text, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.recommended_units_supply_v3(sdate date, edate date, filters jsonb, channels text[], dept text, planing_level text, hierarchy_code_list integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   wp_table_name TEXT;
	ty_table_name TEXT;
   itemfact_sku_table_name TEXT;
   itemfact_sku_week_table_name TEXT;
   select_query TEXT;
   filter JSONB;
   attribute_name TEXT;
   values TEXT;
   operator TEXT;
   update_query1 TEXT;
   update_query2 TEXT;
   is_special_order_condition text;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS  complete_data_recom_units_supply;
   wp_table_name := 'item_smart.wp_master_' || dept;
   ty_table_name := 'item_smart.ty_master_' || dept;
   itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
   itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
  	
  
     -- Build the WHERE clause dynamically from the filters
    FOR filter IN
    SELECT * FROM jsonb_array_elements(filters)
LOOP
    attribute_name := filter->>'attribute_name';
    values := (SELECT string_agg(quote_literal(value), ', ')
               FROM jsonb_array_elements_text(filter->'value') value);
    operator := filter->>'operator';
    
    -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
    IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
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
		CREATE TEMP TABLE complete_data_recom_units_supply AS
	WITH fiscal_years AS (
    SELECT DISTINCT fiscal_year 
    FROM global.fiscal_date_mapping fdm 
    WHERE date BETWEEN %L AND %L --date params
),
-- Step 2: Get distinct fiscal year weeks from those fiscal years
fiscal_weeks AS (
    SELECT DISTINCT fiscal_year_week, fiscal_year
    FROM global.fiscal_date_mapping fdm
    WHERE fiscal_year IN (SELECT fiscal_year FROM fiscal_years)
),

valid_hierarchy_codes AS (
    SELECT DISTINCT hierarchy_code
    FROM item_smart.mv_product_hierarchies_filter
    WHERE hierarchy_code = ANY(%L) --hcode params

    UNION 

    SELECT DISTINCT hierarchy_code
    FROM item_smart.placeholders_info
    WHERE hierarchy_code = ANY(%L) --hcode params
),
-- Step 3: Get sales data from both Christmas decorations tables with fiscal_year
sales_data AS (
    -- From wp_master_ChristmasDecorations
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,
        SUM(cs.written_sales_units) AS written_sales_units,
        BOOL_OR(cs.actualised) AS actualised
    FROM %s cs --item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
   -- WHERE cs.hierarchy_code IN (35683) --hcode params
    and cs.channel =  ANY(%L) -- channel params
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
    
    UNION ALL
    
    -- From ty_master_ChristmasDecorations
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,
        SUM(cs.written_sales_units) AS written_sales_units,
        BOOL_OR(cs.actualised) AS actualised
    FROM %s cs --item_smart.ty_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
   -- WHERE cs.hierarchy_code IN (35683) --hcode params
    and cs.channel = ANY(%L) -- channel params  ANY(ARRAY[''Ecom''])
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
),
-- Step 4: Calculate total annual sales and recommended_u_supply
annual_calculations AS (
    SELECT 
        sd.hierarchy_code,
        sd.fiscal_year,
        sd.channel,
        SUM(sd.written_sales_units) AS total_annual_sales_units,
        st.st_perc,
        CASE 
            WHEN st.st_perc > 0 THEN SUM(sd.written_sales_units) / st.st_perc
            ELSE 0
        END AS recommended_u_supply_total
    FROM sales_data sd
    JOIN item_smart.sku_st_info st 
        ON sd.hierarchy_code = st.hierarchy_code 
        AND sd.fiscal_year = st.year
    GROUP BY sd.hierarchy_code, sd.fiscal_year, sd.channel, st.st_perc
),
-- Step 5: Get existing recommended_u_supply values from wp_master
existing_recommended_supply AS (
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,
        COALESCE(SUM(cs.recommended_u_supply), 0) AS existing_recommended_u_supply
    FROM %s cs --item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
),
-- Step 6: Get non-actualized weeks count (wp_master weeks where actualized = false)
non_actualized_weeks_count AS (
    SELECT 
        cs.hierarchy_code,
        fw.fiscal_year,
        cs.channel,
        COUNT(DISTINCT cs.current_week) AS non_actualized_weeks_count
    FROM %s cs -- item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
    AND (cs.actualised = false OR cs.actualised IS NULL)  -- Non-actualized weeks
    GROUP BY cs.hierarchy_code, fw.fiscal_year, cs.channel
),
-- Step 7: Calculate distribution ratios and final recommended_u_supply
final_distribution AS (
    SELECT 
        sd.hierarchy_code,
        sd.fiscal_year,
        sd.current_week,
        sd.channel,
        sd.written_sales_units,
        ac.total_annual_sales_units,
        ac.st_perc,
        ac.recommended_u_supply_total,
        ers.existing_recommended_u_supply,
        -- Calculate total existing recommended_u_supply for this hierarchy_code-channel-fiscal_year
        SUM(ers.existing_recommended_u_supply) OVER (
            PARTITION BY sd.hierarchy_code, sd.channel, sd.fiscal_year
        ) AS total_existing_recommended_supply,
        -- Count non-actualized weeks from wp_master
        nawc.non_actualized_weeks_count
    FROM sales_data sd
    JOIN annual_calculations ac
        ON sd.hierarchy_code = ac.hierarchy_code
        AND sd.fiscal_year = ac.fiscal_year
        AND sd.channel = ac.channel
    LEFT JOIN existing_recommended_supply ers
        ON sd.hierarchy_code = ers.hierarchy_code
        AND sd.current_week = ers.current_week
        AND sd.fiscal_year = ers.fiscal_year
        AND sd.channel = ers.channel
    LEFT JOIN non_actualized_weeks_count nawc
        ON sd.hierarchy_code = nawc.hierarchy_code
        AND sd.fiscal_year = nawc.fiscal_year
        AND sd.channel = nawc.channel
    WHERE (sd.actualised = false OR sd.actualised IS NULL)
)
--select * from final_distribution
SELECT 
    hierarchy_code,
    fiscal_year,
    current_week,
    channel,
	CASE 

        WHEN channel = ''Ecom'' THEN ''Ecom_warehouse''
        WHEN channel = ''Indirect'' THEN ''Indirect_warehouse''
		WHEN channel = ''Store'' THEN ''Store_warehouse''
       
    END AS sub_channel,
    written_sales_units,
    total_annual_sales_units,
    st_perc,
    recommended_u_supply_total,
    existing_recommended_u_supply,
    total_existing_recommended_supply,
    non_actualized_weeks_count,
    -- Final recommended_u_supply calculation
    CASE 
        -- If existing recommended_u_supply values exist, distribute proportionally
        WHEN total_existing_recommended_supply > 0 THEN
            recommended_u_supply_total * (existing_recommended_u_supply / total_existing_recommended_supply)
        -- If no existing values, distribute equally among non-actualized weeks
        ELSE
            recommended_u_supply_total / non_actualized_weeks_count
    END AS final_recommended_u_supply
FROM final_distribution
ORDER BY hierarchy_code, fiscal_year, current_week, channel;
',
		sdate,
		edate, --date params
       	hierarchy_code_list,
        hierarchy_code_list,
		wp_table_name,
		channels,
		ty_table_name,
		channels,
        wp_table_name,
		wp_table_name
       
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
 	EXECUTE select_query;
   update_query1 := format('
    	UPDATE %s wp
    		SET 
        		recommended_u_supply = cd.final_recommended_u_supply
    		FROM  complete_data_recom_units_supply cd
    			WHERE wp.hierarchy_code = cd.hierarchy_code
      				AND wp.current_week = cd.current_week
      				AND wp.channel = cd.channel
					AND wp.sub_channel = cd.sub_channel
					AND  (wp.actualised = false OR wp.actualised IS NULL) --added because schema level default is not handled
    ',
 		
 		wp_table_name
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
  
       
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
  RETURN updated_row_count;
END;
$function$
;
