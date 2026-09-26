--liquibase formatted sql
--changeset chaitanyaprasad.reddy:oms_update_alert_details_store runOnChange:true stripComments:false splitStatements:false context:MTP-102139 labels:oms_update_alert_details_store
--comment: MTP-102139
--rollback: SELECT 1

Drop function if exists inventory_smart.oms_update_alert_details_store(column_name text, id_list text[]);
CREATE OR REPLACE FUNCTION inventory_smart.oms_update_alert_details_store(column_name text, id_list text[])
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_string TEXT;   -- Variable to store the query
   formatted_list text;
   _projection_queries text[];
begin
	raise notice '%', id_list;

formatted_list := array_to_string(ARRAY(
        SELECT quote_literal(id) FROM unnest(id_list) AS id
    ), ', ');

    query_string := 
        'UPDATE inventory_smart.oms_alerts_store ' ||
        'SET ' || quote_ident(column_name) || ' = true ' ||
        'WHERE concat(article, store_code) IN (' || formatted_list || ') ';
   raise notice 'login %', query_string;
   -- Execute the query string and collect updated IDs
    EXECUTE query_string;

    -- Return the list of updated IDs
    RETURN id_list;
END;
$function$
;
