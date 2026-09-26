--liquibase formatted sql
--changeset ashish@impactanalytics.co:async_query_status runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for async_query_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS public.async_query_status(_con text, _type text);
CREATE OR REPLACE FUNCTION public.async_query_status(_con text, _type text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	declare
		_status bool := false;
	begin
		if _type = 'index' then -- handel only known safe reasons
			BEGIN
				perform dblink_get_result(_con, true);
				_status := true;
			EXCEPTION
				WHEN duplicate_table THEN _status := true;
			END;
		elseif _type = 'constraint' then -- handel only known safe reasons
			BEGIN
				perform dblink_get_result(_con, true);
				_status := true;
			EXCEPTION
				WHEN duplicate_table THEN _status := true;
				WHEN duplicate_object THEN _status := true;
			END;
		else perform dblink_get_result(_con, true);
			_status := true;
		end if;
		perform dblink_disconnect(_con);
		return _status;
	end
$function$
;
