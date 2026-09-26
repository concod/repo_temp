--liquibase formatted sql
--changeset liquibase:shubham.singh@impactanalytics.co:util to get store-dc where clause concatinated using or runOnChange:true stripComments:false splitStatements:false context:MTP-86703 labels:MTP-86703
--comment: MTP-86703
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.form_store_dc_clause(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.form_store_dc_clause(input jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
	declare
		_where text := '';
		_store_where_clause text := '';
		_dc_where_clause text := '';
		
	BEGIN
		_store_where_clause := inventory_smart.form_main_table_filters('store_attributes_filter', $1);
		_dc_where_clause := inventory_smart.form_main_table_filters('store_attributes_filter', $2);
		_dc_where_clause := replace(_dc_where_clause, 'WHERE', '');
		_where := _store_where_clause || ' or ' || _dc_where_clause;
		return _where;
	
	END;
$function$
;