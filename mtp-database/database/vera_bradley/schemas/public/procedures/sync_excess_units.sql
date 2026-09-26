--liquibase formatted sql
--changeset laraib.ahmad:sync_excess_units runOnChange:true stripComments:false splitStatements:false context:MTP-22323 labels:Updated SP
--comment: Updated SP for weekly append
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_excess_units();
DROP PROCEDURE IF EXISTS public.sync_excess_units(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_excess_units(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.excess_units 
	 		where 
	 		  true;
 		end if;
		INSERT INTO inventory_smart.excess_units (
		  product_hierarchy, store_code, fiscal_year, 
		  fiscal_week, "date", oh, oo, it, week_qty, 
		  ros, target_wos, wos_pred, excess_inv, 
		  excess_inv_cost, tot_inv
		) 
		SELECT 
		  product_hierarchy, 
		  store_code, 
		  fiscal_year, 
		  fiscal_week, 
		  "date", 
		  oh, 
		  oo, 
		  it, 
		  week_qty, 
		  ros, 
		  target_wos, 
		  wos_pred, 
		  excess_inv, 
		  excess_inv_cost, 
		  tot_inv 
		FROM 
		  public.excess_units;
	end
$procedure$
;
