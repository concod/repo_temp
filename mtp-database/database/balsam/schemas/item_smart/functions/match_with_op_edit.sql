--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:match_with_chg_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_op_edit function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS item_smart.match_with_op_edit(date, date, jsonb, text, _text, _text, text, text);

CREATE OR REPLACE FUNCTION item_smart.match_with_op_edit(sdate date, edate date, filters jsonb, dept text, channels text[], subchannels text[], editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   wp_table_name TEXT;
   op_table_name TEXT;
   select_query TEXT;
   filter JSONB;
   attribute_name TEXT;
   values TEXT;
   operator TEXT;
   update_query1 TEXT;
   update_query2 TEXT;
  	is_special_order_condition text;
	_st timestamptz;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
	inv_query_text TEXT;
	rows_updated_for_inv_adj INT := 0;
	channel TEXT;
	v_startweek_id INT;
	v_endweek_id   INT;

begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_data;
   wp_table_name := 'item_smart.wp_master_' || dept;
   op_table_name := 'item_smart.op_master_' || dept;
  	
   IF editable_kpi IN ('return_perc') THEN
   	  channels := ARRAY['EComm'];
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

   -- perform sp log
   perform global.sp_log(v_gen_random_uuid, 'item_smart.match_with_op_edit', 'before executing select_query', select_query, jsonb_build_object('sdate',$1, 'edate',$2, 'filters',$3, 'dept',$4, 'channels',$5, 'subchannels',$6, 'editable_kpi',$7, 'planing_level',$8));
 
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

        UNION

        SELECT DISTINCT 
            fdm.fiscal_year_week,
            pa.hierarchy_code 
        FROM item_smart.placeholders_info pa
        CROSS JOIN "global".fiscal_date_mapping fdm
        WHERE %s
        AND "date" BETWEEN %L AND %L
    ),
    op_data AS (
        SELECT
            id.hierarchy_code,
            id.current_week,
            id.channel,
            id.sub_channel,
            id.written_sales_dollars,
            id.written_sales_units,
            id.written_dr_perc,
			id.written_auc,  
			id.rtp_sales_units_perc, 
			id.zero_dollar_orders_perc,
			id.warranty_sales_units_perc,
			id.on_order_unplaced_total_unit
        FROM %s id
        JOIN hierarchy_data hd
        ON hd.hierarchy_code = id.hierarchy_code
           AND hd.fiscal_year_week = id.current_week
        WHERE id.channel = ANY(%L)
    ',
    where_clause,
    sdate,
    edate,
    where_clause,
    sdate,
    edate,
    op_table_name,
    channels
);

    -- Add the sub_channel filter if subchannels are provided
    IF array_length(subchannels, 1) > 0 THEN
        select_query := select_query || ' AND id.sub_channel = ANY(%L)';
        select_query := format(select_query, subchannels);  -- format subchannels into the query
    END IF;

    -- Final part of the query
    select_query := select_query || '
        )
        SELECT * FROM op_data;
    ';
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;

	RAISE NOTICE '_time: %,seclect stament ', (clock_timestamp() - _st);

	_st := clock_timestamp();

	
	CREATE INDEX idx_complete_data ON complete_data(hierarchy_code, current_week, channel, sub_channel);

 
 	 RAISE NOTICE '_time: %,indexing', (clock_timestamp() - _st);  

    _st := clock_timestamp();
   update_query1 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel
		AND wp.sub_channel = cd.sub_channel
        AND wp.actualised = false
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
		   WHEN editable_kpi = 'written_auc' THEN
              'written_auc = cd.written_auc'
           WHEN editable_kpi = 'rtp_sales_units_perc' THEN
              'rtp_sales_units_perc = cd.rtp_sales_units_perc'

		   WHEN editable_kpi = 'zero_dollar_orders_perc' THEN
              'zero_dollar_orders_perc = cd.zero_dollar_orders_perc'
		   WHEN editable_kpi = 'warranty_sales_units_perc' THEN
              'warranty_sales_units_perc = cd.warranty_sales_units_perc'
           WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN
              'on_order_unplaced_total_unit = cd.on_order_unplaced_total_unit'

          
           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
   
      -- perform sp log
      perform global.sp_log(v_gen_random_uuid, 'item_smart.match_with_op_edit', 'After executing update_query1', update_query1, jsonb_build_object('sdate',$1, 'edate', $2, 'filters',$3, 'dept',$4, 'channels',$5, 'subchannels',$6, 'editable_kpi',$7, 'planing_level',$8));
      
      RAISE NOTICE '_time: %,update 1 ', (clock_timestamp() - _st);

  _st := clock_timestamp();
  update_query2 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.hierarchy_code = cd.hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel
		AND wp.sub_channel = cd.sub_channel
        AND wp.actualised = false
		',
 		
 		wp_table_name,
 		CASE
            WHEN editable_kpi = 'written_sales_dollars' THEN
                'discount = (COALESCE(wp.written_dr_perc,0) * COALESCE(wp.written_sales_dollars,0)) / (NULLIF(1 - COALESCE(wp.written_dr_perc, 0), 0)),
                written_sales_units = COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur, 0), 0),
				written_gm_dollar = COALESCE(wp.written_sales_dollars, 0) - ((COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur, 0), 0)) * COALESCE(wp.written_auc, 0)),
				written_sales_cost = (COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_aur, 0), 0)) * COALESCE(wp.written_auc, 0)
			'
			
           WHEN editable_kpi = 'written_sales_units' THEN
              'written_sales_dollars = COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0),
              discount = (COALESCE(wp.written_dr_perc,0) * COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0)) / (NULLIF(1 - COALESCE(wp.written_dr_perc, 0), 0)),
				written_sales_cost = COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_auc, 0),
				written_gm_dollar = ((COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_aur, 0)) - (COALESCE(wp.written_sales_units, 0) * COALESCE(wp.written_auc, 0)))
			'
           WHEN editable_kpi = 'written_dr_perc' THEN
                'discount = (COALESCE(wp.written_dr_perc,0) * COALESCE(wp.written_sales_dollars,0)) / (NULLIF(1 - COALESCE(wp.written_dr_perc, 0), 0)),
			     written_aur = COALESCE(wp.written_air, 0) * (1 - (COALESCE(wp.written_dr_perc,0))),
                written_sales_units= COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_air, 0) * (1 - (COALESCE(wp.written_dr_perc,0))), 0),			    
                written_sales_cost= (COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_air, 0) * (1 - (COALESCE(wp.written_dr_perc,0))), 0)) * COALESCE(wp.written_auc, 0),
			    written_gm_dollar= COALESCE(wp.written_sales_dollars, 0) - ((COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_air, 0) * (1 - (COALESCE(wp.written_dr_perc,0))), 0)) * COALESCE(wp.written_auc, 0)),
			    written_gm_perc=(COALESCE(wp.written_sales_dollars, 0) - ((COALESCE(wp.written_sales_dollars, 0) / NULLIF(COALESCE(wp.written_air, 0) * (1 - (COALESCE(wp.written_dr_perc,0))), 0)) * COALESCE(wp.written_auc, 0))) / NULLIF(COALESCE(wp.written_sales_dollars, 0), 0)
