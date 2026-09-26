-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_simulation_week_opt_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_simulation_week_opt
-- comment: derived table for tb_simulation_week_opt_v5

DROP  PROCEDURE if exists public.sync_simulation_week_opt();

CREATE OR REPLACE PROCEDURE public.sync_simulation_week_opt()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_simulation_week_opt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_promo_opt.tb_simulation_week_opt CASCADE;
	        CREATE TABLE if not exists price_promo_opt.tb_simulation_week_opt (
			    product_id INTEGER NOT NULL,
			    week_start_date DATE NOT NULL,
			    base_percentage INTEGER,
			    bnm_sales_units FLOAT,
			    bnm_baseline_sales_units FLOAT,
			    bnm_elasticity FLOAT,
			    bnm_product_split_ratio FLOAT,
			    ecom_sales_units FLOAT,
			    ecom_baseline_sales_units FLOAT,
			    ecom_elasticity FLOAT,
			    ecom_product_split_ratio FLOAT
			) PARTITION BY RANGE (week_start_date);
		call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_simulation_week_opt', 'week', '26 week', 'forward');
		call price_promo_opt.pc_create_date_partitions('price_promo_opt', 'tb_simulation_week_opt', 'week', '2 week', 'backward');

	        INSERT INTO price_promo_opt.tb_simulation_week_opt
	        (
		    product_id,
		    week_start_date,
		    base_percentage,
		    bnm_sales_units,
		    bnm_baseline_sales_units,
		    bnm_elasticity,
		    bnm_product_split_ratio,
		    ecom_sales_units,
		    ecom_baseline_sales_units,
		    ecom_elasticity,
		    ecom_product_split_ratio
	        )

		  select
		    product_id,
		    week_start_date,
		    base_percentage,
		    bnm_sales_units,
		    bnm_baseline_sales_units,
		    bnm_elasticity,
		    bnm_product_split_ratio,
		    ecom_sales_units,
		    ecom_baseline_sales_units,
		    ecom_elasticity,
		    ecom_product_split_ratio
		  from public.simulation_week_opt
		;
			CREATE INDEX idx_product_basepercentage ON
			price_promo_opt.tb_simulation_week_opt
			USING BTREE (product_id, base_percentage);
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