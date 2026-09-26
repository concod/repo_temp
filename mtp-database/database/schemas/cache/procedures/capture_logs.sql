--liquibase formatted sql
--changeset liquibase:capture_logs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for capture_logs
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS cache.capture_logs(IN _sp_name character varying, IN _message character varying, IN _n1 integer, IN _r1 character varying);
CREATE OR REPLACE PROCEDURE cache.capture_logs(IN _sp_name character varying, IN _message character varying, IN _n1 integer, IN _r1 character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 /*
 * Function/Procedure name: global.clean_cache
 * Created by: Ashish Gupta
 * Created at: 29-Dec-2022
 * No of input parameter: 0
 * Parameter Description: 
 * if any modification done in same function/procedure please record the changes in below format
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 */
declare 
begin 
insert into 
cache.error_logs( sp_name , created_by , message , n1 , r1  ) values (
_sp_name, current_user, _message, _n1, _r1);
end
$procedure$
;