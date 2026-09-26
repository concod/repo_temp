--liquibase formatted sql
--changeset liquibase:sync_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_po_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_po_master();
CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	begin
		delete from 
		  inventory_smart.po_master 
		where 
		  true;
		insert into inventory_smart.po_master (
		  po_code, product_code, channel, requirement_date, 
		  dc_code, allocated_qty, available_qty,not_before_date
		) 
		SELECT 
		  po_code, 
		  product_code, 
		  channel, 
		  requirement_date, 
		  dc.dc_code, 
		  allocated_qty, 
		  available_qty,
		  not_before_date
		FROM 
		  public.po_master_derived x 
		  join global.store_master dc on x.dc_code = dc.store_code 
		  join global.product_master pm using(product_code) 
		where 
		  requirement_date >= current_date 
		  and current_date >= not_before_date;
	end
$procedure$
;
