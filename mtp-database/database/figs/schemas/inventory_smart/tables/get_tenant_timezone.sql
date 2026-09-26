--liquibase formatted sql
--changeset chandrashekar.s@impactanalytics.co:get_tenant_timezone runOnChange:true stripComments:false splitStatements:false context:adding get_tenant_timezone function in global path
--comment: get_tenant_timezone | adding table folder because of pipeline error in sku_dc_reserved_units view
--rollback: SELECT 1
--drop function if exists inventory_smart.get_tenant_timezone();
create or replace function inventory_smart.get_tenant_timezone()
returns text
LANGUAGE plpgsql
AS $function$
declare
	ta record;
	value text;
	begin
		select trim(text(attribute_value->'value'->'time_zone'), '"') as timezone from "global".tenant_attribute_master tam where name='tenant_time_config' into ta;
		value := ta.timezone;
		raise notice '%', value;
		return value;
	end
$function$
;
