--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:rorecasted_sell_through_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_forecasted_sell_through_v3
--comment: initial changeset for forecasted_sell_through_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.forecasted_sell_through_v3(date, date, jsonb, _text, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.forecasted_sell_through_v3(sdate date, edate date, filters jsonb, channels text[], dept text, planing_level text, hierarchy_code_list integer[])
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
   bop_week int;
   current_year_val int;
   sdate_year int;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS  complete_data_forecasted_sell_through;
   wp_table_name := 'item_smart.wp_master_' || dept;
   ty_table_name := 'item_smart.ty_master_' || dept;
   itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
   itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;

		-- Get current fiscal year and sdate fiscal year
   SELECT DISTINCT fiscal_year INTO current_year_val
   FROM global.fiscal_date_mapping 
   WHERE date = CURRENT_DATE;
   
   SELECT DISTINCT fiscal_year INTO sdate_year 
   FROM global.fiscal_date_mapping 
   WHERE date = sdate;

   -- Determine bop_week based on fiscal year comparison
   IF sdate_year = current_year_val THEN

	-- If sdate falls under current fiscal year, take min(current_week) from wp table
      EXECUTE format('SELECT min(current_week) FROM %s WHERE hierarchy_code = ANY($1) and actualised = false', wp_table_name)
         INTO bop_week
         USING hierarchy_code_list;
   ELSE
      -- If sdate is not from current fiscal year, take min(fiscal_year_week) for that respective fiscal year
      SELECT min(fiscal_year_week) INTO bop_week 
      FROM global.fiscal_date_mapping 
      WHERE fiscal_year = sdate_year;
   END IF;

	raise notice 'week : %', bop_week;
  	
  
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
		CREATE TEMP TABLE complete_data_forecasted_sell_through AS
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
        SUM(cs.eop_units) AS eop_units
    FROM %s cs --item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
	JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
    --WHERE cs.hierarchy_code IN (83827, 35683)  --hcode params
    
    and cs.channel = ANY(%L) -- channel params  ANY(ARRAY[''Ecom''])
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
    
    UNION ALL
    
    -- From ty_master_ChristmasDecorations
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,
        SUM(cs.written_sales_units) AS written_sales_units,
        SUM(cs.eop_units) AS eop_units
    FROM %s cs --item_smart.ty_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
	JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
   -- WHERE cs.hierarchy_code IN (83827, 35683) --hcode params
     and cs.channel = ANY(%L) -- channel params  ANY(ARRAY[''Ecom''])
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
)
--select * from sales_data
,
-- Step 4: Get BOP units from first week of wp_master for each hierarchy_code and fiscal_year
first_week_bop AS (
   SELECT 
        cs.hierarchy_code,
        fw.fiscal_year,
        cs.channel,
        COALESCE(SUM(cs.bop_units), 0) AS first_week_bop_units,
        GREATEST(0, COALESCE(SUM(cs.bop_units), 0)) AS calculated_bop_units
    FROM %s cs -- wp_master item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
    WHERE cs.current_week = %s
    GROUP BY cs.hierarchy_code, fw.fiscal_year, cs.channel
),
-- Step 5: Get end-of-year EOP units for each hierarchy_code, fiscal_year, and channel
end_of_year_eop AS (
    SELECT 
        ranked.current_week,
        hierarchy_code,
        fiscal_year,
        channel,
        SUM(eop_units) AS end_of_year_eop_units
    FROM (
        SELECT DISTINCT
            hierarchy_code,
            fiscal_year,
            channel,
            current_week,
            eop_units,
            ROW_NUMBER() OVER (
                PARTITION BY hierarchy_code, fiscal_year, channel
                ORDER BY current_week DESC
            ) AS rn
        FROM sales_data
    ) ranked
    WHERE rn = 1
    GROUP BY hierarchy_code, fiscal_year, channel, ranked.current_week
)
--select * from end_of_year_eop
,
-- Step 6: Calculate weekly running sums and get total annual sales with adjusted EOP
weekly_calculations AS (
    SELECT 
        cs.hierarchy_code,
        cs.fiscal_year,
        cs.current_week,
        cs.channel,
        cs.written_sales_units,
        cs.eop_units,
        SUM(cs.written_sales_units) OVER (
            PARTITION BY cs.hierarchy_code, cs.fiscal_year, cs.channel
            ORDER BY cs.current_week 
            ROWS UNBOUNDED PRECEDING
        ) AS running_sum_written_sales_units,
        SUM(cs.written_sales_units) OVER (
            PARTITION BY cs.hierarchy_code, cs.fiscal_year, cs.channel
        ) AS total_annual_sales,
        eoy.end_of_year_eop_units,
        -- Add BOP units if negative, otherwise add 0
        COALESCE(fwb.first_week_bop_units, 0) AS first_week_bop_units,
        -- Adjusted EOP: EOP + (negative BOP units)
        eoy.end_of_year_eop_units + 
        CASE 
            WHEN COALESCE(fwb.first_week_bop_units, 0) < 0 
            THEN ABS(fwb.first_week_bop_units)  -- Convert negative to positive
            ELSE 0 
        END AS adjusted_end_of_year_eop_units
    FROM sales_data cs
    JOIN end_of_year_eop eoy 
        ON cs.hierarchy_code = eoy.hierarchy_code 
        AND cs.fiscal_year = eoy.fiscal_year
        AND cs.channel = eoy.channel
    JOIN first_week_bop fwb
        ON cs.hierarchy_code = fwb.hierarchy_code 
        AND cs.fiscal_year = fwb.fiscal_year
        AND cs.channel = fwb.channel
)
-- Final result: Week-level Forecasted ST Perc = Cumulative Sales up to Week / (Adjusted End of Year EOP Units + Total Annual Sales)
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
    eop_units,
    running_sum_written_sales_units,
    total_annual_sales,
    end_of_year_eop_units,
    first_week_bop_units,
    adjusted_end_of_year_eop_units,
    CASE 
        WHEN (adjusted_end_of_year_eop_units + total_annual_sales) > 0 
        THEN running_sum_written_sales_units / (adjusted_end_of_year_eop_units + total_annual_sales)
        ELSE NULL  -- Avoid division by zero
    END AS forecasted_st_percentage
FROM weekly_calculations
--where channel = ''Ecom''
ORDER BY hierarchy_code, fiscal_year, current_week, channel;
',
		sdate,
		edate,
		hierarchy_code_list,
		wp_table_name,
		channels,
		ty_table_name,
		channels,
        wp_table_name,
		bop_week
       
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
 	EXECUTE select_query;
	update_query1 := format('
    	UPDATE %s wp
    		SET 
        		forecasted_sellthrough_perc = cd.forecasted_st_percentage
    		FROM  complete_data_forecasted_sell_through cd
    			WHERE wp.hierarchy_code = cd.hierarchy_code
      				AND wp.current_week = cd.current_week
      				AND wp.channel = cd.channel
					AND wp.sub_channel = cd.sub_channel
					AND wp.actualised = false
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
