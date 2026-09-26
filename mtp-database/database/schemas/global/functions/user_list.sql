--liquibase formatted sql
--changeset chaitanyaprasad.reddy:mtp-20648 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-20648
--comment: returning not deleted and status true only users
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.user_list();
CREATE OR REPLACE FUNCTION global.user_list()
 RETURNS TABLE(user_list json)
 LANGUAGE plpgsql
AS $function$
declare
	
	_query_combine text;
	
	begin
		_query_combine := 'SELECT * FROM (
select
		json_build_object (
			''user_name'', p.user_name,
			''email_id'', p.email
		) as user_list
from
	global.user_master p where is_deleted = ''false'') X ';
		raise notice '%', _query_combine;
RETURN QUERY execute _query_combine;
 	end
$function$
;


CREATE OR REPLACE FUNCTION global.user_list(input jsonb)
 RETURNS TABLE(user_name character varying, user_code integer, email character varying, custom_attributes character varying)
 LANGUAGE plpgsql
AS $function$
 declare
 	_key text;
 	_value text;
 	_query_table_filters text := '';
 	_query_combine text;
 	_column text;
 	_search text;
 	_input_json json;
 	
 	begin
 		_query_table_filters := "global".form_table_query($1);
 		_query_combine := 'SELECT * FROM (
 select
 p.user_name,
 p.user_code,
 p.email,
 ua.attribute_value
 from
 	global.user_master p LEFT JOIN 
global.user_attributes ua on p.user_code=ua.user_code and ua.attribute_name = ''custom_attributes''
 where p.is_deleted = false and p.status = true order by p.created_at desc) X' || _query_table_filters;
 		raise notice '%', _query_combine;
 RETURN QUERY execute _query_combine;
  	end
 $function$
;


CREATE OR REPLACE FUNCTION global.user_list(input jsonb, jsonb)
 RETURNS TABLE(user_list json)
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_query_table_filters text := '';
	_query_combine text;
	_column text;
	_search text;
	_input_json json;
	
	begin
		_query_table_filters := "global".form_table_query($2);

	 for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key = 'column' then
				_column := _value;
		    elseif 	_key ='pattern' then 
			_search := _value;	
			end if;
			raise notice '%', _column;
			raise notice '%', _search;
	end loop;
	
		_query_combine := 'SELECT * FROM (
select
		json_build_object (
			''user_name'', p.user_name,
			''email_id'', p.email
		) as user_list
from
	global.user_master p where is_deleted = ''false'' and p.'|| _column ||' like '''|| _search ||'%''
		) X ' || _query_table_filters;
		raise notice '%', _query_combine;
RETURN QUERY execute _query_combine;
 	end
$function$
;
