--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with_lf runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_lf
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
	_st timestamptz;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_data;
   wp_table_name := 'item_smart.wp_master_' || dept;
   lf_table_name := 'item_smart.lf_master_' || dept;
  	
   IF editable_kpi IN ('total_receipt_units') THEN
   	  channels := ARRAY['DC'];
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
_st := clock_timestamp();
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
            id.return_perc,
            id.total_receipt_units
        FROM %s id
        JOIN hierarchy_data hd
        ON hd.hierarchy_code = id.hierarchy_code
           AND hd.fiscal_year_week = id.current_week
        WHERE id.channel = ANY(%L) )

	select * from lf_data
    '

,
    where_clause,
    sdate,
    edate,
    lf_table_name,
    channels
);

   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;

	RAISE NOTICE '_time: %,seclect stament ', (clock_timestamp() - _st);

	_st := clock_timestamp();

	--creating a index on temp table
	--CREATE INDEX idx_cd_hierarchy_code ON complete_data (hierarchy_code);
  --  CREATE INDEX idx_cd_current_week ON complete_data (current_week);
	--CREATE INDEX idx_cd_channel ON complete_data (channel);

--	CREATE INDEX idx_cmplt_data on complete_data USING btree(hierarchy_code,current_week,channel);
	--CREATE INDEX idx_wp_master_hierarchy ON item_smart.wp_master_shapewear__ia_char_20intimates(hierarchy_code, current_week, channel);
	CREATE INDEX idx_complete_data ON complete_data(hierarchy_code, current_week, channel);

 
 	 RAISE NOTICE '_time: %,indexing', (clock_timestamp() - _st);  

    _st := clock_timestamp();
   update_query1 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel
		
 '
		 ,
 		
 		wp_table_name,
 		CASE
           WHEN editable_kpi = 'written_sales_dollars' THEN
               'written_sales_dollars = cd.written_sales_dollars'
           WHEN editable_kpi = 'written_sales_units' THEN
              'written_sales_units = cd.written_sales_units'
           WHEN editable_kpi = 'written_dr_perc' THEN
              'written_dr_perc = cd.written_dr_perc'
		   WHEN editable_kpi = 'return_perc' THEN
              'return_perc = cd.return_perc'
           WHEN editable_kpi = 'total_receipt_units' THEN
              'total_receipt_units = cd.total_receipt_units'

          
           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
