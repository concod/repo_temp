--liquibase formatted sql
--changeset liquibase:update_material_rule_allocation_store_scheduler_count_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_material_rule_allocation_store_scheduler_count_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_store_scheduler_count_query(input refcursor, jsonb, jsonb, integer, text, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_store_scheduler_count_query(
    result_cursor refcursor, 
    product_attribute_query jsonb,
    store_attribute_query jsonb, 
    application_code integer,
    client_columns text,
    meta_query jsonb,
    product_rule_attribute_query jsonb,
    input_values jsonb, 
    logged_in_user_id int
)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    DECLARE
        data_query text := '';
        count_query text := '';
    BEGIN
        data_query := inventory_smart.update_material_rule_allocation_store_scheduler_data_query(product_attribute_query, store_attribute_query, application_code, client_columns, meta_query, product_rule_attribute_query, input_values, logged_in_user_id);
        count_query := FORMAT('
            SELECT jsonb_build_object(''record_count'', record_cound, ''sku_count'', sku_count) as count
			    FROM (
                    SELECT COUNT(DISTINCT data_tbl.article) as sku_count, COUNT(*) as record_cound FROM (%s) data_tbl
            ) foo
        ', data_query);
        RAISE NOTICE  '%', count_query;
        OPEN result_cursor FOR EXECUTE count_query;
        RETURN result_cursor;
END
$function$;