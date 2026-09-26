-- liquibase formatted sql
-- changeset abhishek.sagar@impactanalytics.co:sync_product_store_attributes_filter_store_code runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_product_store_attributes_filter_store_code
-- comment: updated logic for sync_product_store_attributes_filter_store_code based on l1_name and s1_name join

DROP PROCEDURE if exists public.sync_product_store_attributes_filter_store_code();




CREATE OR REPLACE PROCEDURE public.sync_product_store_attributes_filter_store_code()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_product_store_attributes_filter_store_code';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin
        delete from
          "global".product_store_attributes_filter_store_code
          where
              true
        ;
        INSERT INTO "global".product_store_attributes_filter_store_code (
    l0_name,
    psa_code,
    psa_name,
    store_code
        )
       
select  l0_name,
    psa_code,
    psa_name,
    store_code
from public.product_store_attributes_filter_store_code a ;
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



