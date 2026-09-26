--liquibase formatted sql
--changeset liquibase:update_material_rule_allocation_scheduler_update_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_material_rule_allocation_scheduler_update_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_material_rule_allocation_scheduler_count_query(result_cursor refcursor, jsonb, jsonb, jsonb, int, int);
CREATE OR REPLACE FUNCTION inventory_smart.update_material_rule_allocation_scheduler_count_query(
    result_cursor refcursor, 
    product_attribute_query jsonb, 
    store_attribute_query jsonb, 
    meta_query jsonb, 
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

        data_query := inventory_smart.update_material_rule_allocation_scheduler_data_query(product_attribute_query, store_attribute_query, meta_query, input_values, logged_in_user_id);

        count_query := FORMAT('
            SELECT jsonb_build_object(''record_count'', count, ''sku_count'', count) as count
			    FROM (
                    SELECT COUNT(data_tbl.article) as count FROM (%s) data_tbl
            ) foo
        ', data_query);

        RAISE NOTICE  '%', count_query;

        OPEN result_cursor FOR EXECUTE count_query;

        RETURN result_cursor;

END
$function$;

