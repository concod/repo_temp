--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:itemfact_launch_date_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:itemfact_launch_date-1
--comment: initial changeset for itemfact_launch_date-1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.itemfact_edit_regular_launch_date(date, date, jsonb, date, text);

CREATE OR REPLACE FUNCTION item_smart.itemfact_edit_regular_launch_date(sdate date, edate date, filters jsonb, updated_launch_date date, dept text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    hierarchy_code_var INTEGER;
    updated_row_count INTEGER := 0;
    sku_week_updated_count INTEGER := 0;
    where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;
    exit_week_id INTEGER;
    launch_week_id INTEGER;
    markdown_week_id INTEGER;
	itemfact_sku_table_name text;
 	itemfact_sku_week_table_name text;
	wp_master_table_name text;
	iaf_master_table_name text;
	old_launch_week_id INTEGER;
	launch_date_query TEXT;

	launch_date_var date;
	exit_date_var date; 
	future_date_var date;
	markdown_date_var date;
	
	exit_date_var_reg_weeks date;
	active_weeks_var integer;

	ph_name text;

	channel_array text[]; -- can remove if FE sends channel as payload
	
BEGIN
	
	future_date_var := current_date + INTERVAL '30 months';
	itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
 	itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
	wp_master_table_name := 'item_smart.wp_master_' || dept;
	iaf_master_table_name := 'item_smart.iaf_master_' || dept;
	
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

    RAISE NOTICE 'Generated WHERE clause: %', where_clause;

    -- Retrieve the hierarchy code based on the dynamic WHERE clause
    EXECUTE format(
            'SELECT product_code,hierarchy_code FROM item_smart.placeholders_info WHERE %s LIMIT 1',
             where_clause
        )
        INTO ph_name,hierarchy_code_var;

    -- Check if the hierarchy code was found
    IF hierarchy_code_var IS NOT NULL THEN

		--old exit-week-id

		EXECUTE format('SELECT fdm.fiscal_year_week FROM global.fiscal_date_mapping fdm WHERE fdm.calendar_date = %L::date LIMIT 1', (SELECT launch_date FROM item_smart.itemfact_sku WHERE hierarchy_code = hierarchy_code_var LIMIT 1))
        INTO old_launch_week_id;

		RAISE NOTICE 'Older launch-week-id % ', old_launch_week_id;
		
        -- Update the exit_date in the sku table for the matching hierarchy_code
        EXECUTE format('UPDATE %s SET launch_date = %L WHERE hierarchy_code = %L',itemfact_sku_table_name, updated_launch_date, hierarchy_code_var);
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows with new launch_date.', updated_row_count;

    		-- Update the exit_date in the sku table for the matching hierarchy_code
    	EXECUTE format('UPDATE item_smart.placeholders_info SET entry_date = %L WHERE hierarchy_code = %L', 
        updated_launch_date, hierarchy_code_var);
    	GET DIAGNOSTICS updated_row_count = ROW_COUNT;
		RAISE NOTICE 'Updated % rows with new launch_date.', updated_row_count;

		--get channels from iaf
		EXECUTE format(
   				 'SELECT ARRAY(
        					SELECT DISTINCT channel 
        				FROM %s
        			WHERE hierarchy_code = %L
    				)',
				iaf_master_table_name,
    			hierarchy_code_var
			) INTO channel_array;

        RAISE NOTICE 'channels %', channel_array;


        -- Convert the exit_date, launch_date, and markdown_date to week_id using fiscal_date_mapping
        -- Convert exit_date to week_id
        EXECUTE format('SELECT fdm.fiscal_year_week FROM global.fiscal_date_mapping fdm WHERE fdm.calendar_date = %L::date LIMIT 1', (SELECT exit_date FROM item_smart.itemfact_sku WHERE hierarchy_code = hierarchy_code_var LIMIT 1))
        INTO exit_week_id;

        -- Convert launch_date to week_id (assuming launch_date exists in itemfact_sku table)
        EXECUTE format('SELECT fdm.fiscal_year_week FROM global.fiscal_date_mapping fdm WHERE fdm.calendar_date = %L::date LIMIT 1', (SELECT launch_date FROM item_smart.itemfact_sku WHERE hierarchy_code = hierarchy_code_var LIMIT 1))
        INTO launch_week_id;

        -- Convert markdown_date to week_id (assuming markdown_date exists in itemfact_sku table)
        EXECUTE format('SELECT fdm.fiscal_year_week FROM global.fiscal_date_mapping fdm WHERE fdm.calendar_date = %L::date LIMIT 1', (SELECT markdown_date FROM item_smart.itemfact_sku WHERE hierarchy_code = hierarchy_code_var LIMIT 1))
        INTO markdown_week_id;

        -- Update purchase_status in itemfact_sku_week based on week_id comparisons
        EXECUTE format('
            UPDATE %s AS sku_week
            SET purchase_status = CASE
                WHEN sku_week.current_week > COALESCE(%L, 999999) THEN ''Discontinued''
                WHEN sku_week.current_week BETWEEN %L AND COALESCE(%L, 999999) THEN ''Markdown''
                WHEN sku_week.current_week BETWEEN %L AND COALESCE(%L, 999999) THEN ''Active''
                ELSE sku_week.purchase_status  -- Retain existing status if none of the conditions match
            END
            FROM %s AS sku
            WHERE sku_week.hierarchy_code = sku.hierarchy_code
              AND sku.hierarchy_code = %L',
            itemfact_sku_week_table_name,exit_week_id, markdown_week_id, exit_week_id, launch_week_id, markdown_week_id,itemfact_sku_table_name,  hierarchy_code_var);

        GET DIAGNOSTICS sku_week_updated_count = ROW_COUNT;

        RAISE NOTICE 'Updated % rows in itemfact_sku_week with new purchase_status.', sku_week_updated_count;


		--NEW LOGIC FOR REG WEEKS

		EXECUTE format('SELECT launch_date,markdown_date,exit_date FROM %s WHERE hierarchy_code = %s LIMIT 1', itemfact_sku_table_name,hierarchy_code_var)
        INTO  launch_date_var, markdown_date_var,exit_date_var;

		RAISE NOTICE 'VALUES launch % and % mark and exit %', launch_date_var,markdown_date_var,exit_date_var ;

    
       -- Use COALESCE to assign the first non-NULL value
        exit_date_var_reg_weeks := COALESCE(markdown_date_var,exit_date_var,future_date_var);

		EXECUTE format('select count(distinct fiscal_year_week) from global.fiscal_date_mapping fdm where fdm.calendar_date between %L and %L', launch_date_var,exit_date_var_reg_weeks)


		INTO active_weeks_var;



		-- update no of reg weeks
		EXECUTE format('
    		UPDATE %s
    			SET no_of_reg_weeks = %s
    				WHERE hierarchy_code = %s',
				itemfact_sku_table_name,
				active_weeks_var,
    			hierarchy_code_var);  -- Update for specific hierarchy_code
        GET DIAGNOSTICS updated_row_count = ROW_COUNT;

		--generate cadence with latest dates
    	EXECUTE format(
        				'SELECT * FROM item_smart.placeholder_cadence_generation(%L, %L::text[])',
        					ph_name,
        				channel_array
    	);

		
    ELSE
        RAISE NOTICE 'No hierarchy_code found for given filters.';
    END IF;

    -- Return the number of rows updated in itemfact_sku table
    RETURN sku_week_updated_count;
END;
$function$
;