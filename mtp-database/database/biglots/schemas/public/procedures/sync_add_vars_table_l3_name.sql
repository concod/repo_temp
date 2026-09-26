--liquibase formatted sql
--changeset linu.nazil:sync_add_vars_table_l3_name runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sp_data_sync
--comment: initial changeset for sync_add_vars_table_l3_name
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_add_vars_table_l3_name();
CREATE OR REPLACE PROCEDURE public.sync_add_vars_table_l3_name()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_add_vars_table_l3_name';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
         delete FROM 
         global.add_vars_table_l3_name
         WHERE 
         true; 
         
         INSERT INTO global.add_vars_table_l3_name (
            fiscal_year,
            fiscal_week,
            hierarchy_code,
            msrp,
            cost,
            coupon_discount_per_unit,
            oh_inv,
            perc_store_on_md,
            md_flag,
            sku_count,
            start_flag,
            end_flag,
            sku_store_count_inv,
            perc_md_oh_inv
             )
         SELECT  
            fiscal_year,
            fiscal_week,
            hierarchy_code,
            round(msrp::numeric, 2),
            round(cost::numeric, 2),
            round(coupon_discount_per_unit::numeric, 2),
            round(oh_inv::numeric, 2),
            round(perc_store_on_md::numeric, 2),
            md_flag,
            sku_count,
            start_flag,
            end_flag,
            sku_store_count_inv,
            round(perc_md_oh_inv::numeric, 2)
         FROM 
             public.add_vars_table_l3_name; 
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
