--liquibase formatted sql
--changeset kirubasahari.n:sync_po_master_bulk_release runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:RLIS-878
--comment: Changeset for sync_po_master_bulk_release
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
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from 
      inventory_smart.po_master 
    where 
      true;
    INSERT INTO inventory_smart.po_master (po_code, raw_po_code, dept_nbr, class_nbr, style_nbr, color_nbr, size_nbr, div_nbr, vendor_nbr, 
    simple_vendor_cost, po_vendor_code, requirement_date, cancel_date, anticipate_date, article, dest_whouse,
    available_qty, product_code, allocated_qty, not_before_date, pack_type_id,po_type, dc_code, channel,s1_id) 

      select concat(po_code,'-',dest_whouse),po_code, dept_nbr, class_nbr, style_nbr, color_nbr, size_nbr, div_nbr, vendor_nbr, 
    simple_vendor_cost, po_vendor_code, requirement_date, cancel_date, anticipate_date, article, dc_code,
    available_qty, pack_type_id, allocated_qty, CURRENT_DATE -1, pack_type_id, po_type,
    case 
      when po_type ='Bulk Release PO' then 1
      when po_type ='Jewelry Fragrance PO' then dc_code
    end,
    'PFS',
    s1_id
    from public.bulk_release_po_master;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
  end
$procedure$
;