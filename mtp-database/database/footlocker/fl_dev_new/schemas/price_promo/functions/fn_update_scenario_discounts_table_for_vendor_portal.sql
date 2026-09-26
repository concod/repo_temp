--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_update_scenario_discounts_table_for_vendor_portal runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_update_scenario_discounts_table_for_vendor_portal

DROP FUNCTION if exists price_promo.fn_update_scenario_discounts_table_for_vendor_portal;
CREATE OR REPLACE FUNCTION price_promo.fn_update_scenario_discounts_table_for_vendor_portal(p_promo_id integer, p_user_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _product_discounting_level text;
    _product_discounting_level_names text;
    _product_discounting_level_columns text;
    _selected_product_levels int[];
    _query text;
    _scenario_data jsonb;
    _new_product_levels jsonb;
BEGIN

    raise notice 'deleting removed product levels from price_promo.tb_promo_product_reco_details';
    delete from price_promo.tb_promo_product_reco_details 
    where promo_id = p_promo_id 
    and product_level_id in (
        select product_level_id from price_promo.tb_discount_level_products where product_id not in (
            select product_id from price_promo.promo_product where promo_id = p_promo_id
        )
    );
    raise notice 'deletion done for removed product levels in price_promo.tb_promo_product_reco_details';

    -- Create temp table for newly added products only
    raise notice 'creating temp table for newly added products';
    _query = format(
        '
        drop table if exists temp_new_products;
        create temp table temp_new_products as 
        select 
            %1$s as promo_id,
            %2$s as product_level_value,
            product_id
        from 
            price_promo.product_master pm
        where product_id in (
            select pp.product_id 
            from price_promo.promo_product pp
            where pp.promo_id = %1$s
            and pp.product_id not in (
                select tdlp.product_id 
                from price_promo.tb_discount_level_products tdlp
                inner join price_promo.tb_promo_product_reco_details tpprd 
                    on tdlp.product_level_id = tpprd.product_level_id
                where tpprd.promo_id = %1$s
            )
        );
        ',
        p_promo_id,
        (
            select 
                format(
                    'jsonb_build_object(
                        ''%1$s'',pm.%1$s,
                        ''%2$s'',pm.%2$s
                    )',
                    id_key,
                    value_key
                ) 
            from price_promo.discount_level_config where id_key = 'product_id'
        )
    );
    raise notice 'new products temp table query: %1$s', _query;
    execute _query;

    -- Insert new product levels into tb_promo_product_reco_details
    raise notice 'inserting new product levels into price_promo.tb_promo_product_reco_details';
    insert into price_promo.tb_promo_product_reco_details
    (promo_id,product_level_value)
    select distinct
        p_promo_id,
        product_level_value
    from temp_new_products;

    raise notice 'insertion done for new product levels in price_promo.tb_promo_product_reco_details';


    raise notice 'deleting data from price_promo.ps_scenario_discounts';
    delete from price_promo.ps_scenario_discounts 
    where promo_id = p_promo_id 
    and product_level_id not in (
        select product_level_id 
        from price_promo.tb_promo_product_reco_details 
        where promo_id = p_promo_id
    );
    raise notice 'deletion done for price_promo.ps_scenario_discounts';


    _scenario_data = (
        select
        jsonb_object_agg(
            scenario_order_id,jsonb_build_object(
                'scenario_id',sm.scenario_id,
                'scenario_name',sm.scenario_name,
                'created_at', now(),
                'created_by',p_user_id,
                'scenario_type','resimulation',
                'scenario_order_id',sm.scenario_order_id,
                'offer_type_id', pr.discount_type_id,
                'offer_type', pr.discount_type,
                'offer_value', null,
                'offer_x_type',null,
                'offer_x_value',null,
                'offer_y_type',null,
                'offer_y_value',null,
                'offer_z_type',null,
                'offer_z_value',null,
                'tier_id',null,
                'scan_back_allowance_amount', 0,
                'off_invoice_allowance_amount', 0,
                'marketing_support', 1,
                'promotional_theme', null,
                'loyality_points', null
            )
        )
        from price_promo.scenario_master sm
        inner join price_promo.ps_rules pr
        on sm.promo_id = pr.promo_id 
        where sm.promo_id = p_promo_id
    );

    insert into price_promo.ps_scenario_discounts
    (promo_id,scenario_data,product_level_id,store_level_id,customer_level_id)
    SELECT
        p_promo_id,
        _scenario_data,
        tpprd.product_level_id,
        tpstrd.store_level_id,
        tpcsrd.customer_level_id
    FROM
        price_promo.promo_master pm
        inner JOIN
        price_promo.ps_rules pr
        on pm.promo_id = pr.promo_id
        left join 
        (select * from price_promo.tb_promo_product_reco_details where promo_id = p_promo_id) tpprd
        on true
        left join
        (select * from price_promo.tb_promo_store_reco_details where promo_id = p_promo_id) tpstrd
        on true
        left join
        (select * from price_promo.tb_promo_customer_reco_details where promo_id = p_promo_id) tpcsrd
        on true
    WHERE
        pm.promo_id = p_promo_id
    and tpprd.product_level_id not in (
            select product_level_id 
            from price_promo.ps_scenario_discounts 
            where promo_id = p_promo_id
        )
    order by tpprd.product_level_id, tpstrd.store_level_id, tpcsrd.customer_level_id;

    -- Delete from tb_discount_level_products for products no longer in promo_product
    raise notice 'deleting removed products from price_promo.tb_discount_level_products';
    delete from price_promo.tb_discount_level_products 
    where product_level_id in (
        select product_level_id 
        from price_promo.tb_promo_product_reco_details 
        where promo_id = p_promo_id
    )
    and product_id not in (
        select product_id 
        from price_promo.promo_product 
        where promo_id = p_promo_id
    );
    raise notice 'deletion done for removed products in price_promo.tb_discount_level_products';
    
    -- insert product_level_id and its products into price_promo.tb_discount_level_products table
    insert into price_promo.tb_discount_level_products 
    (product_level_id,product_id)
    select 
        tpprd.product_level_id,
        tnp.product_id
    from temp_new_products tnp
    inner join price_promo.tb_promo_product_reco_details tpprd
        on tnp.product_level_value = tpprd.product_level_value
        and tnp.promo_id = tpprd.promo_id;

    END;
$function$
;
