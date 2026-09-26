--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:remove_notification_for_user runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start,MTP-74252
--comment: initial changeset for remove_notification_for_user, setting bucket_name to Archived and bookmarked to false
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.remove_notification_for_user(user_id integer, no_code integer);
CREATE OR REPLACE FUNCTION global.remove_notification_for_user(user_id integer, no_code integer DEFAULT NULL::integer)
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
                            updated_by = ' || $1 || ',
                            bucket_name = ''Archived'',
							bookmarked = false
                        WHERE 
                            created_for=' || $1 || '';
                            
		if $2 is not NULL then
			_query := _query || ' and no_code = ' || $2 || ';';
		end if;
		
		execute _query;
	end
$function$
;
