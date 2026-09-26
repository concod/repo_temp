--liquibase formatted sql
--changeset liquibase:auto_allocation_scheduler_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-46124 labels:MTP-46124
--comment: MTP-46124 Used to list auto allocation schediuler and added email in updated_by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.auto_allocation_scheduler_list(refcursor, jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.auto_allocation_scheduler_list(input refcursor, table_filters jsonb, sh_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_table_filters text := '';
_query_all text := '';
begin
	
    _query_table_filters := global.form_table_query(table_filters);
	raise notice '_query_table_filters %', _query_table_filters;
    _query_part = '
				SELECT * FROM (SELECT
					sh_code,
					sh_name,
					sh_frequency,
					um.name as updated_by,
					TO_CHAR(aas.updated_at, ''MM/DD/YYYY'') AS updated_at, 
					is_deletable,
					CASE WHEN ' || COALESCE(sh_code::text, 'NULL') || ' IS NULL THEN false
					     WHEN aas.sh_code = ' || COALESCE(sh_code::text, 'NULL') || ' THEN true 
					     ELSE false 
					END as is_selected
				FROM inventory_smart.auto_allocation_scheduler aas
				LEFT JOIN global.user_master um 
					ON um.user_code = aas.updated_by
				WHERE aas.is_deleted=false
				ORDER BY 
					is_selected DESC,
					(is_deletable is false) DESC, 
					sh_code DESC) x';

	_query_all = _query_part || ' ' || _query_table_filters;
	raise notice '_query_all %', _query_all;
    OPEN $1 FOR execute _query_all;  
	RETURN $1;

END;
$function$
;
