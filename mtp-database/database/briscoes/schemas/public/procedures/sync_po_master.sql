--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_po_master_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_sync_po_master_1
--comment: initial changeset for sync_po_master_1
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_po_master();
CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM 
      inventory_smart.po_master 
    WHERE 
      true;
    INSERT INTO inventory_smart.po_master (
      po_code, product_code, channel, requirement_date, 
      dc_code, not_before_date,number_of_allocations,article,sales_org_name,pack_type_id,allocated_qty, available_qty
    ) 
    SELECT 
      po_code, 
      product_code, 
      channel,  
      requirement_date, 
      dc_code, 
      not_before_date,
	-- newly added columns
	  number_of_allocations,
	  article,
	  sales_org_name,
	  pack_type_id,
      SUM(allocated_qty) AS allocated_qty, 
      SUM(available_qty) AS available_qty
    FROM (
        SELECT 
          po_code, 
          product_code, 
          'BnM' as channel,  
          requirement_date, 
          dc.dc_code AS dc_code,
          allocated_qty, 
          available_qty,
          not_before_date,
          pack_type_id,
	-- newly added columns
		  number_of_allocations,
		  article,
		  sales_org_name
        FROM 
          public.po_latest x 
          JOIN global.store_master dc ON x.dc_code = dc.store_code 
          JOIN global.product_master pm USING(product_code) 
        WHERE 
          requirement_date >= current_date 
          AND current_date >= not_before_date
    ) x 
    GROUP BY 1, 2, 3, 4, 5, 6,7,8,9,10;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;