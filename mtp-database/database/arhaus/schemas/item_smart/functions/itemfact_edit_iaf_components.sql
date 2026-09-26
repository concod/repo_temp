--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:itemfact_edit_iaf_components runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_edit_iaf_components
--comment: initial changeset for itemfact_edit_iaf_components
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_iaf_components(date, date, jsonb, text, text[], text, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_iaf_components(sdate date, edate date, filters jsonb, dept text, channels text[], editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   iaf_table_name TEXT;
   iaf_cmp_table_name TEXT;
   select_query TEXT;
   filter JSONB;
   attribute_name TEXT;
   values TEXT;
   operator TEXT;
   update_query1 TEXT;
   update_query2 TEXT;
   is_special_order_condition text;
   current_condition text;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_data;
   iaf_table_name := 'item_smart.iaf_master_' || dept;
   iaf_cmp_table_name := 'item_smart.iaf_components' ;
  	
    IF editable_kpi IN ('on_order_unplaced_total_unit') THEN
   	channels := ARRAY['Warehouse'];
	ELSE
   	channels := channels;
	END IF;
   -- Build the WHERE clause dynamically from the filters
FOR filter IN
    SELECT * FROM jsonb_array_elements(filters)
LOOP
    -- Fetch the attribute name and prepend "dh." to it for SQL
    attribute_name := filter->>'attribute_name';
    attribute_name := 'dh.' || attribute_name;  -- Prepend 'dh.' to the attribute name

    -- Construct the list of values as a string
    values := (SELECT string_agg(quote_literal(value), ', ')
               FROM jsonb_array_elements_text(filter->'value') value);
    operator := filter->>'operator';

    -- Construct the condition and append it to the WHERE clause
    current_condition := attribute_name || ' ' || operator || ' (' || values || ')';

    IF where_clause = '' THEN
        where_clause := current_condition;
    ELSE
        where_clause := where_clause || ' AND ' || current_condition;
    END IF;
END LOOP;



RAISE NOTICE 'v_sql: %', where_clause;


 
-- Form the SELECT query to populate the temporary table
   select_query := format(
       '
CREATE TEMP TABLE complete_data AS
WITH components_hierarchy_data AS (
    SELECT DISTINCT
        fdm.fiscal_year_week,
        dh.product_code AS hardkit_product_code,  -- Hard Kit code
        dh.hierarchy_code AS hardkit_hierarchy_code, -- Hard Kit hierarchy
        pa.hierarchy_code AS component_hierarchy_code -- Component hierarchy
    FROM item_smart.mv_product_hierarchies_filter pa
    JOIN item_smart.mv_product_hierarchies_filter dh
      ON pa.master_hierarchy_code = dh.product_code  -- Link components to Hard Kit
    CROSS JOIN "global".fiscal_date_mapping fdm
   WHERE %s
     AND "date" BETWEEN %L AND %L
),
hkt_cmp_data AS (
   SELECT
       id.hierarchy_code,
        id.current_week,
        id.channel,
        id.written_sales_dollars,
        id.written_sales_units,
        id.written_dr_perc,
        id.on_order_unplaced_total_unit,
        id.inv_adj_units,
        id.inv_adj_cost,
		id.written_auc,
        id.inv_adj_auc,
        hd.component_hierarchy_code
   FROM %s id
   JOIN components_hierarchy_data hd
      ON hd.hardkit_hierarchy_code = id.hierarchy_code
         AND hd.fiscal_year_week = id.current_week
   WHERE id.channel =  ANY(%L)
)
select * from hkt_cmp_data
',
       where_clause,
       sdate,
       edate,
       iaf_table_name,
       channels
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;
 
 	
	update_query1 := format('
		UPDATE %s wp
			SET %s
		FROM complete_data cd
	WHERE wp.master_hierarchy_code = cd.hierarchy_code
		AND wp.hierarchy_code = cd.component_hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel',
 		
 		iaf_cmp_table_name,
 		CASE
           WHEN editable_kpi = 'written_sales_dollars' THEN
               'written_sales_dollars = (cd.written_sales_dollars * wp.written_auc) / NULLIF(cd.written_auc, 0) '
           WHEN editable_kpi = 'written_sales_units' THEN
              'written_sales_units = cd.written_sales_units'
           WHEN editable_kpi = 'written_dr_perc' THEN
              'written_dr_perc = cd.written_dr_perc'
           WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN
              'on_order_unplaced_total_unit = cd.on_order_unplaced_total_unit'
           WHEN editable_kpi = 'inv_adj_units' THEN
              'inv_adj_units = cd.inv_adj_units'
           WHEN editable_kpi = 'inv_adj_cost' THEN 
            'inv_adj_cost = (cd.inv_adj_cost * wp.inv_adj_auc) / NULLIF(cd.inv_adj_auc, 0)'
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
		WHERE wp.master_hierarchy_code = cd.hierarchy_code
		AND wp.hierarchy_code = cd.component_hierarchy_code
 		AND wp.current_week = cd.current_week
 		AND wp.channel = cd.channel',
 		
 		iaf_cmp_table_name,
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

           WHEN editable_kpi = 'on_order_unplaced_total_unit' THEN
             'total_receipt_units = wp.on_order_unplaced_total_unit + wp.on_order_placed_total_unit,
			  on_order_unplaced_total = wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc,
			  total_receipt_cost = wp.on_order_placed_total + ( wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc),
			  total_receipts_auc = ( wp.on_order_placed_total + ( wp.on_order_unplaced_total_unit * wp.on_order_unplaced_total_auc)) / NULLIF(wp.on_order_unplaced_total_unit + wp.on_order_placed_total_unit, 0)'

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