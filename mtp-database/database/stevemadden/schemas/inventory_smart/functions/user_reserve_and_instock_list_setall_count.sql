--liquibase formatted sql
--changeset liquibase:user_reserve_and_instock_list_setall_count runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_reserve_and_instock_list_setall_count
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list_setall_count(input refcursor, jsonb, jsonb, jsonb, boolean, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list_setall_count(input refcursor, jsonb, jsonb, jsonb, boolean, boolean) RETURNS refcursor
LANGUAGE plpgsql
AS $function$
    DECLARE
        data_query text := '';
        count_query text := '';
        temp_refcursor refcursor := '';
    BEGIN
        temp_refcursor := 'cursor_' || to_char(current_timestamp, 'YYYYMMDDHH24MISSUS');
        data_query := inventory_smart.user_reserve_and_instock_list(temp_refcursor,$2,$3,$4,$5,$6);
        count_query := FORMAT('
            SELECT jsonb_build_object(''record_count'', record_cound, ''sku_count'', sku_count) as count
			    FROM (
                    SELECT COUNT(DISTINCT data_tbl.article) as sku_count, COUNT(*) as record_cound FROM (%s) data_tbl
            ) foo
        ', data_query);
        RAISE NOTICE  '%', count_query;
        OPEN $1 FOR EXECUTE count_query;
        RETURN $1;
END
$function$;

