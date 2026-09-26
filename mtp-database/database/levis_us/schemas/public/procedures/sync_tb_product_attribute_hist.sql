--liquibase formatted sql
--changeset raghav.kirkol:SPs set up in test runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:levis_dev
--comment: initial changeset
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS  public.sync_tb_product_attribute_hist();

CREATE OR REPLACE PROCEDURE public.sync_tb_product_attribute_hist()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_product_attribute_hist';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

  DELETE FROM size_smart.tb_product_attribute;

  -- Step 2: Reset the sequence for the `id` column
  PERFORM setval('size_smart.tb_product_attribute_id_seq', 1, false);
 
  INSERT INTO size_smart.tb_product_attribute (
    subcategory,
    internal_name,
    global_fit_platform,
    is_selected,
    created_at,
    updated_at,
    upc_ean,
    stretch_type_nm,
    color_finish_des,
    leg_opening_nm,
    season_nm,
    product_family,
    sleeve_length_nm,
    product_price_positioning,
    demographic_name,
    consumer_seg_nm,
    waist_rise_nm,
    neckline_nm
  )
  SELECT DISTINCT ON (subcategory, internal_name, l4_name)
    subcategory,
    internal_name,
    l4_name AS global_fit_platform,
    FALSE AS is_selected,
    created_at::timestamptz,
    updated_at::timestamptz,
    upc_ean,
    stretch_type_nm,
    color_finish_des,
    leg_opening_nm,
    season_nm,
    product_family,
    sleeve_length_nm,
    product_price_positioning,
    demographic_name,
    consumer_seg_nm,
    waist_rise_nm,
    neckline_nm
  FROM public.tb_hierarachy_mst;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;
