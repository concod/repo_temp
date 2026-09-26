--liquibase formatted sql
--changeset liquibase:execute_ticketing_download_query runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for execute_ticketing_download_query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.execute_ticketing_download_query(refcursor, varchar);
CREATE OR REPLACE FUNCTION global.execute_ticketing_download_query(input refcursor, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
  * Function/Procedure name: global.execute_ticketing_download_query
  * Created by: Shreyas Sankpal
  * Created at: 06-Jun-2024
  * No of input parameter: 2
  * Parameter Description : $1 = Input Refcursor 
  *                         $2 = JSON for Query to be executed
  * 			
  * Purpose: The SP takes a cursor and query as an input and executes the query using that cursor, then returns the cursor.
  * Calling Statement: 
  * SELECT * FROM (uuid, 'select t.banner_banner_channel as banner_banner_channel,
  *				       t.closed_on as closed_on,
  *				       t.created_on as created_on,
  *				       t.issue_type as issue_type,
  *				       t.module_type as module_type,
  *				       t.priority as priority,
  *				       t.status as status,
  *				       t.id as id,
  *				       t.title as title,
  *				       t.updated_on as updated_on,
  *				       coalesce(t.user_id, 0) as user_id,
  *				       coalesce(um.user_name, 'IA_USER') as user_name
  *				from global.ticket_attributes_filter t
  *				    left join global.user_master um
  *				        on t.user_id = um.user_code
  *				where (t.user_id in ( '251' ))
  *				      and (t.created_on
  *				      between '2024-05-07 00:00:00.000 +0000' and '2024-06-07 23:59:59.000 +0000'
  *				          )
  *				order by updated_on desc;')
  *
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       	Updated_on      Purpose
  * ----------       	-----------     --------
  * 
  */
	begin
		raise notice 'download query: %', $2; 
		open $1 for execute $2;
		return $1;
	END;
$function$
;