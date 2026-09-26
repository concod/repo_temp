-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_product_master_sku_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_master_promo
-- comment: derived table for sync_product_master_sku_v5

DROP  PROCEDURE if exists public.sync_product_master_sku();

CREATE OR REPLACE PROCEDURE public.sync_product_master_sku()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_master_sku';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_markdown.product_master_sku;

	        INSERT INTO price_markdown.product_master_sku
	        (
			l0_id,
			l0_name,
			l0_cuq,
			l0_cid,
			l1_id,
			l1_name,
			l1_cuq,
			l1_cid,
			l2_id,
			l2_name,
			l2_cuq,
			l2_cid,
			l3_id,
			l3_name,
			l3_cuq,
			l3_cid,
			l4_id,
			l4_name,
			l4_cuq,
			l4_cid,
			brand,
			brand_cid,
			org_brand,
			l5_id,
			l5_cuq,
			l5_cid,
			style_id,
			style_cuq,
			style_desc,
			mfg_no,
			mfg_name,
			product_id,
			sku_id,
			sku_name,
			product_name,
			product_cuq,
			msrp,
			launch_price,
			current_price,
			"cost",
			ecom_shipping_cost,
			phase_id,
			phase_desc,
			launch_date,
			eol_flag,
			lifecycle_indicator,
			clearance_indicator,
			dropship_indicator,
			bopis,
			status,
			active,
			is_active,
			store_age,
			ecom_age,
			max_age,
			age_month_bucket,
			fob,
			original_style_desc,
			st_bnm,
			st_ecom,
			clearance_eligible_bnm,
			clearance_eligible_ecom,
			last_reg_price_bnm,
			last_reg_price_ecom,
			clearance_eligible
	        )
			select
			l0_id,
			l0_name,
			l0_cuq,
			l0_cid,
			l1_id,
			l1_name,
			l1_cuq,
			l1_cid,
			l2_id,
			l2_name,
			l2_cuq,
			l2_cid,
			l3_id,
			l3_name,
			l3_cuq,
			l3_cid,
			l4_id,
			l4_name,
			l4_cuq,
			l4_cid,
			brand,
			brand_cid,
			org_brand,
			cast(l5_id as int8) as l5_id,
			l5_cuq,
			l5_cid,
			style_id,
			style_cuq,
			style_desc,
			mfg_no,
			mfg_name,
			style_cid as product_id,
			cast(product_code as int8) as sku_id,
			sku_name,
			style_desc as product_name,
			style_cuq as product_cuq,
			msrp,
			launch_price,
			current_price,
			"cost",
			ecom_shipping_cost,
			phase_id,
			phase_desc,
			launch_date,
			eol_flag,
			lifecycle_indicator,
			clearance_indicator,
			dropship_indicator,
			bopis,
			status,
			case when is_active = 1 then true else false end as active,
			is_active,
			store_age,
			ecom_age,
			max_age,
			age_month_bucket,
			fob,
			original_style_desc,
			st_bnm,
			st_ecom,
			clearance_eligible_bnm,
			clearance_eligible_ecom,
			last_reg_price_bnm,
			last_reg_price_ecom,
			clearance_eligible
			from public.product_master_sku
--			group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65
			;
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