--liquibase formatted sql
--changeset liquibase:test_list_cluster_results runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for test_list_cluster_results
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.test_list_cluster_results(input refcursor, text, jsonb);
CREATE OR REPLACE FUNCTION global.test_list_cluster_results(input refcursor, text, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($3);
		_query_combine := 'select * from global.ada_cluster_results where request_id = '''|| $2 ||''' X ' || _query_table_filters;
		raise notice '%',_query_combine;
		OPEN $1 FOR execute _query_combine;
	return $1;
	end $function$
;
