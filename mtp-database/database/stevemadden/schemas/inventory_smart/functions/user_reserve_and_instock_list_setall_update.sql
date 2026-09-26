--liquibase formatted sql
--changeset liquibase:user_reserve_and_instock_list_setall_update runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_reserve_and_instock_list_setall_update
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list_setall_update(input refcursor, jsonb, jsonb, jsonb, boolean, boolean, text, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list_setall_update(input refcursor, jsonb, jsonb, jsonb, boolean, boolean, text, text, text) 
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    data_query text := '';
    query text := '';
    temp_refcursor refcursor := '';
BEGIN
    temp_refcursor := 'cursor_' || to_char(current_timestamp, 'YYYYMMDDHH24MISSUS');
    data_query := inventory_smart.user_reserve_and_instock_list(temp_refcursor,$2,$3,$4,$5,$6);

    BEGIN
        query := FORMAT('
            INSERT INTO inventory_smart.dc_reserve_quantity (product_code, dc_code, channel, type, inventory_source, %s) -- data_columns
	        	SELECT
		        x.product_code,
		        x.dc_code,
                x.channel,
                ''U'',
                ''DC'',
                %s -- data
            FROM
                (%s) x -- data_query
	ON CONFLICT (product_code, channel, inventory_source, dc_code, type)
	DO UPDATE SET
		%s --  user_reserve_upsert_string
        ', $7, $8, data_query, $9);
       
        RAISE NOTICE '%', query;
        EXECUTE query;
        OPEN $1 FOR SELECT 'ok' as results;
        RETURN $1;
    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback transaction in case of error
            RAISE NOTICE 'Transaction failed: %', SQLERRM;
            RAISE EXCEPTION 'Failed to run queries. %', SQLERRM;
    END;
END;
$function$;