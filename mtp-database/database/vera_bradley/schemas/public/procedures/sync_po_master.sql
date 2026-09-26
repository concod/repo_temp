--liquibase formatted sql
--changeset laraib.ahmad@impactanalytics.co:sync_po_master runOnChange:true stripComments:false splitStatements:false context:MTP-26840 labels:liquibase_project_start
--comment: updated po_master to add article and number_of_allocations
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
 		  dc_code, allocated_qty, available_qty,not_before_date,pack_type_id,article,number_of_allocations
 		) 
 		select po_code, 
 		  product_code, 
 		  channel, 
 		  requirement_date, 
 		  dc_code, 
 		  sum(allocated_qty) as allocated_qty, 
 		  sum(available_qty) as available_qty,
 		  not_before_date,pack_type_id,article,number_of_allocations from (
 		SELECT 
 		  po_code, 
 		  product_code, 
 		  channel, 
 		  requirement_date, 
 		  dc.dc_code, 
 		  allocated_qty, 
 		  available_qty,
 		  not_before_date,pack_type_id,paf.article,coalesce(number_of_allocations,0) as number_of_allocations
 		FROM 
 		  public.po_master x 
 		  join global.store_master dc on x.dc_code = dc.store_code 
 		  join global.product_master pm using(product_code)
 		  left join "global".product_attributes_filter paf using(product_code)
 		  left join(
 		  SELECT article,channel,count(distinct allocation_code) as number_of_allocations 
 FROM inventory_smart.create_allocation_result_flat_gurobi carfs
 LEFT JOIN global.store_attributes_filter saf ON store_code = store
 LEFT JOIN (
 SELECT * FROM inventory_smart.plan_master where type in ('0','2')
 ) pm ON carfs.allocation_code = pm.plan_code where
  pm.status = 2
 AND pm.is_deleted = false
 group by 1,2
  		  ) as c using(article,channel)
 		where 
 		  1=1) x group by po_code, product_code, dc_code, channel, requirement_date, not_before_date,pack_type_id,number_of_allocations,article;
 	end
 $procedure$
;

