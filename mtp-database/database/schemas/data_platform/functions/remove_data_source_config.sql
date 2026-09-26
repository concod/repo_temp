--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:remove_data_source_config runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for remove_data_source_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.remove_data_source_config(
	config_id integer,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.remove_data_source_config(
	config_id integer,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _delete_query text;
 _deleted_at timestamp := now();
 begin
 		_delete_query := 'update "data_platform".data_source_config
						  set deleted_by= '||$2||', deleted_at='''||_deleted_at ||''', is_deleted=True
                          where data_source_config_id = '||config_id||' '	;
 		raise notice '%', _delete_query;
 		execute _delete_query;
 	 end
 ;
 
$FUNCTION$;