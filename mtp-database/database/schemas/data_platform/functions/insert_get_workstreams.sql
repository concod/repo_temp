--liquibase formatted sql
--changeset liquibase:insert_get_workstreams runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for insert_get_workstreams
--rollback: SELECT 1
DROP FUNCTION IF EXISTS data_platform.insert_get_workstreams(
	input character varying,
	name character varying,
	columns character varying,
	refresh_table boolean);

CREATE OR REPLACE FUNCTION data_platform.insert_get_workstreams(
	input character varying,
	name character varying,
	columns character varying,
	refresh_table boolean)
    RETURNS TABLE(workstream_id integer, workstream_name character varying, workstream_value character varying, workstream_columns character varying) 
    LANGUAGE 'plpgsql'
    

AS $FUNCTION$
 declare 
 _input_json json; 
 _delete_query text;
_insert_query text;
_select_query text;

 begin
	 if $4=True then
		_delete_query:='delete from "data_platform".workstream 
							where workstream_name= ''' || $2 ||''' and workstream_columns= '''|| $3 ||''' ';
		raise notice '%', _delete_query;
 		execute _delete_query;
	end if;
 		_insert_query := 'insert into  "data_platform".workstream ( workstream_name ,workstream_value ,workstream_columns )  
							select workstream_name ,workstream_value ,workstream_columns
							from json_to_recordset('''||$1||''')
							as x("workstream_value" text, "workstream_columns" text, "workstream_name" text)';
 		raise notice '%', _insert_query;
 		execute _insert_query;

		_select_query:= 'select	 workstream_id, workstream_name ,workstream_value ,workstream_columns from "data_platform".workstream 
							where workstream_name= ''' || $2 ||''' and workstream_columns= '''|| $3 ||''' ';
		raise notice '%', _select_query;
 		execute _select_query;
RETURN QUERY execute _select_query;
end
 ;
 
$FUNCTION$;