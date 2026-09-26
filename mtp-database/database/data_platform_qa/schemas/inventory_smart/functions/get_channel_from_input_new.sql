--liquibase formatted sql
--changeset liquibase:get_channel_from_input_new runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_channel_from_input_new
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_channel_from_input_new(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_channel_from_input_new(input jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_channel text[];
begin
	select
		coalesce(array_agg(channel), '{}'::varchar[])
	into
		_channel
	from
		(
		select
			jsonb_array_elements_text((inp->>'values')::jsonb) as channel
		from
			(
			select
				jsonb_array_elements((inp->>'channel')::jsonb) as inp
			from
				(
				select
					$1 as inp) x) y
		where
			inp->>'type' = 'list'
			and inp->>'operator' = 'in') x;
	return _channel;
end
$function$
;
