--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:sync_constraint_master_aps runOnChange:true stripComments:false splitStatements:false context:DAT-1117 labels:sync_constraint_master_aps
--comment: create SP to optimize the performance. 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master_aps();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_aps()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin

	update inventory_smart.constraint_master cm set aps = x.aps from 
	(select aps,store as store_code,sku as product_code from public.vb_aps_append_table aat ) x 
	where cm.store_code =x.store_code
	and cm.product_code = x.product_code;

end $procedure$
;
