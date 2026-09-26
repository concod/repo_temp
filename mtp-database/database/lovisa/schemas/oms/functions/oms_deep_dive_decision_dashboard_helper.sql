--liquibase formatted sql
--changeset priyansh.gautam:oms_deep_dive_decision_dashboard_helper runOnChange:true stripComments:false splitStatements:false context:MTP-54660 labels:oms_deep_dive_decision_dashboard_helper
--comment: Created oms_deep_dive_decision_dashboard_helper
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_decision_dashboard_helper(jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_decision_dashboard_helper(product_filter jsonb, store_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(article character varying)
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
    with filtered_product_data as (
        select l4_name
        from global.product_attributes_filter
        ' || where_paf_condition || '
    ),
	filtered_store_data as (
		select store_code
		from global.store_attributes_filter 
		' || where_saf_condition || '
		and active = True and special_classification = ''WHS''
	)
	SELECT DISTINCT oor.article
    	FROM inventory_smart.oms_orders_recommended oor
    	INNER JOIN filtered_product_data ON oor.product_code = filtered_product_data.l4_name
		INNER JOIN filtered_store_data ON oor.loc_code = filtered_store_data.store_code
        INNER JOIN inventory_smart.oms_deep_dive_base oddb on oddb.product_code = oor.product_code and oddb.loc_code = oor.loc_code
		WHERE oor.article is not Null;;
    	';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;