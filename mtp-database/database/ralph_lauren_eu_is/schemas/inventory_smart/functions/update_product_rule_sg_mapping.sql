--liquibase formatted sql
--changeset renugopal:update_product_rule_sg_pp_dc_mapping stripComments:false splitStatements:false runOnChange:true context:MTP-23072 labels:MTP-41571-MTP-41570.
--comment MTP-41571-MTP-41570.
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
		(ph_code, channel, default_store_groups, created_by,updated_by)
		VALUES($1, $2, $3, $4, $4);
	else
		UPDATE inventory_smart.ph_configuration_mapping
		set default_store_groups = $3, updated_by = $4, updated_at = now(), default_store_groups_selected = '{}' , upload_flag='false'
		where ph_code = $1 and channel = $2;
	end if;
end
$function$
;

DROP FUNCTION IF EXISTS inventory_smart.update_product_rule_sg_mapping(input integer, character varying, integer[], integer, integer[]);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_rule_sg_mapping(input integer, character varying, integer[], integer, integer[])
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
		(ph_code, channel, default_store_groups, default_store_groups_selected, created_by, updated_by)
		VALUES($1, $2, $3, $5, $4, $4);
	else
		UPDATE inventory_smart.ph_configuration_mapping
		set default_store_groups = $3, updated_by = $4, updated_at = now(), default_store_groups_selected=$5 , upload_flag='false'
		where ph_code = $1 and channel = $2;
	end if;
end
$function$
;