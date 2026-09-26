--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:insert_placeholder_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfacts
--comment: initial changeset for itemfacts
--rollback: SELECT 1


DROP FUNCTION IF EXISTS item_smart.itemfact_edit_regular_baseline_discount(date, date, jsonb, float8, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_regular_baseline_discount(sdate date, edate date, filters jsonb, updated_baseline_discount double precision, dept text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    
	itemfact_sku_table_name text;
 	itemfact_sku_week_table_name text;

	wp_table_name text;
	iaf_table_name text;

	old_baseline_discount float;

	start_week_id_var int;

	cur_date date;

	channels text[] := '{}';

	channel TEXT; -- Variable to iterate over channels

	w2d_query_text TEXT;

	
	
BEGIN

	channels := ARRAY['Ecom', 'Store'];
   -- RAISE NOTICE 'Channels are : %', channels;

	itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
 	itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
	wp_table_name := 'item_smart.wp_master_' || dept;
	iaf_table_name := 'item_smart.iaf_master_' || dept;
	
    -- Build the WHERE clause dynamically from the filters
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (SELECT string_agg(quote_literal(value), ', ')
                   FROM jsonb_array_elements_text(filter->'value') value);
        operator := filter->>'operator';

        -- Append to the where_clause
        IF where_clause = '' THEN
            where_clause := attribute_name || ' ' || operator || ' (' || values || ')';
        ELSE
            where_clause := where_clause || ' AND ' || attribute_name || ' ' || operator || ' (' || values || ')';
        END IF;
    END LOOP;

    --RAISE NOTICE 'Generated WHERE clause: %', where_clause;


	
	

    -- Retrieve the hierarchy code based on the dynamic WHERE clause
    EXECUTE format(
            'SELECT hierarchy_code FROM item_smart.mv_product_hierarchies_filter WHERE %s UNION ALL SELECT hierarchy_code FROM item_smart.placeholders_info WHERE %s LIMIT 1',
             where_clause, where_clause
        )
        INTO hierarchy_code_var;



	-- Check if the hierarchy code was found
    IF hierarchy_code_var IS NOT NULL THEN

	--get week id of cur date considering it as start week of unactualized period

	cur_date := CURRENT_DATE;
   -- RAISE NOTICE 'Current date is: %', cur_date;

	start_week_id_var := item_smart.get_lag_week(0,cur_date);
	
	--RAISE NOTICE 'Current Week id %', start_week_id_var;

	


		-- Retrieve old discount rate
         EXECUTE format(
            'SELECT baseline_discount FROM %s WHERE hierarchy_code = %L ', 
             itemfact_sku_table_name, hierarchy_code_var
        )
        INTO old_baseline_discount;


        -- Update the exit_date in the sku table for the matching hierarchy_code
        EXECUTE format('UPDATE %s SET baseline_discount = %L WHERE hierarchy_code = %L',itemfact_sku_table_name, updated_baseline_discount, hierarchy_code_var);
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new baseline discount.', updated_row_count;


		--UPDATING IAF LINE

/*		RAISE NOTICE 'Executing update query: %', 
           format('UPDATE %s wp SET written_dr_perc = %L WHERE wp.hierarchy_code = %L and wp.written_dr_perc = %L',
           wp_table_name, 
           updated_baseline_discount, 
           hierarchy_code_var, 
           old_baseline_discount);*/

		RAISE NOTICE 'Executing update query: %',
    format(
        'UPDATE %s wp 
         SET written_dr_perc = %s::float 
         WHERE wp.hierarchy_code = %L 
         AND abs(wp.written_dr_perc - %s::float) < 0.000001 
         AND wp.current_week > %L',
        iaf_table_name,
        updated_baseline_discount,
        hierarchy_code_var,
        old_baseline_discount,
        start_week_id_var
    );

		--RAISE NOTICE 'Executing update query for table: %, hierarchy_code: %, old_discount: %',iaf_table_name,hierarchy_code_var,updated_baseline_discount;

		EXECUTE format('UPDATE %s wp SET written_dr_perc = %L WHERE wp.hierarchy_code = %L and abs(wp.written_dr_perc - %s::float) < 0.000001  and wp.current_week > %L',iaf_table_name, updated_baseline_discount, hierarchy_code_var, old_baseline_discount,start_week_id_var );

		--UPDATING DEPENDENT KPIS FOR DR PERC IAF LINE




/*RAISE NOTICE 'Executing update query for dependents: %',
    format('UPDATE %s wp SET
	 		written_aur = wp.written_air * (1 - wp.written_dr_perc),
	 		written_sales_dollars = wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc)),
			written_gm_dollar = (wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
       		written_gm_perc = ((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / NULLIF((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))), 0)
	 WHERE wp.hierarchy_code = %L and wp.written_dr_perc = %L and wp.current_week > %L',
           wp_table_name,
           hierarchy_code_var,
			updated_baseline_discount,
start_week_id_var
			);*/
		
		
		EXECUTE format(
    'UPDATE %s wp SET
        written_aur = wp.written_air * (1 - wp.written_dr_perc),
        written_sales_dollars = wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc)),
        written_gm_dollar = (wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
        written_gm_perc = ((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / 
                         NULLIF((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))), 0)
    WHERE wp.hierarchy_code = %L AND abs(wp.written_dr_perc - %s::float) < 0.000001  and wp.current_week > %L',
    iaf_table_name,
    hierarchy_code_var,
    updated_baseline_discount,
	start_week_id_var
		);


    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    RAISE NOTICE 'Number of rows updated for IAF line: %', updated_row_count;
		
	   --UPDATING WP LINE

/*		RAISE NOTICE 'Executing update query: %', 
           format('UPDATE %s wp SET written_dr_perc = %L WHERE wp.hierarchy_code = %L and wp.written_dr_perc = %L',
           wp_table_name, 
           updated_baseline_discount, 
           hierarchy_code_var, 
           old_baseline_discount);*/

		RAISE NOTICE 'Executing update query for table: %, hierarchy_code: %, old_discount: %',wp_table_name,hierarchy_code_var,updated_baseline_discount;

		EXECUTE format('UPDATE %s wp SET written_dr_perc = %L WHERE wp.hierarchy_code = %L and abs(wp.written_dr_perc - %s::float) < 0.000001  and wp.current_week > %L ',wp_table_name, updated_baseline_discount, hierarchy_code_var, old_baseline_discount,start_week_id_var );

		--UPDATING DEPENDENT KPIS FOR DR PERC WP LINE




		/*RAISE NOTICE 'Executing update query for dependents: %',
    format('UPDATE %s wp SET
	 		written_aur = wp.written_air * (1 - wp.written_dr_perc),
	 		written_sales_dollars = wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc)),
			written_gm_dollar = (wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
       		written_gm_perc = ((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / NULLIF((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))), 0)
	 WHERE wp.hierarchy_code = %L and wp.written_dr_perc = %L',
           wp_table_name,
           hierarchy_code_var,
			updated_baseline_discount
			);*/
		
		
		EXECUTE format(
    'UPDATE %s wp SET
        written_aur = wp.written_air * (1 - wp.written_dr_perc),
        written_sales_dollars = wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc)),
        written_gm_dollar = (wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost,
        written_gm_perc = ((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))) - wp.written_sales_cost) / 
                         NULLIF((wp.written_sales_units * (wp.written_air * (1 - wp.written_dr_perc))), 0)
    WHERE wp.hierarchy_code = %L AND abs(wp.written_dr_perc - %s::float) < 0.000001  and wp.current_week > %L',
    wp_table_name,
    hierarchy_code_var,
    updated_baseline_discount,
	start_week_id_var
		);


    GET DIAGNOSTICS updated_row_count = ROW_COUNT;
    RAISE NOTICE 'Number of rows updated for IAF line: %', updated_row_count;
		


	--updating delivery kpis in wp line

	FOREACH channel IN ARRAY channels loop
		w2d_query_text := format('SELECT item_smart.w2d_edit(%L, %L, %L, %L, %L, %L,%L)', sdate, edate, filters, dept, channel,'written_discount_%','sku');
		RAISE NOTICE 'Called w2d_edit for channel: %', channel;
		EXECUTE w2d_query_text;
    	
  	END LOOP;
		

    ELSE
        RAISE NOTICE 'No hierarchy_code found for given filters.';
    END IF;

    -- Return the number of rows updated in itemfact_sku table
    RETURN updated_row_count;
END;
$function$
;
