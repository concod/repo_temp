--liquibase formatted sql
--changeset liquibase:sync_sku_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_sku_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_sku_master();
CREATE OR REPLACE PROCEDURE public.sync_sku_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.sku_master 
		;
		INSERT INTO inventory_smart.sku_master (
		  product_code, inventsizeid
		) 
		select 
		  product_code, inventsizeid
		FROM 
		  public.sku_derived_master x ;
	end
$procedure$
;
