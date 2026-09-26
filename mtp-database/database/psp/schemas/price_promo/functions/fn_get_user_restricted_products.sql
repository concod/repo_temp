--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_user_restricted_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_user_restricted_products

DROP FUNCTION if exists price_promo.fn_get_user_restricted_products;

CREATE OR REPLACE FUNCTION price_promo.fn_get_user_restricted_products(
    p_user_id INT,
    p_is_active integer[] DEFAULT ARRAY[1]
)
RETURNS TABLE(
    l0_id int4,
    l0_name text,
    l0_cuq text,
    l0_cid int4,
    l1_id int4,
    l1_name text,
    l1_cuq text,
    l1_cid int4,
    l2_id int4,
    l2_name text,
    l2_cuq text,
    l2_cid int4,
    l3_id int4,
    l3_name text,
    l3_cuq text,
    l3_cid int4,
    l4_id int4,
    l4_cid int4,
    l4_name text,
    l4_cuq text,
    product_id int8,
    product_id_actual varchar,
    product_name text,
    product_description text,
    hierarchy_id int4,
    active boolean,
    is_active int4,
    manufacturer_id int4,
    manufacturer text,
    manufacturer_cuq text,
    manufacturer_cid int4,
    merchandiser_id int4,
    merchandiser text,
    merchandiser_cuq text,
    merchandiser_cid int4,
    brand_id int4,
    brand text,
    brand_cuq text,
    brand_cid int4,
    inventory_manager_id int4,
    inventory_manager text,
    preferred_brand boolean,
    psp_store_count int4,
    wnw_store_count int4,
    base_retail float8,
    base_retail_li float8,
    promo_base_price float8,
    cost float8,
    pspd_cost float8,
    vendor_mail_id text,
    merchant_mail_id text,
    kvi_indicator int4,
    currency_id int4,
    price_bucket text,
    size_bucket text,
    price_bucket_cid int4,
    size_bucket_cid int4,
    vendor_id int4,
    vendor text,
    primaryupc text,
    pspd_item boolean,
    map float8,
    imap float8,
    endcap_flag int4,
    version_code int4,
    vendor_cuq text,
    vendor_cid int4,
    clearance_indicator int4,
    uom text,
    size int4,
    size_actual float,
    original_uom text,
    uom_cid int4,
    total_inventory text,
    oh text,
    it text,
    oo text,
    vendor_oo text,
    last_sold date,
    movement int4,
    promo_base_price_valid_from date,
    promo_base_price_valid_to date,
    uam_hierarchy_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    _query text;
    v_access_hierarchy JSONB;
    promo_application_code INTEGER;
BEGIN
    -- Get application_code from configuration
    select config_value::integer into promo_application_code
    from price_promo.tb_tool_configurations
    where module = 'application' and config_name = 'application_code';
    
    -- Get access hierarchy from user access hierarchy mapping
    select 
        access_hierarchy into v_access_hierarchy 
    from 
        global.user_access_hierarchy_mapping where user_code = p_user_id
        and acl_code in (
            select acl_code from global.acl_master 
            where application_code = promo_application_code
        );

    -- If no access hierarchy, return all products
    IF v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        _query := format('
            SELECT 
                pm.l0_id,
                pm.l0_name,
                pm.l0_cuq,
                pm.l0_cid,
                pm.l1_id,
                pm.l1_name,
                pm.l1_cuq,
                pm.l1_cid,
                pm.l2_id,
                pm.l2_name,
                pm.l2_cuq,
                pm.l2_cid,
                pm.l3_id,
                pm.l3_name,
                pm.l3_cuq,
                pm.l3_cid,
                pm.l4_id,
                pm.l4_cid,
                pm.l4_name,
                pm.l4_cuq,
                pm.product_id,
                pm.product_id_actual,
                pm.product_name,
                pm.product_description,
                pm.hierarchy_id,
                pm.active,
                pm.is_active,
                pm.manufacturer_id,
                pm.manufacturer,
                pm.manufacturer_cuq,
                pm.manufacturer_cid,
                pm.merchandiser_id,
                pm.merchandiser,
                pm.merchandiser_cuq,
                pm.merchandiser_cid,
                pm.brand_id,
                pm.brand,
                pm.brand_cuq,
                pm.brand_cid,
                pm.inventory_manager_id,
                pm.inventory_manager,
                pm.preferred_brand,
                pm.psp_store_count,
                pm.wnw_store_count,
                pm.base_retail,
                pm.base_retail_li,
                pm.promo_base_price,
                pm.cost,
                pm.pspd_cost,
                pm.vendor_mail_id,
                pm.merchant_mail_id,
                pm.kvi_indicator,
                pm.currency_id,
                pm.price_bucket,
                pm.size_bucket,
                pm.price_bucket_cid,
                pm.size_bucket_cid,
                pm.vendor_id,
                pm.vendor,
                pm.primaryupc,
                pm.pspd_item,
                pm.map,
                pm.imap,
                pm.endcap_flag,
                pm.version_code,
                pm.vendor_cuq,
                pm.vendor_cid,
                pm.clearance_indicator,
                pm.uom,
                pm.size,
                pm.size_actual,
                pm.original_uom,
                pm.uom_cid,
                pm.total_inventory,
                pm.oh,
                pm.it,
                pm.oo,
                pm.vendor_oo,
                pm.last_sold,
                pm.movement,
                pm.promo_base_price_valid_from,
                pm.promo_base_price_valid_to,
                pm.uam_hierarchy_id
            FROM 
                price_promo.product_master pm where pm.is_active = any(%1$L)
        ', p_is_active);
        
    -- If access hierarchy exists, return products that match the access hierarchy
    else
        _query := format('
			with uam_hierarchy_cte as MATERIALIZED(
				select 
					distinct jsonb_array_elements(uahm.access_hierarchy) ->> ''product_hierarchy_id'' as uam_hiearachy_id
				from global.user_access_hierarchy_mapping uahm
				INNER JOIN global.acl_master acl
				    ON uahm.acl_code = acl.acl_code
				AND acl.application_code = %3$s where user_code = %1$s
			)
            SELECT 
                pm.l0_id,
                pm.l0_name,
                pm.l0_cuq,
                pm.l0_cid,
                pm.l1_id,
                pm.l1_name,
                pm.l1_cuq,
                pm.l1_cid,
                pm.l2_id,
                pm.l2_name,
                pm.l2_cuq,
                pm.l2_cid,
                pm.l3_id,
                pm.l3_name,
                pm.l3_cuq,
                pm.l3_cid,
                pm.l4_id,
                pm.l4_cid,
                pm.l4_name,
                pm.l4_cuq,
                pm.product_id,
                pm.product_id_actual,
                pm.product_name,
                pm.product_description,
                pm.hierarchy_id,
                pm.active,
                pm.is_active,
                pm.manufacturer_id,
                pm.manufacturer,
                pm.manufacturer_cuq,
                pm.manufacturer_cid,
                pm.merchandiser_id,
                pm.merchandiser,
                pm.merchandiser_cuq,
                pm.merchandiser_cid,
                pm.brand_id,
                pm.brand,
                pm.brand_cuq,
                pm.brand_cid,
                pm.inventory_manager_id,
                pm.inventory_manager,
                pm.preferred_brand,
                pm.psp_store_count,
                pm.wnw_store_count,
                pm.base_retail,
                pm.base_retail_li,
                pm.promo_base_price,
                pm.cost,
                pm.pspd_cost,
                pm.vendor_mail_id,
                pm.merchant_mail_id,
                pm.kvi_indicator,
                pm.currency_id,
                pm.price_bucket,
                pm.size_bucket,
                pm.price_bucket_cid,
                pm.size_bucket_cid,
                pm.vendor_id,
                pm.vendor,
                pm.primaryupc,
                pm.pspd_item,
                pm.map,
                pm.imap,
                pm.endcap_flag,
                pm.version_code,
                pm.vendor_cuq,
                pm.vendor_cid,
                pm.clearance_indicator,
                pm.uom,
                pm.size,
                pm.size_actual,
                pm.original_uom,
                pm.uom_cid,
                pm.total_inventory,
                pm.oh,
                pm.it,
                pm.oo,
                pm.vendor_oo,
                pm.last_sold,
                pm.movement,
                pm.promo_base_price_valid_from,
                pm.promo_base_price_valid_to,
                pm.uam_hierarchy_id
            FROM 
				price_promo.product_master pm
   			inner join 
				uam_hierarchy_cte uhc 
			on 
				uhc.uam_hiearachy_id = pm.uam_hierarchy_id 
			where 
				pm.is_active = any(%2$L)', p_user_id, p_is_active, promo_application_code);

    END IF;

    RETURN QUERY EXECUTE _query;
END;
$function$;