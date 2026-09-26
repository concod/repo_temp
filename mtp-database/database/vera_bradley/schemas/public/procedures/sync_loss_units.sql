--liquibase formatted sql
--changeset laraib.ahmad:sync_loss_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:Updated SP 
--comment: updated SP to fetch one week data
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_loss_units();
DROP PROCEDURE IF EXISTS public.sync_loss_units(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_loss_units(IN _is_historic boolean DEFAULT false)
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
		  units, 
		  cluster_avg_sales, 
		  lost_units, 
		  selling_price, 
		  lost_sales 
		FROM 
		  public.lost_sales;
end
$procedure$
;
