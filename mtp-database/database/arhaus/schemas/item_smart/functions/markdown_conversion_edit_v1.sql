--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:markdown_conversion runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for markdown_conversion_edit_v1
--rollback: SELECT 1

DROP FUNCTION if exists item_smart.markdown_conversion_edit_v1(date, date, jsonb, text, text,text);

CREATE OR REPLACE FUNCTION item_smart.markdown_conversion_edit_v1(sdate date, edate date, filters jsonb, dept text, editable_kpi text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   wp_table_name TEXT;
   ly_table_name TEXT;
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
   wp_table_name := 'item_smart.wp_master_' || lower(dept);
  	
   -- Build the WHERE clause dynamically from the filters
   -- Build the WHERE clause dynamically from only 'l2_name' and 'product_code'
	FOR filter IN
	    SELECT * FROM jsonb_array_elements(filters)
	LOOP
	    attribute_name := filter->>'attribute_name';
	   values := (SELECT string_agg(quote_literal(value), ', ')
	                   FROM jsonb_array_elements_text(filter->'value') value);
	    
	    -- Check if the attribute is either 'l2_name' or 'product_code'
	    IF attribute_name IN ('l2_name', 'product_code') THEN
	        
	        operator := filter->>'operator';

	        IF where_clause = '' THEN
	            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
	        ELSE
	            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
	        END IF;
	    END IF;
	   
	   -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
        IF planing_level = 'spo' and attribute_name = 'l3_name' then
        operator := filter->>'operator';
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                           FROM jsonb_array_elements_text(filter->'value') value);
            END IF;
         IF where_clause = '' THEN
           where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
       ELSE
           where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
       END IF;
        END IF;
       -- Append the where_clause
       
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
		WITH
        hierarchy_data AS (
		SELECT DISTINCT
			pa.hierarchy_code
		FROM (select hierarchy_code
				from item_smart.mv_product_hierarchies_filter 
				WHERE %s
				union all 
				select hierarchy_code
				from item_smart.placeholders_info
				WHERE %s) pa
		), 
		wp_data AS (
		   SELECT
		       id.hierarchy_code,
		       id.current_week,
		       MAX(id.current_week) OVER (PARTITION BY id.hierarchy_code) AS max_current_week,
		       id.channel,
		       COALESCE(fdm_markdown.fiscal_year_week, NULL) AS markdown_week,
		       COALESCE(fdm_exit.fiscal_year_week, NULL) AS exit_week,
		       id.bop_cost,
		       id.bop_units
		   FROM %s id
           JOIN hierarchy_data hd
   		   ON hd.hierarchy_code = id.hierarchy_code
		   JOIN item_smart.itemfact_sku ifs
		   ON ifs.hierarchy_code = id.hierarchy_code
		   LEFT JOIN global.fiscal_date_mapping fdm_markdown
		   ON fdm_markdown.calendar_date = ifs.markdown_date
		   LEFT JOIN global.fiscal_date_mapping fdm_exit
		   ON fdm_exit.calendar_date = ifs.exit_date
		   WHERE id.channel = ''Warehouse''
		),
		
		markdown_bop_data AS (
		    SELECT
		        ld.hierarchy_code,
		        ld.channel,
		        MIN(ld.current_week) OVER (PARTITION BY ld.hierarchy_code, ld.channel) AS markdown_next_week,
		        FIRST_VALUE(bop_cost) OVER (
		            PARTITION BY ld.hierarchy_code, ld.channel
		            ORDER BY ld.current_week ASC
		        ) AS markdown_next_week_bop_cost,
		        FIRST_VALUE(bop_units) OVER (
		            PARTITION BY ld.hierarchy_code, ld.channel
		            ORDER BY ld.current_week ASC
		        ) AS markdown_next_week_bop_unit
		    FROM wp_data ld
		    WHERE ld.current_week > ld.markdown_week
		),
		final_data AS (
		    SELECT
		        ld.*,
		        mnd.markdown_next_week_bop_cost,
		        mnd.markdown_next_week_bop_unit
		    FROM wp_data ld
		    LEFT JOIN (
		        SELECT DISTINCT ON (hierarchy_code, channel)
		            hierarchy_code, 
		            channel, 
		            markdown_next_week_bop_cost,
		            markdown_next_week_bop_unit
		        FROM markdown_bop_data
		        ORDER BY hierarchy_code, channel, markdown_next_week
		    ) mnd
		    ON ld.hierarchy_code = mnd.hierarchy_code
		    AND ld.channel = mnd.channel
		    WHERE ld.current_week BETWEEN (ld.markdown_week + 1)
		    AND COALESCE(ld.exit_week, ld.max_current_week)
		)
		select * from final_data
	',
       where_clause,
	   where_clause,
	   wp_table_name
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;
 
 
	update_query1 := format('
		UPDATE %s wp
    	SET markdown_conv_cost_dollar = cd.markdown_next_week_bop_cost,
        markdown_conv_cost_unit = cd.markdown_next_week_bop_unit
    	FROM complete_data cd
    	WHERE wp.hierarchy_code = cd.hierarchy_code
      	AND wp.channel = cd.channel
      	AND wp.current_week = cd.current_week',
    wp_table_name
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
  
  	
   -- Update the row count
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
  RETURN updated_row_count;
END;
$function$
;