'
            

         	WHEN editable_kpi = 'written_auc' THEN
               'written_sales_cost= (COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0),
			    written_gm_dollar= (COALESCE(wp.written_sales_dollars, 0)) - ((COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0)),
			    written_gm_perc= (COALESCE(wp.written_sales_dollars, 0)) - ((COALESCE(wp.written_sales_units, 0)) * COALESCE(wp.written_auc, 0))/ NULLIF(COALESCE(wp.written_sales_dollars, 0), 0)
'
		
			WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN
				'on_order_unplaced_total_cost= (COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)),
				    total_receipt_units= (COALESCE(wp.on_order_unplaced_total_unit, 0) + COALESCE(wp.on_order_placed_total_unit, 0)),
				    total_receipt_cost= (COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)) + COALESCE(wp.on_order_placed_total_cost, 0),
				    total_receipt_auc= ((COALESCE(wp.on_order_unplaced_total_unit, 0) * COALESCE(wp.auc_landed, 0)) + COALESCE(wp.on_order_placed_total_cost, 0)) / NULLIF((COALESCE(wp.on_order_unplaced_total_unit, 0) + COALESCE(wp.on_order_placed_total_unit, 0)),0)
'

           ELSE 'NULL'
       END
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
  -- run only if kpi lies in giving list otherwise no need, because we are calling different SP below.
		IF editable_kpi IN ('written_auc','written_sales_units', 'on_order_unplaced_total_unit','written_sales_dollars','written_dr_perc') THEN
	  		EXECUTE update_query2;
	        RAISE NOTICE 'Ran UPDATE query 2: %', update_query2;
	        RAISE NOTICE '_time: %,update 2 ', (clock_timestamp() - _st);
		END IF;


	-- getting week id to pass in update_inv_adj_metrics_v3 SP.
	SELECT fiscal_year_week
	INTO v_startweek_id
	FROM global.fiscal_date_mapping
	WHERE calendar_date = sdate;
	
	SELECT fiscal_year_week
	INTO v_endweek_id
	FROM global.fiscal_date_mapping
	WHERE calendar_date = edate;

	-- Iterate over the channels and call update_inv_adj_metrics_v3 for each channel to update Inv Adj Metrics
    FOREACH channel IN ARRAY channels LOOP

		IF editable_kpi IN ('written_sales_$','written_sales_units', 'discount_$','written_sales_dollars','written_dr_perc') THEN
			inv_query_text := format('SELECT item_smart.update_inv_adj_metrics_v3(%L,%L, %L, %L, %L, %L, %L, %L)', 
			            'all', sdate, edate, v_startweek_id, v_endweek_id, filters, dept, channel);
			

		ELSEIF editable_kpi IN ('rtp_sales_units_perc', 'warranty_sales_units_perc', 'zero_dollar_orders_perc') THEN
			inv_query_text := format('SELECT item_smart.update_inv_adj_metrics_v3(%L,%L, %L, %L, %L, %L, %L, %L)', 
			            editable_kpi, sdate, edate, v_startweek_id, v_endweek_id, filters, dept, channel);
		END IF;
		RAISE NOTICE 'Called update_inv_adj_metrics_v3 for channel: %', channel;
		EXECUTE inv_query_text INTO rows_updated_for_inv_adj;

    END LOOP;
  
 
   -- Update the row count
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;

    -- perform sp log
       perform global.sp_log(v_gen_random_uuid, 'item_smart.match_with_op_edit', 'After executing update_query2', update_query2, jsonb_build_object('sdate',$1, 'edate',$2, 'filters',$3, 'dept',$4, 'channels',$5, 'subchannels',$6, 'editable_kpi',$7, 'planing_level',$8));

 
  RETURN updated_row_count;
END;
$function$
;
