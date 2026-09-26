--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:update_data_source_validity runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for update_data_source_validity
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.update_data_source_validity(
	config_id integer,
    is_valid boolean,
	user_id integer);

CREATE OR REPLACE FUNCTION data_platform.update_data_source_validity(
	config_id integer,
    is_valid boolean,
	user_id integer)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $FUNCTION$
 declare 
 _input_json json; 
 _user int:=$3; 
 _updated_at timestamp := now();
 _update_query text;
 begin
 		_update_query := 'update "data_platform".data_source_config 
                          set is_valid = '||$2||' ,  updated_by= '||_user ||',updated_at='''||_updated_at ||'''
                          where data_source_config_id= '||$1||' ';
 		raise notice '%', _update_query;
 		execute _update_query;
 	 end
 ;
 $FUNCTION$;

