--liquibase formatted sql
--changeset liquibase:product_master_v9 runAlways:true stripComments:false splitStatements:false context:product_master labels:product_master
--comment: product_master_v9
--rollback: SELECT 1


DO
$$
DECLARE 
	_is_view int;
	_is_table int;
BEGIN

	SELECT count(*) AS cnt INTO _is_table
	FROM information_schema."tables" c  
	WHERE table_name = 'product_master' 
	  AND table_schema = 'price_promo' 
	  AND table_type = 'BASE TABLE';

	SELECT count(*) AS cnt INTO _is_view
	FROM information_schema."tables" c  
	WHERE table_name = 'product_master' 
	  AND table_schema = 'price_promo' 
	  AND table_type = 'VIEW';

	IF _is_table = 1 THEN 
	
		DROP TABLE IF EXISTS price_promo.product_master;
		--raise notice 'dropping table....';
		
	END IF;
	
	IF _is_view = 1 THEN 
	
		DROP VIEW IF EXISTS price_promo.product_master;
		--raise notice 'dropping view....';
		
	END IF;

END
$$;

DROP VIEW IF EXISTS price_promo.product_master;
CREATE OR REPLACE VIEW price_promo.product_master
AS SELECT t1.l0_id,
    t1.l0_name,
    t1.l0_cuq,
    t1.l0_cid,
    t1.l1_id,
    t1.l1_name,
    t1.l1_cuq,
    t1.l1_cid,
    t1.l2_id,
    t1.l2_name,
    t1.l2_cuq,
    t1.l2_cid,
    t1.l3_id,
    t1.l3_name,
    t1.l3_cuq,
    t1.l3_cid,
    t1.l4_id,
    t1.l4_cid,
    t1.l4_name,
    t1.l4_cuq,
    t1.product_id,
    t1.product_id_actual,
    t1.product_name,
    t1.product_description,
    t1.hierarchy_id,
    t1.active,
    t1.is_active,
    t1.manufacturer_id,
    t1.manufacturer,
    t1.manufacturer_cuq,
    t1.manufacturer_cid,
    t1.merchandiser_id,
    t1.merchandiser,
    t1.merchandiser_cuq,
    t1.merchandiser_cid,
    t1.brand_id,
    t1.brand,
    t1.brand_cuq,
    t1.brand_cid,
    t1.inventory_manager_id,
    t1.inventory_manager,
    t1.preferred_brand,
    t1.psp_store_count,
    t1.wnw_store_count,
    t1.base_retail,
    t1.base_retail_li,
    t1.promo_base_price,
    t1.cost,
    t1.pspd_cost,
    t1.vendor_mail_id,
    t1.merchant_mail_id,
    t1.kvi_indicator,
    t1.currency_id,
    t1.price_bucket,
    t1.size_bucket,
    t1.price_bucket_cid,
    t1.size_bucket_cid,
    t1.vendor_id,
    t1.vendor,
    t1.primaryupc,
    t1.pspd_item,
    t1.map,
    t1.imap,
    t1.endcap_flag,
    t1.version_code,
    t1.vendor_cuq,
    t1.vendor_cid,
    t1.clearance_indicator,
    t1.uom,
    t1.size,
    t1.size_actual,
    t1.original_uom,
    t1.uom_cid,
    NULL::text AS total_inventory,
    NULL::text AS oh,
    NULL::text AS it,
    NULL::text AS oo,
    NULL::text AS vendor_oo,
    t1.last_sold,
    t1.movement,
    '2022-01-01'::date AS promo_base_price_valid_from,
    '2099-12-31'::date AS promo_base_price_valid_to,
    uam_hierarchy_id,
    is_consumable
   FROM price_promo.product_master_promo_version t1
  WHERE t1.version_code = global.get_table_version('price_promo.product_master_promo_version'::text);
