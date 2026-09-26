--liquibase formatted sql
--changeset liquibase:channel_to_departments_distinct runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for channel_to_departments_distinct
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.channel_to_departments_distinct(input character varying[]);
CREATE OR REPLACE FUNCTION global.channel_to_departments_distinct(input character varying[])
 RETURNS TABLE(department character varying)
 LANGUAGE plpgsql
AS $function$
	declare
	_channels_filter jsonb := '{"channel":[{"type":"list", "operator":"in", "values": ' || array_to_json($1) || '}]}';
--	_res jsonb;
	_sql text;
	begin
 		_sql := '
				select
					l0_name
				from
					(' || global.products_store_filters(
						' {}',
						' {"l0_name":[]}',
						' {}',
						_channels_filter
					) || ') main
				group by
					1';
		raise notice '%', _sql;
	return query execute _sql;
	end $function$
;
