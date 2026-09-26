--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:match_with_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_lf_edit.sql
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.match_with_lf_edit(date, date, jsonb, text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_lf_edit(sdate date, edate date, filters jsonb, dept text, channels text[], editable_kpi text, planing_level text)
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
  	is_special_order_condition text;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_data;
   wp_table_name := 'item_smart.wp_master_' || dept;
  	lf_table_name := 'item_smart.lf_master_' || dept;
  	
  	  	
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
lf_data AS (
   SELECT
       id.hierarchy_code,
       id.current_week,
       id.channel,
       id.written_sales_dollars,
       id.written_sales_units,
       id.written_dr_perc,
       id.total_receipt_units
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
           WHEN editable_kpi = 'total_receipt_units' THEN
              'total_receipt_units = cd.total_receipt_units'

          
           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
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
              '
			 	written_aur = COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_sales_units, 0), 0),0),
				written_gm_dollar = COALESCE(wp.written_sales_dollars, 0) - COALESCE(wp.written_sales_cost, 0),
				written_dr_perc = (COALESCE(wp.written_air, 0) - COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_sales_units, 0), 0),0)) / NULLIF(COALESCE(wp.written_air, 0), 0),
				written_gm_perc = (COALESCE(wp.written_sales_dollars, 0) - COALESCE(COALESCE(wp.written_sales_cost, 0) / NULLIF(COALESCE(wp.written_sales_dollars, 0), 0), 0))
			'
           WHEN editable_kpi = 'written_sales_units' THEN
              '
				written_sales_dollars = COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0),
				written_sales_cost = COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_auc, 0),
				written_gm_dollar = ((COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0)) - (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_auc, 0))),
				written_gm_perc = ((COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0)) - (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_auc, 0))) / NULLIF((COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0)), 0)
				
			  '
           WHEN editable_kpi = 'written_dr_perc' THEN
                '
				written_aur = COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0)),
                written_sales_dollars = COALESCE(wp.written_sales_units, 0) * (COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0))),
                written_gm_dollar = (COALESCE(wp.written_sales_units, 0) * (COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0)))) - COALESCE(wp.written_sales_cost, 0),
                 written_gm_perc = ((COALESCE(wp.written_sales_units, 0) * (COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0)))) - COALESCE(wp.written_sales_cost, 0)) / NULLIF((COALESCE(wp.written_sales_units, 0) * (COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0)))), 0)
				'
            
		--looks like column name is wrong here
          WHEN editable_kpi = 'total_receipt_units' THEN

			'
				total_receipt_cost = COALESCE(wp.total_receipt_units, 0)  *  COALESCE(wp.total_receipt_auc, 0) ,
				total_receipt_msrp = COALESCE(wp.total_receipt_units, 0)  *  COALESCE(wp.total_receipt_msrp_per_unit, 0) ,
				on_order_unplaced_total_unit = COALESCE(wp.total_receipt_units, 0)  -  COALESCE(wp.on_order_placed_total_unit, 0) ,
				on_order_unplaced_total = ( COALESCE(wp.total_receipt_units, 0)  *  COALESCE(wp.total_receipt_auc, 0)) - COALESCE(wp.on_order_placed_total, 0) ,
				on_order_unplaced_total_auc = ((COALESCE(wp.total_receipt_units, 0) * COALESCE(wp.total_receipt_auc, 0)) - COALESCE(wp.on_order_placed_total, 0)) / NULLIF(COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0),0)
				
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
