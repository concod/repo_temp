--liquibase formatted sql
--changeset aman.pareek:oms_deep_dive_transform_data_helper_storev2 runOnChange:true stripComments:false splitStatements:false context:MTP-58684 labels:oms_deep_dive_transform_data_helper_storev2
--comment: Added oms_deep_dive_transform_data_helper_store 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.store_deep_dive_transform_data_helper(jsonb, text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.store_deep_dive_transform_data_helper(product_filter jsonb, start_date text, end_date text, store_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(product_code character varying, vendor_code character varying, store_code character varying)
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_paf_condition TEXT := '';
    where_saf_condition text := '';
    transform_query text := '';
BEGIN
    -- Generate the WHERE conditions from the product_filter JSONB
    where_paf_condition := inventory_smart.form_main_table_filters('ph_master', product_filter);
    where_saf_condition := inventory_smart.form_main_table_filters('ph_master', store_filter);
   
    IF where_saf_condition IS NULL OR where_saf_condition = '' THEN
        where_saf_condition := 'WHERE 1=1';
    END if;
   
    RAISE NOTICE 'Where PAF Condition: %', where_paf_condition;
    RAISE NOTICE 'Where SAF Condition: %', where_saf_condition;

    -- Construct the dynamic SQL query
    transform_query := '
	with filtered_store_data as (
		select store_code
		from global.store_attributes_filter 
		' || where_saf_condition || '
		and active = True and special_classification = ''STORE''
	)
	SELECT DISTINCT oor.product_code::varchar, oor.vendor_code::varchar, oor.store_code::varchar
		from inventory_smart.oms_orders_recommended_store oor
		INNER JOIN filtered_store_data ON oor.store_code = filtered_store_data.store_code
		' || where_paf_condition || '
    	--WHERE oor.fiscal_year_week BETWEEN ''' || start_date || ''' AND ''' || end_date || ''';
    	';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
