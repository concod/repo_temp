--liquibase formatted sql
--changeset priyansh.gautam:Added_deep_dive_filter_data_helper3 runOnChange:true stripComments:false splitStatements:false context:MTP-63142 labels:filter_data_helper
--comment: Created filter_data_helper function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_deep_dive_filter_data_helper(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_deep_dive_filter_data_helper(product_filter jsonb, store_filter jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    where_condition TEXT := '';
    transform_query text := '';
BEGIN
    -- Generate the WHERE conditions from the product_filter JSONB
    where_condition := inventory_smart.form_main_table_filters('ph_master', product_filter);
    RAISE NOTICE 'Where Condition: %', where_condition;

    -- Construct the dynamic SQL query
    transform_query := '
    with filtered_data as (
        select product_code, l1_name, size, style
        from global.product_attributes_filter
        ' || where_condition || '
    )
   select jsonb_build_object(
   		''product_code'', COALESCE(jsonb_agg(distinct fd.product_code), ''[]''::jsonb),
        ''l1_name'', COALESCE(jsonb_agg(distinct fd.l1_name), ''[]''::jsonb),
        ''size'', COALESCE(jsonb_agg(distinct fd.size), ''[]''::jsonb),
		''style'', COALESCE(jsonb_agg(distinct fd.style), ''[]''::jsonb)
    ) as distinct_values
    from filtered_data  fd
    inner join 
    inventory_smart.oms_orders_recommended oor 
		on oor.product_code = fd.product_code and oor.size = fd.size
		where oor.order_gen_type <> ''Manual''
    ';
    RAISE NOTICE 'Transform Query: %', transform_query;

    -- Execute the dynamic SQL query and return the results
    RETURN QUERY EXECUTE transform_query;
END;
$function$
;
