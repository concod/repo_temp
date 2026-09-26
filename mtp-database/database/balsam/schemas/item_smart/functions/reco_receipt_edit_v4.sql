--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:reco_receipt_edit_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_erco_receipt_edit_v4
--comment: initial changeset for reco_receipt_edit_v4
--rollback: SELECT 1


DROP FUNCTION IF EXISTS item_smart.reco_receipt_edit_v4(date, date, jsonb, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.reco_receipt_edit_v4(sdate date, edate date, filters jsonb, dept text, planing_level text, hierarchy_code_list integer[])
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
   DROP TABLE IF EXISTS complete_data_reco_receipts;
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
		CREATE TEMP TABLE complete_data_reco_receipts AS
		-- Step 1: Get distinct fiscal years from the date range
WITH fiscal_years AS (
    SELECT DISTINCT fiscal_year 
    FROM global.fiscal_date_mapping fdm 
    WHERE date BETWEEN %L AND %L --dates params
),
-- Step 2: Get distinct fiscal year weeks from those fiscal years
fiscal_weeks AS (
    SELECT DISTINCT fiscal_year_week, fiscal_year
    FROM global.fiscal_date_mapping fdm
    WHERE fiscal_year IN (SELECT fiscal_year FROM fiscal_years)
),
-- Step 3: Get valid hierarchy codes (combining both filters in one place)
valid_hierarchy_codes AS (
    SELECT DISTINCT hierarchy_code
    FROM item_smart.mv_product_hierarchies_filter
    WHERE hierarchy_code = ANY(%L) AND lifecycle != ''EOL'' --hcode params

    UNION

    SELECT DISTINCT hierarchy_code
    FROM item_smart.placeholders_info
    WHERE hierarchy_code = ANY(%L)  --hcode params
),
-- Step 4: Get sales data from both Christmas decorations tables with fiscal_year
sales_data AS (
    -- From wp_master_ChristmasDecorations
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,
   
        COALESCE(SUM(cs.written_sales_units), 0) AS written_sales_units,
        COALESCE(SUM(cs.on_order_placed_total_unit), 0) AS on_order_placed_total_unit,
        COALESCE(SUM(cs.rtp_units), 0) AS rtp_units,
        COALESCE(SUM(cs.warranty_units), 0) AS warranty_units,
        COALESCE(SUM(cs.zero_dollar_orders_units), 0) AS zero_dollar_orders_units,
        COALESCE(SUM(cs.recommended_u_supply), 0) AS recommended_u_supply,
      
		 CASE
            WHEN SUM(cs.on_order_placed_total_auc) IS NULL OR SUM(cs.on_order_placed_total_auc) = 0
            THEN CASE 
                WHEN SUM(cs.written_sales_units) > 0 THEN 
                    SUM(cs.written_sales_cost) / NULLIF(SUM(cs.written_sales_units), 0)
                ELSE 0 
            END
            ELSE SUM(cs.on_order_placed_total_auc)
        END AS on_order_placed_total_auc
    FROM %s cs --wp_master table name
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
     --WHERE cs.channel =  ANY(ARRAY[''Ecom'']) --channel params
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
    
    UNION ALL
    
    -- From ty_master_ChristmasDecorations
    SELECT 
        cs.hierarchy_code,
        cs.current_week,
        fw.fiscal_year,
        cs.channel,

        COALESCE(SUM(cs.written_sales_units), 0) AS written_sales_units,
        COALESCE(SUM(cs.on_order_placed_total_unit), 0) AS on_order_placed_total_unit,
        COALESCE(SUM(cs.rtp_units), 0) AS rtp_units,
        COALESCE(SUM(cs.warranty_units), 0) AS warranty_units,
        COALESCE(SUM(cs.zero_dollar_orders_units), 0) AS zero_dollar_orders_units,
        COALESCE(SUM(cs.recommended_u_supply), 0) AS recommended_u_supply,
		 CASE
            WHEN SUM(cs.on_order_placed_total_auc) IS NULL OR SUM(cs.on_order_placed_total_auc) = 0
            THEN CASE 
                WHEN SUM(cs.written_sales_units) > 0 THEN 
                    SUM(cs.written_sales_cost) / NULLIF(SUM(cs.written_sales_units), 0)
                ELSE 0 
            END
            ELSE SUM(cs.on_order_placed_total_auc)
        END AS on_order_placed_total_auc
    FROM %s cs --item_smart.ty_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
   -- WHERE cs.channel =  ANY(ARRAY[''Ecom''])  --channel params
    GROUP BY cs.hierarchy_code, cs.current_week, fw.fiscal_year, cs.channel
),
-- Step 5: Get BOP units from first week of wp_master for each hierarchy_code and fiscal_year
first_week_bop AS (
   SELECT 
        cs.hierarchy_code,
        fw.fiscal_year,
        cs.channel,
        COALESCE(SUM(cs.bop_units), 0) AS first_week_bop_units,
        --GREATEST(0, COALESCE(SUM(cs.bop_units), 0)) AS calculated_bop_units
		COALESCE(SUM(cs.bop_units), 0) AS calculated_bop_units
    FROM %s cs -- wp_master item_smart.wp_master_ChristmasDecorations
    JOIN fiscal_weeks fw
        ON cs.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON cs.hierarchy_code = vhc.hierarchy_code
    WHERE cs.current_week = %s
    GROUP BY cs.hierarchy_code, fw.fiscal_year, cs.channel
),
item_case_pack AS (
    SELECT 
        ic.hierarchy_code,
        ic.sellable_qty
    FROM %s ic -- item_smart.itemfact_sku_christmasdecorations table
    JOIN valid_hierarchy_codes vhc
        ON ic.hierarchy_code = vhc.hierarchy_code
),
-- Step 6: Determine actualized vs non-actualized weeks dynamically
actualized_weeks AS (
    SELECT 
        hierarchy_code,
        channel,
        fiscal_year,
        MAX(current_week) AS max_actualized_week
    FROM (
        -- Get weeks from ty_master (actualized)
        SELECT 
            cs.hierarchy_code,
            cs.channel,
            fw.fiscal_year,
            cs.current_week
        FROM %s cs --item_smart.ty_master_ChristmasDecorations
        JOIN fiscal_weeks fw
            ON cs.current_week = fw.fiscal_year_week
        JOIN valid_hierarchy_codes vhc
            ON cs.hierarchy_code = vhc.hierarchy_code
        
        UNION ALL
        
        -- Get weeks from wp_master where actualized = true (also actualized)
        SELECT 
            cs.hierarchy_code,
            cs.channel,
            fw.fiscal_year,
            cs.current_week
        FROM %s cs --item_smart.wp_master_ChristmasDecorations
        JOIN fiscal_weeks fw
            ON cs.current_week = fw.fiscal_year_week
        JOIN valid_hierarchy_codes vhc
            ON cs.hierarchy_code = vhc.hierarchy_code
        AND cs.actualised = true
    ) actualized_data
    GROUP BY hierarchy_code, channel, fiscal_year
),
-- Step 7: Calculate overall final calculated supply per hierarchy_code and channel
overall_final_supply AS (
    SELECT 
        sd.hierarchy_code,
        fw.fiscal_year,
        sd.channel,
        fwb.calculated_bop_units,
        icp.sellable_qty,
        -- Overall final calculation: Recommended U Supply - Calculated BOP U - On Order U - RTP Units + Warranty U + Zero $ Orders U
        CASE 
            WHEN icp.sellable_qty > 0 THEN 
                CEIL(
    				(COALESCE(SUM(sd.recommended_u_supply), 0) - 
    					fwb.calculated_bop_units - 
   					 COALESCE(SUM(sd.on_order_placed_total_unit), 0) - 
    				COALESCE(SUM(sd.rtp_units), 0) + 
   				 COALESCE(SUM(sd.warranty_units), 0) + 
   					 COALESCE(SUM(sd.zero_dollar_orders_units), 0)) / icp.sellable_qty
					) * icp.sellable_qty
            ELSE 
                COALESCE(SUM(sd.recommended_u_supply), 0) - 
					fwb.calculated_bop_units - 
					COALESCE(SUM(sd.on_order_placed_total_unit), 0) - 
					COALESCE(SUM(sd.rtp_units), 0) + 
					COALESCE(SUM(sd.warranty_units), 0) + 
					COALESCE(SUM(sd.zero_dollar_orders_units), 0)
        END AS overall_final_calculated_supply,
		AVG(sd.on_order_placed_total_auc) AS on_order_placed_total_auc --aded avg for now since auc is not finalized yet
    FROM sales_data sd
    JOIN fiscal_weeks fw
        ON sd.current_week = fw.fiscal_year_week
    LEFT JOIN first_week_bop fwb
        ON sd.hierarchy_code = fwb.hierarchy_code
        AND fw.fiscal_year = fwb.fiscal_year
        AND sd.channel = fwb.channel
    LEFT JOIN item_case_pack icp
        ON sd.hierarchy_code = icp.hierarchy_code
    GROUP BY sd.hierarchy_code, fw.fiscal_year, sd.channel, fwb.calculated_bop_units, icp.sellable_qty
),
-- Step 8: Get receipt split weeks (common across all channels) and classify them
receipt_split_classification AS (
    SELECT 
        ifsw.hierarchy_code,
        ifsw.current_week,
        fw.fiscal_year,
        ifsw.receipt_split,
        ofs.channel,
        ofs.overall_final_calculated_supply,
        ofs.calculated_bop_units,
        ofs.sellable_qty,
        aw.max_actualized_week,
        CASE 
            WHEN ifsw.current_week <= aw.max_actualized_week THEN ''actualized''
            ELSE ''non_actualized''
        END AS week_type,
		ofs.on_order_placed_total_auc
    FROM %s ifsw -- item_smart.itemfact_sku_week_christmasdecorations 
    JOIN fiscal_weeks fw
        ON ifsw.current_week = fw.fiscal_year_week
    JOIN valid_hierarchy_codes vhc
        ON ifsw.hierarchy_code = vhc.hierarchy_code
    JOIN overall_final_supply ofs  
        ON ifsw.hierarchy_code = ofs.hierarchy_code  
        AND fw.fiscal_year = ofs.fiscal_year 
    LEFT JOIN actualized_weeks aw
        ON ifsw.hierarchy_code = aw.hierarchy_code
        AND fw.fiscal_year = aw.fiscal_year
        AND ofs.channel = aw.channel
),
-- Step 9: Calculate totals for non-actualized weeks first
non_actualized_totals AS (
    SELECT 
        hierarchy_code,
        fiscal_year,
        SUM(receipt_split) AS total_non_actualized_split,
        COUNT(DISTINCT current_week) AS non_actualized_weeks_count
    FROM (
        SELECT DISTINCT hierarchy_code, fiscal_year, current_week, receipt_split, week_type
        FROM receipt_split_classification
        WHERE week_type = ''non_actualized''  --  count non-actualized weeks
    ) unique_weeks
    GROUP BY hierarchy_code, fiscal_year
),
-- Step 8: Calculate effective receipt split distribution with normalization
receipt_distribution AS (
    SELECT 
        rsc.*,
        nat.total_non_actualized_split,
        nat.non_actualized_weeks_count
    FROM receipt_split_classification rsc
    LEFT JOIN non_actualized_totals nat
        ON rsc.hierarchy_code = nat.hierarchy_code
        AND rsc.fiscal_year = nat.fiscal_year
),
-- Step 9: Final distribution calculation
final_distribution AS (
    SELECT 
        rd.*,
        CASE 
            -- If week is actualized, no distribution
            WHEN rd.week_type = ''actualized'' THEN 0
            -- If week is non-actualized and has receipt_split, normalize it to sum to 1
            WHEN rd.receipt_split > 0 AND rd.total_non_actualized_split > 0 THEN 
                rd.receipt_split / rd.total_non_actualized_split
            -- If week is non-actualized but NO receipt_split, check if ALL receipt_split weeks are actualized
            ELSE 
                CASE 
                    -- If there are no non-actualized weeks with receipt_split, distribute equally
                    WHEN rd.total_non_actualized_split = 0 OR rd.total_non_actualized_split IS NULL THEN
                        1.0 / rd.non_actualized_weeks_count
                    ELSE 0
                END
        END AS final_receipt_split,
        -- Calculate distributed supply
        CASE 
            WHEN rd.week_type = ''actualized'' THEN 0
            -- If week has receipt_split, use proportional distribution
            WHEN rd.receipt_split > 0 AND rd.total_non_actualized_split > 0 THEN 
                rd.overall_final_calculated_supply * (rd.receipt_split / rd.total_non_actualized_split)
            -- If no receipt_split weeks are non-actualized, distribute equally
            WHEN rd.total_non_actualized_split = 0 OR rd.total_non_actualized_split IS NULL THEN
                rd.overall_final_calculated_supply / rd.non_actualized_weeks_count
            ELSE 0
        END AS distributed_supply
    FROM receipt_distribution rd
)
-- Final output:  non-actualized weeks with their distribution
SELECT 
    hierarchy_code,
    current_week,
    fiscal_year,
    channel,
	CASE 

        WHEN channel = ''Ecom'' THEN ''Ecom_warehouse''
        WHEN channel = ''Indirect'' THEN ''Indirect_warehouse''
		WHEN channel = ''Store'' THEN ''Store_warehouse''
       
    END AS sub_channel,
    receipt_split,
    overall_final_calculated_supply,
    calculated_bop_units,
    sellable_qty,
    max_actualized_week,
    week_type,
    total_non_actualized_split,
    final_receipt_split,
    distributed_supply as reco_receipt_units,
    non_actualized_weeks_count,
	on_order_placed_total_auc
FROM final_distribution
WHERE week_type = ''non_actualized''  -- show non-actualized weeks
    --and distributed_supply > 0
ORDER BY hierarchy_code, fiscal_year, current_week, channel;
',
		sdate,
		edate, --date params
       	hierarchy_code_list,
        hierarchy_code_list,
		wp_table_name,
		ty_table_name,
        wp_table_name,
        bop_week,
       	itemfact_sku_table_name,
		ty_table_name,
        wp_table_name,
		itemfact_sku_week_table_name
       
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
  EXECUTE select_query;
   update_query1 := format('
    	UPDATE %s wp
    		SET 
        		recomm_receipt_units = cd.reco_receipt_units
				--,
        		--recomm_receipt_auc = cd.on_order_placed_total_auc
    		FROM complete_data_reco_receipts cd
    			WHERE wp.hierarchy_code = cd.hierarchy_code
      				AND wp.current_week = cd.current_week
      				AND wp.channel = cd.channel
					AND wp.sub_channel = cd.sub_channel
					AND  (wp.actualised = false OR wp.actualised IS NULL)
    ',
 		
 		wp_table_name
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
  
     update_query2 := format(
    '
    UPDATE %s wp
    SET 
        recomm_receipt_cost = COALESCE(wp.recomm_receipt_units, 0) * COALESCE(wp.recomm_receipt_auc, 0),
		updated_at = now()
    FROM complete_data_reco_receipts cd
    WHERE wp.hierarchy_code = cd.hierarchy_code
      AND wp.current_week = cd.current_week
      AND wp.channel = cd.channel
	  AND wp.sub_channel = cd.sub_channel
    ',
    wp_table_name
);
    RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
    -- Execute the dynamic UPDATE query
  -- EXECUTE update_query2;   
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
  RETURN updated_row_count;
END;
$function$
;
