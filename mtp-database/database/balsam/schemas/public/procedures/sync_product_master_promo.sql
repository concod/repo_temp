-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_product_master_promo_v6 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_product_master_promo
-- comment: derived table for product master promo_v6 ids to text

DROP  PROCEDURE if exists public.sync_product_master_promo();

CREATE OR REPLACE PROCEDURE public.sync_product_master_promo()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_master_promo';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE price_promo.product_master;

	         DROP INDEX IF EXISTS price_promo.product_master_promo_product_id_idx;

	        INSERT INTO price_promo.product_master
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
          l5_name,
          l5_cuq,
          l5_cid,
          product_id,
          product_name,
          product_cuq,
          mfg_no,
          mfg_name,
          msrp,
          launch_price,
          current_price,
          cost,
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
          fob
	        )
			select
          cast(l0_id as text) as l0_id,
          l0_name,
          l0_cuq,
          l0_cid,
          cast(l1_id as text) as l1_id,
          l1_name,
          l1_cuq,
          l1_cid,
          cast(l2_id as text) as l2_id,
          l2_name,
          l2_cuq,
          l2_cid,
          cast(l3_id as text) as l3_id,
          l3_name,
          l3_cuq,
          l3_cid,
          cast(l4_id as text) as l4_id,
          l4_name,
          l4_cuq,
          l4_cid,
          brand,
          brand_cid,
          org_brand,
          cast(l5_id as text) as l5_id,
          l5_name,
          l5_cuq,
          l5_cid,
          product_id,
          product_name,
          product_cuq,
          cast(mfg_no as text) as mfg_no,
          mfg_name,
          round(cast(msrp as numeric),2) as msrp,
          round(cast(launch_price as numeric),2) as launch_price,
          round(cast(current_price as numeric),2) as current_price,
          round(cast(cost as numeric),2) as cost,
          round(cast(ecom_shipping_cost as numeric),2) as ecom_shipping_cost,
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
          fob
			from public.product_master_promo
		group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49;
	CREATE INDEX product_master_promo_product_id_idx ON price_promo.product_master (product_id);
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