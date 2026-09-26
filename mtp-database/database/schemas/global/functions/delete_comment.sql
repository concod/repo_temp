--liquibase formatted sql
--changeset liquibase:delete_comment runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delete_comment
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.delete_comment(input integer, integer);
CREATE OR REPLACE FUNCTION global.delete_comment(input integer, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_affected_rows int;
/*
 * Function/Procedure name: global.delete_comment
 * 
 * created_by : Akshay Jain
 * purpose : Follwowing SP is used to delete note only if it is created
 * 			 by user who is deleting it else raise exception
 * 
 * Date : 20-07-2022
 *                        
 */
	begin
		update "global".notes_master set is_deleted = true, updated_at = now() where note_code = $1 and created_by = $2 and is_deleted = false;
		GET DIAGNOSTICS _affected_rows = ROW_COUNT;
		if _affected_rows = 0 then
			RAISE EXCEPTION 'Comment Not created by User or does not exist';
		else
			update "global".notes_master set is_deleted = true, updated_at = now() where parent_code = $1 and is_deleted = false;
		end if;
	end $function$
;
