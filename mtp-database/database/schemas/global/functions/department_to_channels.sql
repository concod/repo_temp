--liquibase formatted sql
--changeset liquibase:department_to_channels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for department_to_channels
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.department_to_channels(input character varying[]);
CREATE OR REPLACE FUNCTION global.department_to_channels(input character varying[])
 RETURNS TABLE(attributes jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_l0_filter jsonb := '{"l0_name":[{"type":"list", "operator":"in", "values": ' || array_to_json($1) || '}]}';
	_res jsonb;
	_sql text;
	begin
 		_sql := 'select
				jsonb_object_agg(l0_name, channel)
			from (
				select
					l0_name as l0_name,
					array_agg(distinct channel) as channel
				from (' || global.products_store_filters(
					'{}',
					_l0_filter,
					'{}',
					'{"channel":[]}'
				) || ') main group by 1) x';
		raise notice '%', _sql;
	return query execute _sql;
	end $function$
;
