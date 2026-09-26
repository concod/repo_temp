--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:extensions_update4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Added selected_linked_store_codes to the function

DROP FUNCTION IF EXISTS oms.oms_matrix_summary_set_all(text, text, _varchar, _varchar, text, _varchar);
DROP FUNCTION IF EXISTS oms.oms_matrix_summary_set_all(text, text, _varchar, _varchar, text);

CREATE OR REPLACE FUNCTION oms.oms_matrix_summary_set_all(set_all_on text, update_level text, week_month_list integer[], styles_list character varying[], user_id text, selected_linked_store_codes character varying[] DEFAULT NULL)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    time_period_column text;     -- Column name for time period (fiscal_year_week or fiscal_year_month)
    source_quantity_field text;  -- Field name for quantity source
    source_eaches_field text;    -- Field name for eaches source
    updated_at timestamp := CURRENT_TIMESTAMP;
    sql_query text;              -- Variable to store the SQL query
BEGIN
    -- Input validation
	IF set_all_on = 'raw_roq' THEN
	    source_quantity_field := 'raw_roq';
	    source_eaches_field := 'raw_roq_eaches';
	ELSIF set_all_on = 'ia_shipment_order_quantity' THEN
	    source_quantity_field := 'ia_shipment_order_quantity';
	    source_eaches_field := 'ia_shipment_order_quantity_eaches';
	ELSIF set_all_on = 'roq_unconstrained' THEN
	    source_quantity_field := 'roq_unconstrained';
	    source_eaches_field := 'roq_unconstrained_eaches';
	ELSIF set_all_on = 'roq_constrained' THEN
	    source_quantity_field := 'roq_constrained';
	    source_eaches_field := 'roq_constrained_eaches';
    ELSE
        -- Raise an exception if the value is not supported
        RAISE EXCEPTION 'Unsupported value for set_all_on: %', set_all_on
        USING HINT = 'Supported values are: Base ROQ, Shipment Optimized ROQ, Vendor Optimized ROQ, Constrained ROQ';
    END IF;
    
    
    IF update_level NOT IN ('fiscal_year_week', 'fiscal_year_month') THEN
        RAISE EXCEPTION 'Invalid update_level: %. Must be one of: fiscal_year_week, fiscal_year_month', update_level;
    END IF;
    
    -- Set the time period column based on update level
    time_period_column := update_level;
    
    
    -- Store the formatted SQL query in a variable
    sql_query := format('
        UPDATE oms.oms_orders_recommended
        SET 
            order_quantity = %I,
            order_quantity_eaches = %I,
            updated_by = %L,
            updated_at = %L
        WHERE 
            article = ANY(%L)
            AND %I = ANY(%L)
            AND order_status_id::int = 0
            AND (%L::varchar[] IS NULL OR array_length(%L::varchar[], 1) IS NULL OR loc_code = ANY(%L::varchar[]))
    ', source_quantity_field, source_eaches_field, user_id, updated_at, styles_list, time_period_column, week_month_list, selected_linked_store_codes, selected_linked_store_codes, selected_linked_store_codes);
    
    -- Execute the SQL query
    EXECUTE sql_query;
    
    -- Print the SQL query
    RAISE NOTICE 'Executing SQL query: %', sql_query;
    
    RAISE NOTICE 'Updated records for % styles_list across % time periods using % as source', 
        array_length(styles_list, 1), array_length(week_month_list, 1), set_all_on;
END;
$function$
;



