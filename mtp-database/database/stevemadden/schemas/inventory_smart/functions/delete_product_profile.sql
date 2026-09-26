--liquibase formatted sql
--changeset liquibase:delete_product_profile runOnChange:true stripComments:false splitStatements:false context:MTP-55972 labels: MTP-55972
--comment: MTP-55972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.delete_product_profile(_int4);

CREATE OR REPLACE FUNCTION inventory_smart.delete_product_profile(input integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	begin
		update inventory_smart.product_profile_master set is_deleted = true where pp_code = any ($1);
		update inventory_smart.ph_configuration_mapping set default_product_profile = null where default_product_profile = any ($1);
	end $function$
;
