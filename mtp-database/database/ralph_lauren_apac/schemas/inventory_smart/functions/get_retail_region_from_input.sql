--liquibase formatted sql
--changeset liquibase:get_retail_region_from_input runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_retail_region_from_input
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_retail_region_from_input(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_retail_region_from_input(input jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
	_retail_region text := '';
begin
	select
		jsonb_array_elements_text((inp->>'values')::jsonb) into _retail_region
	from (
		select
			jsonb_array_elements((inp->>'retail_region')::jsonb) as inp
		from (
			select
				$1 as inp) x) y
	where
		inp->>'type' = 'list'
		and inp->>'operator' = 'in'
	limit 1;
	return _retail_region;
end
$function$
;