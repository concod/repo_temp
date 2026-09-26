--liquibase formatted sql
--changeset liquibase:update_notification_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_notification_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_notification_status(user_id integer, status integer, noe_code integer );
CREATE OR REPLACE FUNCTION global.update_notification_status(user_id integer, status integer DEFAULT 1, noe_code integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
	begin
		_query := 'update "global".notifications_master 
                        SET 
                            status = ' || $2 || ',
                            updated_at = now(),
                            updated_by = ' || $1 || '
                        where 
                            created_for=' || $1 || '';
                            
		if $3 is not NULL then
			_query := _query || ' and no_code = ' || $3 || ';';
		end if;
        
		execute _query;
	end
$function$
;
