--liquibase formatted sql
--changeset liquibase:get_stores runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_stores
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_stores(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_stores(input jsonb, jsonb)
 RETURNS TABLE(store_code character varying, active boolean)
 LANGUAGE plpgsql
AS $function$
/*
 *         
 * 
 select * from inventory_smart.get_stores(
        '{}',
        '{"state": [{"type": "list", "operator": "in", "values": ["AK"]}], "region": [] , "channel": [{"type": "list", "operator": "in", "values": ["ZALES"]}]}'
        );
 */
declare
	_query_sm text := '';
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	begin
		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $1));
 		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
		_query_combine := 'SELECT main.store_code, active FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code
			where active = true ';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;
