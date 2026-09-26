--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:remove_notifications_by_ids runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74252
--comment: initial changeset for remove_notifications_by_ids
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".remove_notifications_by_ids(notification_ids integer[], user_id integer);
CREATE OR REPLACE FUNCTION global.remove_notifications_by_ids(notification_ids integer[], user_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
begin
	_query := 'UPDATE "global".notifications_master 
                        SET 
                            is_deleted = true,
                            updated_at = now(),
                            updated_by = ' || $2 || ',
                            bucket_name = ''Archived'',
							bookmarked = false
                        WHERE 
                            no_code = ANY($1)';
                            
	execute _query using notification_ids;
end
$function$
;
