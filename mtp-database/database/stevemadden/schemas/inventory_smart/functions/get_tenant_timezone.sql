--liquibase formatted sql
--changeset adesh.kumar:update_product_profile_user_mapping runOnChange:true stripComments:false splitStatements:false context:MTP-43445 labels:MTP-43445
--comment: MTP-43445
--rollback: SELECT 1
DROP FUNCTION if exists inventory_smart.get_tenant_timezone();
CREATE OR REPLACE FUNCTION inventory_smart.get_tenant_timezone()
 RETURNS text
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