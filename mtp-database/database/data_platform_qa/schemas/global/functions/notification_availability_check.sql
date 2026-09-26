--liquibase formatted sql
--changeset liquibase:notification_availability_check runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_availability_check
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_availability_check(input jsonb);
CREATE OR REPLACE FUNCTION global.notification_availability_check(input jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_query text;
	_product text;
	_screen_id Integer;
	_action text;
	--_role_code int[];
	_role_code_text varchar;
	_role_code varchar;
	_channels varchar;
	_channels_val varchar;
	_channels_query varchar;
	_department varchar;
	_department_val varchar;
	_department_query varchar;
	_cnt	Integer;

	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'screen_id' then
				_screen_id := _value;
			elseif _key = 'role_codes' then
				_role_code_text:= 'select array_to_string(array'||_value|| ','','')';
			    select array_to_string(array[_role_code],',') into _role_code;
				raise notice '%', 'role_code'||_role_code;
			elseif _key = 'channels' then
			    --_channels := array_append(_channels,''|| _value ||'');
		        _channels:= _value;
			elseif _key = 'departments' then
				--_departments := array_append(_departments,''|| _value || '');
				_department:= _value;
			end if;
		end loop;

		_channels_query := 'select replace (replace ('''||_channels||''',''['',''{''),'']'',''}'')' ;
		 raise notice '%',_channels_query;
		 execute _channels_query into _channels_val;

		_department_query := 'select replace (replace ('''||_department||''',''['',''{''),'']'',''}'')' ;
		 raise notice '%',_department_query;
		 execute _department_query into _department_val;

		--select replace (replace ( '["Footwear", "Apparel"]','[','{'),']','}') into 	_channels_val ;
		 execute _role_code_text into _role_code;
				raise notice '%', _role_code;

		--select replace (replace ( '["Footwear", "Apparel"]','[','{'),']','}') into 	_channels_val ;

		_query := 'select count(1)
						from global.notification_triggers_master ntm join
						global.notification_event_trigger_mapping netm
						on ntm.not_code =netm.not_code
						join global.notification_event_role_mapping nerm on
						netm.noe_code = nerm.noe_code
						join global.notification_event_master nem
						on nem.noe_code =netm.noe_code
						where
						ntm.not_code =  '|| _screen_id||'
 						and nerm.role_code in ('||_role_code||')
						and (nem.channels) &&  '''||_channels_val||'''
						and (nem.departments) &&  '''||_department_val||'''
						and not nem.is_deleted';


		raise notice '%', _query;
		execute _query into _cnt;
		return _cnt;
end
$function$
;


CREATE OR REPLACE FUNCTION global.notification_availability_check(input jsonb, integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_key text;
	_value text;
	_query text;
	_product text;
	_screen text;
	_action text;
	--_role_code int[];
	_role_code_text varchar;
	_role_code varchar;
	_channels varchar;
	_channels_val varchar;
	_channels_query varchar;
	_department varchar;
	_department_val varchar;
	_department_query varchar;
	_cnt	Integer;
	
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
			if _key ='product' then
				_product := _value;
				raise notice '%', _product;
			elseif _key = 'screen' then
				_screen := _value;
				raise notice '%', _screen;
			elseif _key = 'action' then
				_action := _value;
				raise notice '%', _action;
			elseif _key = 'role_code' then
				_role_code_text:= 'select array_to_string(array'||_value|| ','','')';
			   
			select array_to_string(array[_role_code],',') into _role_code;
				raise notice '%', 'role_code'||_role_code;
			elseif _key = 'channels' then
			--_channels := array_append(_channels,''|| _value ||'');
		   _channels:= _value;
			
			else 
				--_departments := array_append(_departments,''|| _value || '');
				_department:= _value;
			end if;
		end loop;
	
		_channels_query := 'select replace (replace ('''||_channels||''',''['',''{''),'']'',''}'')' ;
		 raise notice '%',_channels_query;
		 execute _channels_query into _channels_val;
		
		_department_query := 'select replace (replace ('''||_department||''',''['',''{''),'']'',''}'')' ;
		 raise notice '%',_department_query;
		 execute _department_query into _department_val;
		
		--select replace (replace ( '["Footwear", "Apparel"]','[','{'),']','}') into 	_channels_val ;
		 execute _role_code_text into _role_code;
				raise notice '%', _role_code;
	
		
			
		--select replace (replace ( '["Footwear", "Apparel"]','[','{'),']','}') into 	_channels_val ;
		
		_query := 'select count(1)
						from global.notification_triggers_master ntm join
						global.notification_event_trigger_mapping netm
						on ntm.not_code =netm.not_code
						join global.notification_event_role_mapping nerm on
						netm.noe_code = nerm.noe_code
						join global.notification_event_master nem
						on nem.noe_code =netm.noe_code
						where 
						ntm.not_code =  '||$2||'	
 						and nerm.role_code in ('||_role_code||') 
						and (nem.channels) &&  '''||_channels_val||'''
						and (nem.departments) &&  '''||_department_val||'''
						and not nem.is_deleted';



					raise notice '%', _query;
					 execute _query into _cnt;
					return _cnt;
end
$function$
;
