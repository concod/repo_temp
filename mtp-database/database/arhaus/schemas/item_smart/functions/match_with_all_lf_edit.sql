--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with_all_LF_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:match_with_all_LF_edit
--comment: initial changeset for match_with_all_LF_edit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_all_lf_edit(date, date, jsonb, text, _text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_all_lf_edit(sdate date, edate date, filters jsonb, dept text, channels text[], planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   wp_table_name TEXT;
   lf_table_name TEXT;
   select_query TEXT;
   filter JSONB;
   attribute_name TEXT;
   values TEXT;
   operator TEXT;
   update_query1 TEXT;
   update_query2 TEXT;
   channel TEXT; -- Variable to iterate over channels
   rows_updated_for_w2d INT := 0;
   rows_updated_for_fwos INT := 0;
   rows_updated_for_eop_bop_sync INT := 0;
   w2d_query_text TEXT;
   fwos_query_text text;
   eop_bop_query_text text;
   original_channels text[] := channels; 
   update_query3 text;
  is_special_order_condition text;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_match_with_data;
   wp_table_name := 'item_smart.wp_master_' || dept;
   lf_table_name := 'item_smart.lf_master_' || dept;
  
  

	channels := array_append(channels, 'Warehouse');
  	
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
CREATE TEMP TABLE complete_match_with_data AS
WITH hierarchy_data AS (
   SELECT DISTINCT
       fdm.fiscal_year_week,
       pa.hierarchy_code
   FROM item_smart.mv_product_hierarchies_filter pa
   CROSS JOIN "global".fiscal_date_mapping fdm
   WHERE %s
     AND "date" BETWEEN %L AND %L
),
lf_data AS (
   SELECT
       id.hierarchy_code,
       id.current_week,
       id.channel,
       id.written_sales_dollars,
       id.written_sales_units,
	   id.written_aur,
       id.total_receipt_cost,
       id.total_receipt_units,
       id.total_receipts_auc
   FROM %s id
   JOIN hierarchy_data hd
   ON hd.hierarchy_code = id.hierarchy_code
      AND hd.fiscal_year_week = id.current_week
   WHERE id.channel =  ANY(%L)
)
select * from lf_data
',
       where_clause,
       sdate,
       edate,
       lf_table_name,
       channels
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;
  
  
  
  update_query1 := format('
		UPDATE %s wp
			SET 
				written_sales_dollars = cd.written_sales_dollars,
       			written_sales_units = cd.written_sales_units,
				written_aur = cd.written_aur,
       			total_receipt_cost = cd.total_receipt_cost,
       			total_receipt_units = cd.total_receipt_units,
       			total_receipts_auc = cd.total_receipts_auc
		FROM complete_match_with_data cd
	WHERE 
		cd.hierarchy_code = wp.hierarchy_code
 		AND cd.current_week = wp.current_week
 		AND cd.channel= wp.channel',
 		
 		wp_table_name
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
  
  channels := array_remove(channels, 'Warehouse'); -- removing warehouse since updates to be done written metrics
  
  update_query2 := format('

		UPDATE %s wp
			SET
				written_sales_cost = COALESCE(wp.written_auc, 0) * COALESCE(wp.written_sales_units, 0),
				written_dr_perc = (COALESCE(wp.written_air, 0) - (wp.written_sales_dollars / NULLIF(COALESCE(wp.written_sales_units, 0), 0))) / NULLIF(COALESCE(wp.written_air, 0), 0),
				written_gm_dollar = COALESCE(wp.written_sales_dollars, 0) - (COALESCE(wp.written_auc, 0) * COALESCE(wp.written_sales_units, 0)),
				written_gm_perc = (COALESCE(wp.written_sales_dollars, 0) - (COALESCE(wp.written_auc, 0) * COALESCE(wp.written_sales_units, 0))) / NULLIF(COALESCE(wp.written_sales_dollars, 0), 0)

			FROM complete_match_with_data cd
		WHERE
			wp.hierarchy_code = cd.hierarchy_code
 			AND wp.current_week = cd.current_week 
 			AND wp.channel =  ANY(%L)

			',wp_table_name, channels);

  RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
  EXECUTE update_query2;
 
  
			
   -- Update the row count
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
  
  
   -- Iterate over the channels and call w2d_edit for each channel

	FOREACH channel IN ARRAY channels loop
		w2d_query_text := format('SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L,%L)', sdate, edate, filters, dept, channel,'written_sales_units',planing_level);
		RAISE NOTICE 'Called w2d_edit for channel: %', channel;
		EXECUTE w2d_query_text INTO rows_updated_for_w2d;
    	
  	END LOOP;
  
  	channels := ARRAY['Warehouse']; 
  
  	update_query3 := format('

		UPDATE %s wp
			SET
				on_order_unplaced_total = COALESCE(wp.total_receipt_cost, 0) - COALESCE(wp.on_order_placed_total, 0),
				on_order_unplaced_total_unit = COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0),

				on_order_unplaced_total_auc = ((COALESCE(wp.total_receipt_cost, 0) - COALESCE(wp.on_order_placed_total, 0)) / NULLIF((COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0)), 0))
			FROM complete_match_with_data cd
		WHERE
			wp.hierarchy_code = cd.hierarchy_code
 			AND wp.current_week = cd.current_week 
 			AND wp.channel =  ANY(%L)

			',wp_table_name, channels);

  	RAISE NOTICE 'Formed UPDATE query 3: %', update_query3;
  	EXECUTE update_query3;

	--EOP BOP SYNC

	eop_bop_query_text := format('SELECT item_smart.sync_eop_bop(%L, %L, %L,%L)', sdate, filters, dept,planing_level);
	RAISE NOTICE 'Called eop bop sync';
	EXECUTE eop_bop_query_text INTO rows_updated_for_eop_bop_sync;
  
  	--Restore the original channels if needed
   	channels := original_channels;
  	
   	--eop bop sync called here
   	--conversion edit to be called here
  	
  	fwos_query_text := format('SELECT item_smart.sync_fwos(%L, %L, %L, %L, %L)', sdate, edate, filters, dept,planing_level);
	RAISE NOTICE 'Called sync fwos';
	EXECUTE fwos_query_text INTO rows_updated_for_fwos;
  	
  	-- recommended receipts edit to be called here
  
 
  RETURN updated_row_count + rows_updated_for_w2d + rows_updated_for_fwos + rows_updated_for_eop_bop_sync;
END;
$function$
;
