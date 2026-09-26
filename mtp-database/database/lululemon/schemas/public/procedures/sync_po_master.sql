
--liquibase formatted sql
--changeset himansh.bhardwaj:sync_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_po_master
--comment: initial changeset
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
             
            INSERT INTO inventory_smart.po_master
            (
            po_code,
            requirement_date,
            channel,
            available_qty,
            dc_code,
            pack_type_id,
            article,
            product_code
            )
            select
            po_code,
            cast(requirement_date as date) requirement_date,
            channel,
            available_qty,
            b.dc_code,
            pack_type_id,
            article,
            product_code
            from public.po_master a
            join "global".distribution_centres b
on a.dc_code = b.linked_store_code
where a.dc_code is not null  ;
       
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

