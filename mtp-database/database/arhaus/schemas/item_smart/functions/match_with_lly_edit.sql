--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with_lly_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:match_with_lly_edit
--comment: initial changeset for match_with_lly_edit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_lly_edit(date, date, jsonb, text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_lly_edit(sdate date, edate date, filters jsonb, dept text, channels text[], editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    updated_row_count INTEGER := 0;
    where_clause TEXT := '';
    wp_table_name TEXT;
   	lly_table_name TEXT;
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
    DROP TABLE IF EXISTS complete_data;
    wp_table_name := 'item_smart.wp_master_' || dept;
   	lly_table_name := 'item_smart.lly_master_' || dept;
   
   IF editable_kpi IN ('on_order_unplaced_total_unit', 'inv_adj_units','inv_adj_cost') THEN
    	channels := ARRAY['Warehouse'];
	ELSE
    	channels := channels;
	END IF;

    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (SELECT string_agg(quote_literal(value), ', ')
                  FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';
       
       -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
        IF planing_level = 'spo' and attribute_name = 'l3_name' THEN
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
   


-- Form the SELECT query to populate the temporary table
    select_query := format(
        '
CREATE TEMP TABLE complete_data AS
WITH hierarchy_data AS (
    SELECT DISTINCT 
        fdm.fiscal_year_week,
        pa.hierarchy_code 
    FROM item_smart.mv_product_hierarchies_filter pa
    CROSS JOIN "global".fiscal_date_mapping fdm
    WHERE %s
      AND "date" BETWEEN %L AND %L
),
lly_data AS (
    SELECT 
        id.hierarchy_code, 
        id.current_week, 
        id.channel, 
        id.written_sales_dollars,
        id.written_sales_units,
        id.written_dr_perc,
        id.on_order_unplaced_total_unit,
        id.inv_adj_units,
        id.inv_adj_cost
    FROM %s id
    JOIN hierarchy_data hd 
    ON hd.hierarchy_code = id.hierarchy_code 
       AND hd.fiscal_year_week = id.current_week
    WHERE id.channel =  ANY(%L)
)
select * from lly_data
',
        where_clause,
        sdate,
        edate,
        lly_table_name,
        channels
    );

    RAISE NOTICE 'Formed SELECT query: %', select_query;
    -- Execute the dynamic SELECT query to create and populate the temporary table
    EXECUTE select_query;
   
   
 	 	update_query1 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code 
  		AND wp.current_week = cd.current_week
  		AND wp.channel = cd.channel',
  		
  		wp_table_name,
  		CASE
            WHEN editable_kpi = 'written_sales_dollars' THEN 
                'written_sales_dollars = cd.written_sales_dollars'
            WHEN editable_kpi = 'written_sales_units' THEN 
               'written_sales_units = cd.written_sales_units'
            WHEN editable_kpi = 'written_dr_perc' THEN 
               'written_dr_perc = cd.written_dr_perc'
            WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN 
               'on_order_unplaced_total_unit = cd.on_order_unplaced_total_unit'
            WHEN editable_kpi = 'inv_adj_units' THEN 
               'inv_adj_units = cd.inv_adj_units'
            WHEN editable_kpi = 'inv_adj_cost' THEN 
               'inv_adj_cost = cd.inv_adj_cost'
            ELSE 'NULL'
        END
  		
  		);

    -- Execute the dynamic UPDATE queries sequentially
    EXECUTE update_query1;
   
   
    update_query2 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel',
 		
 		wp_table_name,
 		CASE
           WHEN editable_kpi = 'written_sales_dollars' THEN
              'written_aur = wp.written_sales_dollars / NULLIF(wp.written_sales_units, 0),
			written_gm_dollar = wp.written_sales_dollars - wp.written_sales_cost,
				written_dr_perc = (wp.written_air - (wp.written_sales_dollars / NULLIF(wp.written_sales_units, 0))) / NULLIF(wp.written_air, 0),
			written_gm_perc = (wp.written_sales_dollars - wp.written_sales_cost) / NULLIF(wp.written_sales_dollars, 0)'
           WHEN editable_kpi = 'written_sales_units' THEN
              'written_sales_dollars = wp.written_sales_units * wp.written_aur,
				written_sales_cost = wp.written_sales_units * wp.written_auc,
				written_gm_dollar = (wp.written_sales_units * wp.written_aur) - (wp.written_sales_units * wp.written_auc),
				written_gm_perc = ((wp.written_sales_units * wp.written_aur) - (wp.written_sales_units * wp.written_auc)) / NULLIF((wp.written_sales_units * wp.written_aur), 0)'
           WHEN editable_kpi = 'written_dr_perc' THEN
              'written_aur = wp.written_air * (1 - wp.written_dr_perc),
                written_sales_dollars = wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc)),
                written_gm_dollar = (wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
                 written_gm_perc = ((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / NULLIF((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))), 0)'
            

         WHEN editable_kpi = 'inv_adj_units' THEN
              'inv_adj_cost = wp.inv_adj_units * wp.inv_adj_auc'
            
            WHEN editable_kpi = 'inv_adj_cost' THEN
              'inv_adj_auc = wp.inv_adj_cost / NULLIF(wp.inv_adj_units, 0)'

           WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN
             'total_receipt_units = wp.on_order_unplaced_total_unit + wp.on_order_placed_total_unit,
				on_order_unplaced_total = wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc,
				total_receipt_cost = wp.on_order_placed_total + ( wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc),
			total_receipts_auc = ( wp.on_order_placed_total + ( wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc)) / NULLIF(wp.on_order_unplaced_total_unit + wp.on_order_placed_total_unit, 0),
				'

           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
  EXECUTE update_query2;
   	
    -- Update the row count
    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
   
   RETURN updated_row_count;
END;
$function$
;
