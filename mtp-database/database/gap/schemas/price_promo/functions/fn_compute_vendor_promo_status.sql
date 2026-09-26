--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_compute_vendor_promo_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_compute_vendor_promo_status 

DROP FUNCTION if exists price_promo.fn_compute_vendor_promo_status;
CREATE OR REPLACE FUNCTION price_promo.fn_compute_vendor_promo_status(
    p_finalized_promo_id int,
    p_original_promo_id int
)
 RETURNS int
 LANGUAGE plpgsql
AS $function$
DECLARE
    _date_change bool;
    _products_change bool;
    _discounts_data_change bool;
BEGIN

    _date_change = exists(
        select 
        1
        from (
            select start_date, end_date
            from price_promo.promo_master
            where promo_id = p_finalized_promo_id
        ) finalized
        inner join
        (
            select start_date, end_date
            from price_promo.promo_master
            where promo_id = p_original_promo_id
        ) original
        on finalized.start_date != original.start_date or finalized.end_date != original.end_date
    );

    raise notice 'date_change %', _date_change;

    if _date_change then
        return 4;
    end if;
    

    _products_change = exists(
        select 
        1
        from
        (
            select product_id
            from price_promo.promo_product pp
            where pp.promo_id = p_finalized_promo_id
        ) finalized_promo_products
        full outer join
        (
            select product_id
            from price_promo.promo_product pp
            where pp.promo_id = p_original_promo_id
        ) original_promo_products
        on finalized_promo_products.product_id = original_promo_products.product_id
        where finalized_promo_products.product_id is null or original_promo_products.product_id is null
    );

    raise notice 'products_change %', _products_change;

    if _products_change then
        return 4;
    end if;

    _discounts_data_change = exists(
        select 
        1
        from 
        (
            select 
                tpprd.product_level_value,
                psd.scenario_data,
                psd.promo_id
            from price_promo.ps_scenario_discounts psd
            inner join price_promo.tb_promo_product_reco_details tpprd
            on psd.product_level_id = tpprd.product_level_id
            where psd.promo_id = p_finalized_promo_id
        ) finalized
        full outer join
        (
            select 
                tpprd.product_level_value,
                psd.scenario_data,
                psd.promo_id
            from price_promo.ps_scenario_discounts psd
            inner join price_promo.tb_promo_product_reco_details tpprd
            on psd.product_level_id = tpprd.product_level_id
            where psd.promo_id = p_original_promo_id
        ) original
        on finalized.product_level_value = original.product_level_value
        where
            (
                finalized.scenario_data['1']['offer_value'] != original.scenario_data['1']['offer_value'] or
                finalized.scenario_data['1']['promotional_theme'] != original.scenario_data['1']['promotional_theme'] or
                finalized.scenario_data['1']['loyality_points'] != original.scenario_data['1']['loyality_points'] or
                finalized.scenario_data['1']['marketing_support'] != original.scenario_data['1']['marketing_support'] or
                finalized.scenario_data['1']['off_invoice_allowance_amount'] != original.scenario_data['1']['off_invoice_allowance_amount'] or
                finalized.scenario_data['1']['scan_back_allowance_amount'] != original.scenario_data['1']['scan_back_allowance_amount']
            )
    );

    raise notice 'discounts_data_change %', _discounts_data_change;

    if _discounts_data_change then
        return 4;
    end if;

    return 3;


END;
$function$
;