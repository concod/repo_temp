--liquibase formatted sql
--changeset himansh.bhardwaj:sync_fwos_sku_store_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_fwos_sku_store_table();
CREATE OR REPLACE PROCEDURE public.sync_fwos_sku_store_table()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'inventory_smart.sync_fwos_sku_store_table';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    -- Initial logging
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);

    begin
        _log_step := 'Deleting target table';
        delete from inventory_smart.fwos_sku_store_table where true;

        _log_step := 'Inserting data from public schema';
        insert into inventory_smart.fwos_sku_store_table (
            product_code,
            store_code,
            oh,
            it,
            oo,
            total_inv,
            sales,
            first_sales_date,
            last_sales_date,
            weeks,
            ros,
            wos_oh,
            wos_oh_it,
            wos_oh_oo,
            wos_oh_oo_it
        )
        select 
            product_code,
            store_code,
            oh,
            it,
            oo,
            total_inv,
            sales,
            first_sales_date,
            last_sales_date,
            weeks,
            ros,
            wos_oh,
            wos_oh_it,
            wos_oh_oo,
            wos_oh_oo_it
        from 
            public.fwos_sku_store_table;

        -- Success logging
        call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);

    exception
        when others then
            -- Error logging
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in procedure % at step %: %', _sp_name, _log_step, SQLERRM;
    end;
end
$procedure$;