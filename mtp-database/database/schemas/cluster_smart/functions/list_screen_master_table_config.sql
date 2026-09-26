--liquibase formatted sql
--changeset liquibase:list_screen_master_table_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_screen_master_table_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.list_screen_master_table_config(integer[]);
CREATE OR REPLACE FUNCTION cluster_smart.list_screen_master_table_config(integer[])
 RETURNS TABLE(table_name character varying, screen_name character varying, header character varying, application integer[])
 LANGUAGE plpgsql
AS $function$
declare
		_query text;
	begin
		
		--raise notice '%', $1;
		_query:='SELECT TC."name" Table_Name, sm."screen_name",TC."header",sm."application"
					FROM  global.table_configurations TC
				INNER JOIN global.screen_master sm  ON sm."screen_name" = ANY (tc."screens")
				where sm.application && ''' || concat($1) || '''::int[]
				ORDER BY TC."name", sm."screen_name";';	
			
			
		raise notice '%', _query;
	RETURN QUERY EXECUTE _query;
			
	end $function$
;
