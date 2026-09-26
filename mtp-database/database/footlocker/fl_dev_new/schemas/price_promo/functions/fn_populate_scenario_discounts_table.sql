--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_populate_scenario_discounts_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_populate_scenario_discounts_table

DROP FUNCTION if exists price_promo.fn_populate_scenario_discounts_table;
CREATE OR REPLACE FUNCTION price_promo.fn_populate_scenario_discounts_table(
    p_promo_id int,
    p_user_id int
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _product_discounting_level text;
    _product_discounting_level_names text;
    _product_discounting_level_columns text;
    _store_discounting_level text;
    _store_discounting_level_names text;
    _store_discounting_level_columns text;
    _customer_discounting_level text;
    _selected_product_levels int[];
    _selected_store_levels int[];
    _query text;
    _scenario_id int;
BEGIN

    delete from price_promo.ps_scenario_discounts where promo_id = p_promo_id;
    delete from price_promo.scenario_master where promo_id = p_promo_id;
    delete from price_promo.tb_promo_product_reco_details where promo_id = p_promo_id;
    delete from price_promo.tb_promo_store_reco_details where promo_id = p_promo_id;
    delete from price_promo.tb_promo_customer_reco_details where promo_id = p_promo_id;


    if exists(
        select 1 from price_promo.promo_master 
        where 
            promo_id = p_promo_id 
            and (
                products_count = 0 or stores_count = 0
            )
        )
    then
        raise notice 'promo has no products or stores so skipping the scenario discounts table population';
        return;
    end if;

    select product_discount_level into _selected_product_levels from price_promo.ps_rules where promo_id = p_promo_id;
    select store_discount_level into _selected_store_levels from price_promo.ps_rules where promo_id = p_promo_id;

    if _selected_product_levels != array[-100] then
        SELECT  
            array_to_string(
                array_agg(
                    format(
                        '
                        ''%1$s'',pm.%1$s,
                        ''%2$s'',pm.%2$s
                        ',
                        dlc.id_key,
                        dlc.value_key
                    )
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('pm.%s', dlc.value_key)
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('pm.%s,pm.%s', dlc.id_key, dlc.value_key)
                ),
                ','
            )
        from price_promo.discount_level_config dlc
        where 
            dlc.discount_level_id in (select unnest(product_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
            and dlc.category = 'product'
            and dlc.discount_level_id != -200
        into _product_discounting_level, _product_discounting_level_names, _product_discounting_level_columns;
    end if;

    if _selected_store_levels != array[-100] then
        select 
            array_to_string(
                array_agg(
                    format(
                        '
                        ''%1$s'',sm.%1$s,
                        ''%2$s'',sm.%2$s
                        ',
                        dlc.id_key,
                        dlc.value_key
                    )
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('sm.%s', dlc.value_key)
                ),
                ','
            ),
            array_to_string(
                array_agg(
                    format('sm.%s,sm.%s', dlc.id_key, dlc.value_key)
                ),
                ','
            )
        from price_promo.discount_level_config dlc
        where 
            dlc.discount_level_id in (select unnest(store_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
            and dlc.category = 'store'
            and dlc.discount_level_id != -200
         into _store_discounting_level, _store_discounting_level_names, _store_discounting_level_columns;
    end if;

    raise notice 'store discounting level: %1$s', _store_discounting_level;

    select 
        array_to_string(
            array_agg(
                format(
                    '
                    ''%1$s'',%1$s,
                    ''%2$s'',%2$s
                    ',
                    dlc.id_key,
                    dlc.value_key
                )
            ),
            ','
        ) into _customer_discounting_level
    from price_promo.discount_level_config dlc
    where 
        dlc.discount_level_id in (select unnest(customer_discount_level) from price_promo.ps_rules where promo_id = p_promo_id)
        and dlc.category = 'customer'
        and dlc.discount_level_id != -200
    ;

    raise notice 'product discounting level: %1$s', _product_discounting_level;
    raise notice 'product discounting level names: %1$s', _product_discounting_level_names;
    raise notice 'product discounting level columns: %1$s', _product_discounting_level_columns;
    raise notice 'store discounting level: %1$s', _store_discounting_level;
    raise notice 'customer discounting level: %1$s', _customer_discounting_level;

    if _product_discounting_level != '' then
        _query = format(
            '
            drop table if exists temp_product_product_reco_details;
            create temp table temp_product_product_reco_details as 
            select 
                %1$s as promo_id,
                jsonb_build_object(
                    %2$s
                ) as product_level_value,
                array_agg(product_id) as product_ids
            from 
                price_promo.product_master pm
            where product_id in (
                select product_id from price_promo.promo_product
                where promo_id = %1$s
            )
            or (
                exists(select 1 from price_promo.promo_master where promo_id = %1$s and product_selection_type = 1)
                and is_active = 1
            )
            group by %4$s
            order by %3$s;
            ',
            p_promo_id,
            _product_discounting_level,
            _product_discounting_level_names,
            _product_discounting_level_columns
        );
        raise notice 'product discounting level insertion query: %1$s', _query;

        execute _query;

        
    elsif _selected_product_levels = array[-100] then

        drop table if exists temp_product_product_reco_details;
        create temp table temp_product_product_reco_details as 
            select 
                p_promo_id as promo_id,
                jsonb_build_object(
                    'pg_name',tpg.pg_name,
                    'pg_id',tpg.pg_id
                ) as product_level_value,
                array_agg(tpp.product_id) as product_ids
            from 
                price_promo.included_promo_product_groups ippg
            inner join
                pricesmart.tb_product_group tpg
            on ippg.product_group_id = tpg.pg_id
            inner join pricesmart.tb_pg_product tpp
            on tpg.pg_id = tpp.pg_id
            inner join price_promo.product_master pm
            on tpp.product_id = pm.product_id
            where ippg.promo_id = p_promo_id
            and tpp.product_id in (
                select product_id from price_promo.promo_product
                where promo_id = p_promo_id
            )
            group by tpg.pg_id, tpg.pg_name
            order by tpg.pg_name;

    else 
        drop table if exists temp_product_product_reco_details;
        create temp table temp_product_product_reco_details 
        as 
        select
            p_promo_id as promo_id,
            null::jsonb as product_level_value,
            array[]::int[] as product_ids
        ;
    end if;

    insert into price_promo.tb_promo_product_reco_details
    (promo_id,product_level_value)
    select 
        p_promo_id,
        product_level_value
    from temp_product_product_reco_details;
    

    if _store_discounting_level != '' then
        _query = format(
            '
            drop table if exists temp_store_store_reco_details;
            create temp table temp_store_store_reco_details as 
            select 
                %1$s as promo_id,
                jsonb_build_object(
                    %2$s
                ) as store_level_value,
                array_agg(store_id) as store_ids
            from global.tb_store_master sm
            where store_id in (
                select store_id from price_promo.promo_store
                where promo_id = %1$s
            )
            or (
                exists(select 1 from price_promo.promo_master where promo_id = %1$s and store_selection_type = 1)
                and is_active = 1
            )
            group by %4$s
            order by %3$s
            ',
            p_promo_id,
            _store_discounting_level,
            _store_discounting_level_names,
            _store_discounting_level_columns
        );
        raise notice 'store discounting level insertion query: %1$s', _query;

        execute _query;

        
    elsif _selected_store_levels = array[-100] then

        drop table if exists temp_store_store_reco_details;
        create temp table temp_store_store_reco_details as 
        select 
            p_promo_id as promo_id,
            jsonb_build_object(
                'sg_name',tsg.sg_name,
                'sg_id',tsg.sg_id
            ) as store_level_value,
            array_agg(store_id) as store_ids
        from 
        price_promo.tb_promo_store_groups tpsg
        inner join
            pricesmart.tb_store_group tsg
        on tpsg.store_group_id = tsg.sg_id
        inner join pricesmart.tb_sg_store tss
        on tsg.sg_id = tss.sg_id
        where tpsg.promo_id = p_promo_id
        and tss.store_id in (
            select store_id from price_promo.promo_store
            where promo_id = p_promo_id
        )
        group by tsg.sg_id, tsg.sg_name
        order by tsg.sg_name;
        
    else 
        drop table if exists temp_store_store_reco_details;
        create temp table temp_store_store_reco_details 
        as 
        select
            p_promo_id as promo_id,
            null::jsonb as store_level_value,
            array[]::int[] as store_ids
        ;
    end if;

    insert into price_promo.tb_promo_store_reco_details
    (promo_id,store_level_value)
    select 
        p_promo_id,
        store_level_value
    from temp_store_store_reco_details;

    insert into price_promo.scenario_master
    (promo_id,scenario_name,scenario_order_id,created_by)
    VALUES
    (p_promo_id,'Scenario 1',1,p_user_id)
    RETURNING scenario_id into _scenario_id;

    insert into price_promo.ps_scenario_discounts
    (promo_id,scenario_data,product_level_id,store_level_id,customer_level_id)
    SELECT
        p_promo_id,
        jsonb_build_object(
            '1',jsonb_build_object(
                'scenario_id',_scenario_id,
                'scenario_name','Scenario 1',
                'created_at', now(),
                'created_by',p_user_id,
                'scenario_type','resimulation',
                'scenario_order_id',1,
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
        ),
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
    order by tpprd.product_level_id, tpstrd.store_level_id, tpcsrd.customer_level_id;

    -- insert product_level_id and its products into price_promo.tb_discount_level_products table
    insert into price_promo.tb_discount_level_products 
    (product_level_id,product_id)
    select 
        tpprd.product_level_id,
        tpprd_temp.product_id
    from price_promo.tb_promo_product_reco_details tpprd
    inner join (
        select 
            product_level_value,
            product_id
        from temp_product_product_reco_details
        cross join lateral 
        (select unnest(product_ids) as product_id) as product_ids
    ) tpprd_temp
    on tpprd.product_level_value = tpprd_temp.product_level_value
    where tpprd.promo_id = p_promo_id;

    insert into price_promo.tb_discount_level_stores
    (store_level_id,store_id)
    select 
        tpstrd.store_level_id,
        tpstrd_temp.store_id
    from price_promo.tb_promo_store_reco_details tpstrd
    inner join (
        select 
            store_level_value,
            store_id
        from temp_store_store_reco_details
        cross join lateral 
        (select unnest(store_ids) as store_id) as store_ids
    ) tpstrd_temp
    on tpstrd.store_level_value = tpstrd_temp.store_level_value
    where tpstrd.promo_id = p_promo_id;

    END;
$function$
;
