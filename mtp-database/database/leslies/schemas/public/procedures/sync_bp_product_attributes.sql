-- liquibase formatted sql
-- changeset kumaran.k@impactanalytics.co:sync_bp_product_attributes_v5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_bp_product_attributes
-- comment: derived table for sync_bp_product_attributes_v5

DROP  PROCEDURE if exists public.sync_bp_product_attributes();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_bp_product_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
            TRUNCATE TABLE base_pricing.bp_product_attributes;
             DROP INDEX IF EXISTS base_pricing.bs_product_attributes_idx;
           
            INSERT INTO base_pricing.bp_product_attributes
            (
product_id,
manufacturer,
family,
channel_grade,
active,
map,
size,
uom,
derived_size,
derived_uom,
base_cost,
rebate,
marketplace_fee,
shipping_cost,
residential_price,
c1_price,
c2_price,
c3_price,
c4_price,
c5_price,
c6_price,
c7_price,
c8_price,
c9_price,
refurb_indicator,
kvi_leslie_residential,
kvi_its_residential,
kvi_commercial_commercial,
kvc_leslie_residential,
kvc_its_residential,
kvc_commercial_commercial,
item_key,
dept_cls_hier_key,
sku_type_desc,
merch_flag,
item_clearance_date,
item_short_desc,
item_set_typ_cd,
item_set_typ_nm,
chain_prc_cd,zone_prc_cd,
store_prc_cd,
item_discontinue_dt_skey,
buyer_id,
buyer_description,
vendor_id,
vendor_description,
launch_date,
line_group,
brand_family,
brand_class,
size_family,
size_class,
is_usable,
price_lock,
pre_price,
price_freeze,
child_sku
 )
 
            select
product_id,
manufacturer,
family,
channel_grade,
active,
map,
size,
uom,
derived_size,
derived_uom,
base_cost,
rebate,
marketplace_fee,
shipping_cost,
res_price,
c1_price,
c2_price,
c3_price,
c4_price,
c5_price,
c6_price,
c7_price,
c8_price,
c9_price,
refurb_indicator,
kvi_leslie_residential,
kvi_its_residential,
kvi_commercial_commercial,
kvc_leslie_residential,
kvc_its_residential,
kvc_commercial_commercial, 
item_key,
dept_cls_hier_key,
sku_type_desc,
case when merch_flag = true then 1 else 0 end as merch_flag,
item_clearance_dt,
item_short_desc,
item_set_typ_cd,
item_set_typ_nm,
chain_prc_cd,zone_prc_cd,
store_prc_cd,
item_discontinue_dt_skey,
buyer_id,
buyer_description,
vendor_id,
vendor_description,
launch_date,
line_group,
brand_family,
brand_class,
size_family,
size_class,
is_usable,
false as price_lock,
false as pre_price,
false as price_freeze,
child_sku
            from public.bp_product_attributes
            where product_id in (select distinct product_id from base_pricing.bp_product_master)
        group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 
    41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 
    51, 52, 53, 54, 55, 56, 57, 58;
    CREATE INDEX bs_product_attributes_idx ON base_pricing.bp_product_attributes  USING btree(product_id);
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
