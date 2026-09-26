--liquibase formatted sql
--changeset akshay.jain:unread_notifications_count1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:fix
--comment: added spaces around placeholder
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.unread_notifications_count(user_id integer);
CREATE OR REPLACE FUNCTION global.unread_notifications_count(user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
    _unread_count integer;
	begin
		_query := 'SELECT COUNT(*) from "global".notifications_master 
                   where 
                        status = 0 and 
                        not is_deleted and
                        created_for= ' || $1 || ' and
                        created_at > now() - interval ''24 hours'';';
        
		execute _query into _unread_count;
        return _unread_count;
	end
$function$
;
