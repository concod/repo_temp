--liquibase formatted sql
--changeset liquibase:sync_excess_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_excess_units
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_excess_units(_is_historic bool);
CREATE OR REPLACE PROCEDURE public.sync_excess_units(_is_historic bool default false)
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
