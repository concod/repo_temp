--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:update_comment_users_mentioned runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_users_mentioned
--comment: updating users mentioned
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_comment(input integer, integer, text);
DROP FUNCTION IF EXISTS global.update_comment(input integer, integer, text, _int4);
CREATE OR REPLACE FUNCTION global.update_comment(input integer, integer, text, int4[] default '{}'::int4[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
		_affected_rows int;
		_users_mentioned_array int4[];
/*
 * Function/Procedure name: global.update_comment
 * 
 * created_by : Akshay Jain
 * purpose : Follwowing SP is used to change html mssg associated with some note code only if it is created
 * 			 by user who is changing it else raise exception
 * 
 * Date : 20-07-2022
 *
 *	Update (02 Sept 2024)
 * 	Added users_mentioned to update query
 *                        
 */
	begin
		_users_mentioned_array := $4::int4[];
		if _users_mentioned_array = '{}'::int4[] then 
			-- storing null instead on empty array
			_users_mentioned_array := null;
		end if;
		update "global".notes_master set html_msg = $3, users_mentioned = _users_mentioned_array, updated_by = $2, updated_at = now() where note_code = $1 and created_by = $2 and is_deleted = false;
		GET DIAGNOSTICS _affected_rows = ROW_COUNT;
		if _affected_rows = 0 then
			RAISE EXCEPTION 'Comment Not created by User or does not exist';
		end if;
	end $function$
;
