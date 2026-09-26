--liquibase formatted sql
--changeset liquibase:remove_notification_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for remove_notification_event
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_notification_event(noe_code integer, user_id integer);
CREATE OR REPLACE FUNCTION global.remove_notification_event(noe_code integer, user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
	begin
		_query := 'update "global".notification_event_master SET updated_by = ' || $2 || ', updated_at = now(), is_deleted = true where noe_code = ' || $1 || ';';
		execute _query;
	end
$function$
;
