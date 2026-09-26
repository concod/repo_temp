--liquibase formatted sql
--changeset liquibase:test_list_cluster_results_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for test_list_cluster_results_1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.test_list_cluster_results_1(text, jsonb);
CREATE OR REPLACE FUNCTION global.test_list_cluster_results_1(text, jsonb)
 RETURNS TABLE(master_code character varying, metrics jsonb, request_id character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($2);
		_query_combine := 'select * from global.ada_cluster_results ' || _query_table_filters || ' and  request_id = '''|| $1 ||''' '; 
		raise notice '%',_query_combine;
		RETURN QUERY execute _query_combine;
	end $function$
;
