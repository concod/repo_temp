--liquibase formatted sql
--changeset mayank.dubey@impactanalytics.co:get_tenant_timezone runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-63372
--comment: MTP-63372
--rollback: SELECT 1
drop function if exists inventory_smart.get_tenant_timezone();
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
		--raise notice '%', value;
		return value;
	end
$function$
;