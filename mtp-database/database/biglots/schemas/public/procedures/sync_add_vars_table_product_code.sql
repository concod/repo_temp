--liquibase formatted sql
--changeset linu.nazil:sync_add_vars_table_product_code runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sp_data_sync
--comment: initial changeset for sync_add_vars_table_product_code
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_add_vars_table_product_code();
CREATE OR REPLACE PROCEDURE public.sync_add_vars_table_product_code()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_add_vars_table_product_code';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
         delete FROM 
         global.add_vars_table_product_code
         WHERE 
         true; 
         
         INSERT INTO global.add_vars_table_product_code (
            fiscal_year,
            fiscal_week,
            msrp,
            cost,
            coupon_discount_per_unit,
            product_code,
            oh_inv,
            perc_store_on_md,
            sku_count,
            start_flag,
            end_flag,
            perc_md_oh_inv,
            md_flag
             )
         SELECT  
            fiscal_year,
            fiscal_week,
            round(msrp::numeric, 2),
            round(cost::numeric, 2),
            round(coupon_discount_per_unit::numeric, 2),
            product_code,
            round(oh_inv::numeric, 2),
            round(perc_store_on_md::numeric, 2),
            sku_count,
            start_flag,
            end_flag,
            round(perc_md_oh_inv::numeric, 2),
            md_flag
         FROM 
             public.add_vars_table_product_code; 
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
