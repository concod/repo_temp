--liquibase formatted sql
--changeset liquibase:sync_loss_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_loss_units
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_loss_units(_is_historic bool);
CREATE OR REPLACE PROCEDURE public.sync_loss_units(_is_historic bool default false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
 	begin
	 	if _is_historic then 
	 		delete from 
	 		  inventory_smart.loss_units 
	 		where 
	 		  true;
 		end if;
 		INSERT INTO inventory_smart.loss_units (
 		  product_hierarchy, store_code, fiscal_year, 
 		  fiscal_week, "date", opening_inventory, 
 		  quantity, cluster_avg_sales, lost_units, 
 		  line_amount, lost_sales
 		) 
 		SELECT 
 		  product_hierarchy, 
 		  store_code, 
 		  fiscal_year, 
 		  fiscal_week, 
 		  "date", 
 		  opening_inventory, 
 		  quantity, 
 		  cluster_avg_sales, 
 		  lost_units, 
 		  line_amount , 
 		  lost_sales 
 		FROM 
 		  public.lost_sales;
 end
 $procedure$
;
