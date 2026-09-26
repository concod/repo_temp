--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_get_user_restricted_products runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_user_restricted_products for markdown application

DROP FUNCTION if exists price_markdown.fn_get_user_restricted_products;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_user_restricted_products(p_user_id integer, p_is_active integer[] DEFAULT ARRAY[1])
 RETURNS TABLE(active boolean, age_month_bucket text, clearance_indicator integer, cost real, cost_usd real, currency_id integer, current_price real, current_price_with_vat real, ecom_age integer, eol_flag character varying, hierarchy_id integer, is_active integer, it integer, kvi_indicator integer, l0_cid integer, l0_cuq text, l0_id integer, l0_name text, l1_cid integer, l1_cuq text, l1_id integer, l1_name text, l2_cid integer, l2_cuq text, l2_id integer, l2_name text, l3_cid integer, l3_cuq text, l3_id integer, l3_name text, l4_cid integer, l4_cuq text, l4_id integer, l4_name text, l5_cid integer, l5_cuq text, l5_id integer, l5_name text, l6_cid integer, l6_cuq text, l6_id integer, l6_name text, last_sold character varying, launch_date character varying, launch_price integer, lifecycle text, lifecycle_indicator character varying, max_age integer, merchant_mail_id character varying, msrp real, msrp_with_vat real, oh integer, oo integer, price_bucket character varying, price_bucket_cid character varying, primary_upc integer, product_cuq text, product_description character varying, product_id bigint, product_name text, promo_base_price double precision, promo_base_price_valid_from date, promo_base_price_valid_to date, size text, size_bucket character varying, size_bucket_cid integer, size_id integer, status text, status_id integer, store_age integer, total_inventory integer, uam_hierarchy_id character varying, launch_price_with_vat numeric, l7_id integer, l7_name text, l7_cid integer, l7_cuq text, customer_choice_id integer, customer_choice_description text, last_reg_price_bnm real, last_reg_price_bnm_with_vat real, last_reg_price_ecom real, last_reg_price_ecom_with_vat real, new_product_flag integer, program_id integer, program_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _query text;
    v_access_hierarchy JSONB;
    markdown_application_code INTEGER;
BEGIN
    -- Get application_code from configuration
	
    /*select config_value::integer into markdown_application_code
    from price_promo.tb_tool_configurations
    where module = 'application' and config_name = 'application_code';*/
	markdown_application_code = 20;
    
    -- Get access hierarchy from user access hierarchy mapping
    select 
        access_hierarchy into v_access_hierarchy 
    from 
        global.user_access_hierarchy_mapping where user_code = p_user_id
        and acl_code in (
            select acl_code from global.acl_master 
            where application_code = markdown_application_code
        );


    -- If no access hierarchy, return all products
    IF v_access_hierarchy IS NULL OR v_access_hierarchy = '[]'::jsonb OR jsonb_array_length(v_access_hierarchy) = 0 THEN
        raise notice 'abc:';
        _query := format('
            SELECT 
                pm.active,
                pm.age_month_bucket,
                pm.clearance_indicator,
                pm.cost,
                pm.cost_usd,
                pm.currency_id,
                pm.current_price,
                pm.current_price_with_vat,
                pm.ecom_age,
                pm.eol_flag,
                pm.hierarchy_id,
                pm.is_active,
                pm.it,
                pm.kvi_indicator,
                pm.l0_cid,
                pm.l0_cuq,
                pm.l0_id,
                pm.l0_name,
                pm.l1_cid,
                pm.l1_cuq,
                pm.l1_id,
                pm.l1_name,
                pm.l2_cid,
                pm.l2_cuq,
                pm.l2_id,
                pm.l2_name,
                pm.l3_cid,
                pm.l3_cuq,
                pm.l3_id,
                pm.l3_name,
                pm.l4_cid,
                pm.l4_cuq,
                pm.l4_id,
                pm.l4_name,
                pm.l5_cid,
                pm.l5_cuq,
                pm.l5_id,
                pm.l5_name,
                pm.l6_cid,
                pm.l6_cuq,
                pm.l6_id,
                pm.l6_name,
                pm.last_sold,
                pm.launch_date,
                pm.launch_price,
                pm.lifecycle,
                pm.lifecycle_indicator,
                pm.max_age,
                pm.merchant_mail_id,
                pm.msrp,
                pm.msrp_with_vat,
                pm.oh,
                pm.oo,
                pm.price_bucket,
                pm.price_bucket_cid,
                pm.primary_upc,
                pm.product_cuq,
                pm.product_description,
                pm.product_id,
                pm.product_name,
                pm.promo_base_price,
                pm.promo_base_price_valid_from,
                pm.promo_base_price_valid_to,
                pm.size,
                pm.size_bucket,
                pm.size_bucket_cid,
                pm.size_id,
                pm.status,
                pm.status_id,
                pm.store_age,
                pm.total_inventory,
                pm.uam_hierarchy_id,
                pm.launch_price_with_vat,
                pm.l7_id,
                pm.l7_name,
                pm.l7_cid,
                pm.l7_cuq,
                pm.customer_choice_id,
                pm.customer_choice_description,
                pm.last_reg_price_bnm,
                pm.last_reg_price_bnm_with_vat,
                pm.last_reg_price_ecom,
                pm.last_reg_price_ecom_with_vat,
                pm.new_product_flag,
                pm.program_id,
                pm.program_name
            FROM 
                pricesmart.product_master pm where pm.is_active = any(%1$L)
        ', p_is_active);
        
    -- If access hierarchy exists, return products that match the access hierarchy
    else
        _query := format('
			with uam_hierarchy_cte as MATERIALIZED(
				select 
					distinct jsonb_array_elements(uahm.access_hierarchy) ->> ''product_hierarchy_id'' as uam_hierarchy_id
				from global.user_access_hierarchy_mapping uahm
				INNER JOIN global.acl_master acl
				    ON uahm.acl_code = acl.acl_code
				AND acl.application_code = %3$s where user_code = %1$s
			)
            SELECT 
                pm.active,
                pm.age_month_bucket,
                pm.clearance_indicator,
                pm.cost,
                pm.cost_usd,
                pm.currency_id,
                pm.current_price,
                pm.current_price_with_vat,
                pm.ecom_age,
                pm.eol_flag,
                pm.hierarchy_id,
                pm.is_active,
                pm.it,
                pm.kvi_indicator,
                pm.l0_cid,
                pm.l0_cuq,
                pm.l0_id,
                pm.l0_name,
                pm.l1_cid,
                pm.l1_cuq,
                pm.l1_id,
                pm.l1_name,
                pm.l2_cid,
                pm.l2_cuq,
                pm.l2_id,
                pm.l2_name,
                pm.l3_cid,
                pm.l3_cuq,
                pm.l3_id,
                pm.l3_name,
                pm.l4_cid,
                pm.l4_cuq,
                pm.l4_id,
                pm.l4_name,
                pm.l5_cid,
                pm.l5_cuq,
                pm.l5_id,
                pm.l5_name,
                pm.l6_cid,
                pm.l6_cuq,
                pm.l6_id,
                pm.l6_name,
                pm.last_sold,
                pm.launch_date,
                pm.launch_price,
                pm.lifecycle,
                pm.lifecycle_indicator,
                pm.max_age,
                pm.merchant_mail_id,
                pm.msrp,
                pm.msrp_with_vat,
                pm.oh,
                pm.oo,
                pm.price_bucket,
                pm.price_bucket_cid,
                pm.primary_upc,
                pm.product_cuq,
                pm.product_description,
                pm.product_id,
                pm.product_name,
                pm.promo_base_price,
                pm.promo_base_price_valid_from,
                pm.promo_base_price_valid_to,
                pm.size,
                pm.size_bucket,
                pm.size_bucket_cid,
                pm.size_id,
                pm.status,
                pm.status_id,
                pm.store_age,
                pm.total_inventory,
                pm.uam_hierarchy_id,
                pm.launch_price_with_vat,
                pm.l7_id,
                pm.l7_name,
                pm.l7_cid,
                pm.l7_cuq,
                pm.customer_choice_id,
                pm.customer_choice_description,
                pm.last_reg_price_bnm,
                pm.last_reg_price_bnm_with_vat,
                pm.last_reg_price_ecom,
                pm.last_reg_price_ecom_with_vat,
                pm.new_product_flag,
                pm.program_id,
                pm.program_name
            FROM
				pricesmart.product_master pm
   			inner join
				uam_hierarchy_cte uhc
			on
				uhc.uam_hierarchy_id = pm.uam_hierarchy_id
			where
				pm.is_active = any(%2$L)', p_user_id, p_is_active, markdown_application_code);

    END IF;

    raise notice 'query: %', _query;
    RETURN QUERY EXECUTE _query;
END;
$function$
;
