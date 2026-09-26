
--liquibase formatted sql
--changeset liquibase:product_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42164
--comment: MTP-42164 initial version
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_mapping(input integer, character varying, integer[], integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_mapping(input integer, character varying, integer[], integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
	_mapping_cnt int;
begin
	select count(1) into _mapping_cnt from inventory_smart.ph_configuration_mapping
	where ph_code = $1 and channel = $2;
	if _mapping_cnt = 0 then
		INSERT INTO inventory_smart.ph_configuration_mapping
		(ph_code, channel, default_store_groups, created_by)
		VALUES($1, $2, $3, $4);
	else
		UPDATE inventory_smart.ph_configuration_mapping
		set default_store_groups = $3, updated_by = $4, updated_at = now()
		where ph_code = $1 and channel = $2;
	end if;
end
$function$
;