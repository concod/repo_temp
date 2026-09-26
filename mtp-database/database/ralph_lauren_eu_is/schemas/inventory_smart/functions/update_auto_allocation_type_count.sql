--liquibase formatted sql
--changeset liquibase:set_all runOnChange:true stripComments:false splitStatements:false context:Release_2_2 labels:MTP-47934 Approval Type and Threshold
--comment: MTP-47934 Approval Type and Threshold
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_auto_allocation_type_count(refcursor, jsonb, jsonb, jsonb, jsonb, int4);

CREATE OR REPLACE FUNCTION inventory_smart.update_auto_allocation_type_count(result_cursor refcursor, product_attribute_query jsonb, store_attribute_query jsonb, meta_query jsonb, input_values jsonb, logged_in_user_id integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

    DECLARE
        data_query text := '';
        count_query text := '';

    BEGIN

        data_query := inventory_smart.update_auto_allocation_type_data(product_attribute_query, store_attribute_query, meta_query, input_values, logged_in_user_id);

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
$function$
;
