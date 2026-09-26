--liquibase formatted sql
--changeset liquibase:is_mv_exists runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for is_mv_exists
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.is_mv_exists(input text, text);
CREATE OR REPLACE FUNCTION global.is_mv_exists(input text, text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	begin
		RETURN EXISTS (
		select 1 from pg_matviews where schemaname = $1 and matviewname = $2
		);
	end $function$
;
