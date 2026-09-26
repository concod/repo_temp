-- liquibase formatted sql
-- changeset vaibhav.singh@impactanalytics.co:sync_tb_day_split_opt_kvi_1301_vs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_day_split_opt_kvi
-- comment: derived table for sync_tb_day_split_opt_kvi_1301_vs

DROP PROCEDURE if exists public.sync_tb_day_split_opt_kvi();

CREATE OR REPLACE PROCEDURE public.sync_tb_day_split_opt_kvi()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_day_split_opt_kvi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo_opt.tb_day_split_opt_kvi CASCADE;

	            CALL price_promo_opt.pc_create_date_partitions(
        'price_promo_opt', 'tb_day_split_opt_kvi', 'day', '1 year', 'forward'
    );

    CALL price_promo_opt.pc_create_date_partitions(
        'price_promo_opt', 'tb_day_split_opt_kvi', 'day', '1 year', 'backward'
    );

	        INSERT INTO price_promo_opt.tb_day_split_opt_kvi
	        (
                product_id,
                s0_id,
                c0_id,
                date,
                day_split_ratio
          )
			select
                cast(product_id as int4) as product_id,
                s0_id,
                c0_id,
                date,
                day_split_ratio
			from public.tb_day_split_opt_kvi;


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
