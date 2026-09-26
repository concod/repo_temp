-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_simulation_week_mkd_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_simulation_week_mkd
-- comment: derived table for tb_simulation_week_mkd_v5

DROP  PROCEDURE if exists public.sync_simulation_week_mkd();

CREATE OR REPLACE PROCEDURE public.sync_simulation_week_mkd()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_simulation_week_mkd';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		    drop table if exists price_markdown_opt.tb_simulation_week_mkd CASCADE;
	        CREATE TABLE if not exists price_markdown_opt.tb_simulation_week_mkd (
			    product_id INTEGER NOT NULL,
			    week_start_date DATE NOT NULL,
			    base_percentage INTEGER,
			    bnm_sales_units FLOAT,
			    bnm_baseline_sales_units FLOAT,
			    bnm_elasticity FLOAT,
			    ecom_sales_units FLOAT,
			    ecom_baseline_sales_units FLOAT,
			    ecom_elasticity FLOAT
			) PARTITION BY RANGE (week_start_date);
		call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_simulation_week_mkd', 'week', '26 week', 'forward');
		call price_promo_opt.pc_create_date_partitions('price_markdown_opt', 'tb_simulation_week_mkd', 'week', '2 week', 'backward');

	        INSERT INTO price_markdown_opt.tb_simulation_week_mkd
	        (
		    product_id,
		    week_start_date,
		    base_percentage,
		    bnm_sales_units,
		    bnm_baseline_sales_units,
		    bnm_elasticity,
		    ecom_sales_units,
		    ecom_baseline_sales_units,
		    ecom_elasticity
	        )

		  select
		    product_id,
		    week_start_date,
		    base_percentage,
		    bnm_sales_units,
		    bnm_baseline_sales_units,
		    bnm_elasticity,
		    ecom_sales_units,
		    ecom_baseline_sales_units,
		    ecom_elasticity
		  from public.simulation_week_mkd
		;
		CREATE INDEX idx_product_basepercentage ON
		price_markdown_opt.tb_simulation_week_mkd
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