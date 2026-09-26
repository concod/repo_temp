--liquibase formatted sql
--changeset liquibase:sync_product_dc_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_dc_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_dc_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_dc_mapping()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		insert into global.product_mapping_product_dc(
		mapping_type, product_code, dc_code, is_active 
		)
		select 'product_dc', product_code, dc_code, true from global.product_master pm 
		cross join global.distribution_centres dc 
		where not pm.is_deleted and pm.active
		and dc.is_active and not dc.is_deleted
		on conflict(product_code, dc_code)
		do update 
		set is_active = true;
end
$procedure$
;