RAISE NOTICE '_time: %,update 1 ', (clock_timestamp() - _st);

  _st := clock_timestamp();
  update_query2 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel
		
		',
 		
 		wp_table_name,
 		CASE
           WHEN editable_kpi = 'written_sales_dollars' THEN
				
				'
					written_sales_units = COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0),
					written_aus = COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0),
					written_sales_cost = (COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0) ) * COALESCE(wp.written_auc, 0),
					written_gm_dollar = COALESCE(wp.written_sales_dollars, 0) - (COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0) ) * COALESCE(wp.written_auc, 0),
					return_units = (COALESCE(wp.return_perc, 0) * COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0), 0)) ,
					return_dollars = (((COALESCE(wp.return_perc, 0) * COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0), 0))) * (COALESCE(wp.written_aur / (1 + 0.15), 0)) ),
					net_sales_units = ((COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0)) - ((COALESCE(wp.return_perc, 0) * COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0), 0)))),
					net_sales_dollars = COALESCE(wp.written_sales_dollars, 0) - ((((COALESCE(wp.return_perc, 0) * COALESCE(COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur / (1 + 0.15), 0), 0), 0))) * (COALESCE(wp.written_aur / (1 + 0.15), 0)) ))
				'
				
          WHEN editable_kpi = 'written_sales_units' THEN

				'
					written_aus = COALESCE(wp.written_sales_units, 0) ,
                    written_sales_dollars = COALESCE(wp.written_sales_units, 0) * (COALESCE(wp.written_aur / (1 + 0.15), 0)),
					written_sales_cost =  COALESCE(wp.written_sales_units, 0)  * COALESCE(wp.written_auc, 0) ,				
					written_gm_dollar =  ( (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - (COALESCE(wp.written_sales_units, 0)  * COALESCE(wp.written_auc, 0))  ),
					written_gm_perc = ( (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - (COALESCE(wp.written_sales_units, 0)  * COALESCE(wp.written_auc, 0))  ) / NULLIF( COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0),0),
					return_units = COALESCE(wp.return_perc, 0) *  COALESCE(wp.written_sales_units, 0) ,
					return_dollars = ( COALESCE(wp.return_perc, 0) *  COALESCE(wp.written_sales_units, 0))  * (COALESCE(wp.written_aur / (1 + 0.15), 0)),
					net_sales_units =  COALESCE(wp.written_sales_units, 0) -  (COALESCE(wp.return_perc, 0) *  COALESCE(wp.written_sales_units, 0)),
					net_sales_dollars = (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - (( COALESCE(wp.return_perc, 0) *  COALESCE(wp.written_sales_units, 0))  * (COALESCE(wp.written_aur / (1 + 0.15), 0)))
				'
	
           WHEN editable_kpi = 'written_dr_perc' THEN

				'
					written_aur = COALESCE(wp.written_air, 0) * (1 - COALESCE(wp.written_dr_perc, 0)),
                    written_sales_dollars = COALESCE(wp.written_sales_units, 0) * COALESCE((wp.written_air * (1 - COALESCE(wp.written_dr_perc, 0))) / 1.15, 0),
					written_gm_dollar = (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - COALESCE(wp.written_sales_cost, 0),
					written_gm_perc = ((COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - COALESCE(wp.written_sales_cost, 0)) / NULLIF(( COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)),0),
					return_dollars = (COALESCE(wp.return_units, 0) )  * (COALESCE(wp.written_aur / (1 + 0.15), 0)),
					net_sales_dollars = (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur / (1 + 0.15), 0)) - ((COALESCE(wp.return_units, 0) )  * (COALESCE(wp.written_aur / (1 + 0.15), 0)))
				'

                
  

         	WHEN editable_kpi = 'return_perc' THEN

				'
					return_units = (COALESCE(wp.return_perc, 0) * COALESCE(wp.written_sales_units, 0)),
					return_dollars = ((COALESCE(wp.return_perc, 0) * COALESCE(wp.written_sales_units, 0))) * ((COALESCE(wp.written_aur / (1 + 0.15), 0))),
					net_sales_units = ( COALESCE(wp.written_sales_units, 0)) - ((COALESCE(wp.return_perc, 0) * COALESCE(wp.written_sales_units, 0))),
					net_sales_dollars = (COALESCE(wp.written_sales_dollars, 0)) - (((COALESCE(wp.return_perc, 0) * COALESCE(wp.written_sales_units, 0))) * ((COALESCE(wp.written_aur / (1 + 0.15), 0))))
				'


		
           WHEN editable_kpi = 'total_receipt_units' THEN
			
			
             '	on_order_unplaced_total_unit = (COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0)),
				on_order_unplaced_total = ((COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0)) * COALESCE(wp.on_order_unplaced_total_auc, 0)),
				total_receipt_cost = (((COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0)) * COALESCE(wp.on_order_unplaced_total_auc, 0)) + COALESCE(on_order_placed_total, 0)),
				total_receipts_auc = (((COALESCE(wp.total_receipt_units, 0) - COALESCE(wp.on_order_placed_total_unit, 0)) * COALESCE(wp.on_order_unplaced_total_auc, 0)) + COALESCE(on_order_placed_total, 0)) / NULLIF(COALESCE(wp.total_receipt_units, 0), 0)
			 '

           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
  EXECUTE update_query2;
	RAISE NOTICE '_time: %,update 2 ', (clock_timestamp() - _st);
  
 
   -- Update the row count
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
  RETURN updated_row_count;
END;
$function$
;
