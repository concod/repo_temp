--liquibase formatted sql
--changeset liquibase:products_store_filters_execute runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for products_store_filters_execute
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.products_store_filters_execute(refcursor, jsonb, jsonb, jsonb, jsonb, collist character varying);
CREATE OR REPLACE FUNCTION global.products_store_filters_execute(refcursor, jsonb, jsonb, jsonb, jsonb, collist character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	v_query text;
	v_final_query text;
BEGIN
	select global.products_store_filters($2,$3,$4,$5) into v_query ;

	v_final_query := 'select ' || colList || ' from ('|| v_query ||') x';

	raise notice '%', v_final_query;
	open $1 for execute v_final_query;
	RETURN $1;
end
$function$
;
