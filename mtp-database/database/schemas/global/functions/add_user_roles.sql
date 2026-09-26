--liquibase formatted sql
--changeset liquibase:add_user_roles runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_user_roles
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_user_roles(input jsonb);
CREATE OR REPLACE FUNCTION global.add_user_roles(input jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_query text;
	_dc_store_map_query text;

	_keys text[];
	_vals text[];
	_role_code int;
	_user_code int;
	
	_record_cnt_user int;
	_record_cnt_role int;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop 
		
			if _key = 'role_code' then
				_role_code := _value;
			
				--Validate roles 
				select count(*) 
					into _record_cnt_role 
				from global.roles_master 
				 where 1=1
				and role_code = _role_code
				and status ;
			
				if _record_cnt_role =0 Then
					raise notice '%','Given roles '||_role_code||' not available in role_master table';
					Return 0;
				End if;
			
			Elsif _key = 'user_code' then	
				_user_code := _value;
				
				--Validate User 
				select count(*) 
					into _record_cnt_user 
				from 
					global.user_master 
					where user_code = _user_code
					and status ;
			
				if _record_cnt_user =0 then
					---raise notice '%',_user_code;
					raise notice '%','Given user '||_user_code||' not available in user_master table';
					Return 0;
				End if;
			
			end if;
		
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			
				
		end loop;
		--raise notice '%',_query;	
		_query := 'INSERT INTO "global".user_roles_mapping (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ')' ;
	
		execute _query ;
	
	raise notice '%',_query;
	Return 0;
	--return _dc_code;
	end $function$
;
