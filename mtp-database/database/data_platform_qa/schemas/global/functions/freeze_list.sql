--liquibase formatted sql
--changeset liquibase:freeze_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for freeze_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.freeze_list(input character varying, text, character varying);
CREATE OR REPLACE FUNCTION global.freeze_list(input character varying, text, character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_count int := 0;
	_time timestamptz := clock_timestamp();
	begin
		if not global.is_mv_exists('global', $1) then
			execute 'CREATE MATERIALIZED VIEW "global"."' || $1 || '" AS ' || $2;
			INSERT INTO "global".sp_calls_statistics(created_at, "name", "sql", cursor_code, time_taken) VALUES(now(), $3, $2, $1, EXTRACT(EPOCH FROM (clock_timestamp() - _time)));
		end if;
	end $function$
;
