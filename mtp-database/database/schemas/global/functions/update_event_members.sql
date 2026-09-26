--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:update_event_members runOnChange:true stripComments:false splitStatements:false context:MTP-107267 labels:liquibase_lines_changed
--comment: saving info of added/removed members of an event
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_event_members(_event_id integer, member_ids integer[], action character varying);
CREATE OR REPLACE FUNCTION global.update_event_members(_event_id integer, member_ids integer[], action character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	BEGIN
		if action = 'added' then 
			insert into global.notes_event_member_history(event_id, member_id, action_type, created_at)
			select _event_id, unnest(member_ids), action, now();
			
			insert into global.notes_event_user_mapping(event_id, member_id)
			select _event_id, unnest(member_ids)
			on conflict do nothing;
		elsif action = 'removed' then
			insert into global.notes_event_member_history(event_id, member_id, action_type, created_at)
			select _event_id, unnest(member_ids), action, now();

			delete from global.notes_event_user_mapping
			where event_id= _event_id
				and member_id = any(member_ids);
		ELSE
	        RAISE EXCEPTION 'Invalid action: %', action;
		end if;
	END;
$function$
;