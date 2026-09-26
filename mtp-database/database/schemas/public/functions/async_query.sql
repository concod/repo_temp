--liquibase formatted sql
--changeset ashish@impactanalytics.co:async_query runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for async_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS public.async_query(_query text);
CREATE OR REPLACE FUNCTION public.async_query(_query text)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
	declare
		_con varchar := gen_random_uuid();
		_con_status varchar;
		_query_status int; -- 1 accepted
	begin 
		select 
		  dblink_connect(
		    _con, 
		    'dbname=' || current_database() || ' user=' || current_user
		) into _con_status;
--		raise notice 'DB: %, User: %, Con: %, ConS: %', current_database(), current_user, _con, _con_status;
		if _con_status = 'OK' then 
			SELECT 
			  dblink_send_query(_con, _query) into _query_status;
--			raise notice '_query_status: %', _query_status;
			if _query_status != 1 then
				_con := null;
			end if;
	     else
			_con := null;
		end if;
	    if _con is null then
	        raise exception using
	            errcode = 'NOBAR',
	            message = 'Background Process Error',
	            hint = 'Background process not initialized or error in accepting query';
	    end if;
		return _con;
	end 
$function$
;
