--liquibase formatted sql
--changeset ashish.gupta:sync_store_unit_capacity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_store_unit_capacity
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_unit_capacity();
CREATE OR REPLACE PROCEDURE public.sync_store_unit_capacity()
 LANGUAGE plpgsql
AS $procedure$
	begin
	delete from inventory_smart.store_unit_capacity	;
	insert into inventory_smart.store_unit_capacity	
		(product_hierarchy,
		store_code,
		unit_capacity)
	select 	product_hierarchy,
		store_code,
		unit_capacity from public.store_unit_capacity;
	end
$procedure$
;
