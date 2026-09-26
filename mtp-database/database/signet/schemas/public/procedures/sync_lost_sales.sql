--liquibase formatted sql
--changeset saumya.agnihotri:sync_lost_sales_new runOnChange:true stripComments:false splitStatements:false context:Inv_Reporting labels:MTP-23523
--comment: added left-out store and product attributes for lost sales report by saumya_2
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_lost_sales();
DROP PROCEDURE IF EXISTS public.sync_lost_sales(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_lost_sales(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_lost_sales';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    call global.build_list_partitions('lost_sales');
	if _is_historic then 
		delete from 
		  inventory_smart.instock_report 
		where 
		  true;
		perform global.create_drop_index_list_ingestion('inventory_smart', 'lost_sales', true);
	end if;
	INSERT INTO inventory_smart.lost_sales (
	  product_code, store_code, dma, vpro, 
	  fiscal_year_week, oh, end_of_week_min, 
	  end_of_week_model_stock, actual_sales, 
	  lost_sales, product_channel_name, vendor_code,
	  product_type, merchandise_category, merchandise_brand,
	  planning_ownership, production_method, dotcom_exclusive,
	  metal_color, metal_type, channel, combo_store,
	  district, shop_in_shop, state, brand, lost_sales_to_model_stock_perc,
	  store_name, product_description, l0_name, l1_name, l2_name, region

	) 
	select 
	  product_code, 
	  store_code, 
	  dma, 
	  vpro, 
	  fiscal_year_week, 
	  oh, 
	  end_of_week_min, 
	  end_of_week_model_stock, 
	  actual_sales, 
	  lost_sales, 
	  product_channel_name, 
	  vendor_code,
	  product_type, 
	  merchandise_category, 
	  merchandise_brand,
	  planning_ownership, 
	  production_method, 
	  dotcom_exclusive,
	  metal_color, 
	  metal_type, 
	  channel, 
	  combo_store,
	  district, 
	  shop_in_shop, 
	  state, 
	  brand,
	  lost_sales_to_model_stock_perc,
	  store_name,
	  product_description, 
	  l0_name, 
	  l1_name, 
	  l2_name,
	  vpro as region

	from 
	  public.lost_sales on conflict(
	    product_code, store_code, fiscal_year_week
	  ) do 
	update 
	set 
	  dma = excluded.dma, 
	  vpro = excluded.vpro, 
	  oh = excluded.oh, 
	  end_of_week_min = excluded.end_of_week_min, 
	  end_of_week_model_stock = excluded.end_of_week_model_stock, 
	  actual_sales = excluded.actual_sales, 
	  lost_sales = excluded.lost_sales, 
	  product_channel_name = excluded.product_channel_name,
	  vendor_code = excluded.vendor_code,
	  product_type = excluded.product_type,
	  merchandise_category = excluded.merchandise_category,
	  merchandise_brand = excluded.merchandise_brand,
	  planning_ownership = excluded.planning_ownership,
	  production_method = excluded.production_method,
	  dotcom_exclusive = excluded.dotcom_exclusive,
	  metal_color = excluded.metal_color,
	  metal_type = excluded.metal_type,
	  channel = excluded.channel,
	  combo_store = excluded.combo_store,
	  district = excluded.district,
	  shop_in_shop = excluded.shop_in_shop,
	  state = excluded.state,
	  brand = excluded.brand,
	  lost_sales_to_model_stock_perc = excluded.lost_sales_to_model_stock_perc,
	  store_name = excluded.store_name,
	  product_description = excluded.product_description, 
	  l0_name = excluded.l0_name, 
	  l1_name = excluded.l1_name, 
	  l2_name = excluded.l2_name,
	  region = excluded.vpro;
	if _is_historic then 
		perform global.create_drop_index_list_ingestion('inventory_smart', 'lost_sales', false);
	end if;
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
