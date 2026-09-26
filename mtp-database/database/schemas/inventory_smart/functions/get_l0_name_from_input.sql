--liquibase formatted sql
--changeset liquibase:get_l0_name_from_input runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_l0_name_from_input
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_l0_name_from_input(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_l0_name_from_input(input jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_l0_name text[];
begin
	select
		coalesce(array_agg(l0_name), '{}'::varchar[])
	into
		_l0_name
	from
		(
		select
			jsonb_array_elements_text((inp->>'values')::jsonb) as l0_name
		from
			(
			select
				jsonb_array_elements((inp->>'l0_name')::jsonb) as inp
			from
				(
				select
					$1 as inp) x) y
		where
			inp->>'type' = 'list'
			and inp->>'operator' = 'in') x;
	return _l0_name;
end
$function$
;
