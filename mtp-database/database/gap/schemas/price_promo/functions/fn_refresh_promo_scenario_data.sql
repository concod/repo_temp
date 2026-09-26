--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_refresh_promo_scenario_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_refresh_promo_scenario_data

DROP FUNCTION IF EXISTS price_promo.fn_refresh_promo_scenario_data;
CREATE OR REPLACE FUNCTION price_promo.fn_refresh_promo_scenario_data(p_promo_id int)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _has_discounts_data bool;
    _is_discounting_level_overall_or_product_group bool;
    _product_discounting_level text;
    _store_discounting_level text;
    _query text;
    _ps_rules_record price_promo.ps_rules%rowtype;
	_default_scenario_json_object jsonb;
    _product_discount_level_id_columns text[];
    _store_discount_level_id_columns text[];
    _should_simulate_after_scenario_discounts_refresh bool := price_promo.fn_get_configuration_value(
        'promo',
        'should_simulate_after_scenario_discounts_refresh'
    )::bool;
    _should_optimise_after_scenario_discounts_refresh bool := price_promo.fn_get_configuration_value(
        'promo',
        'should_optimise_after_scenario_discounts_refresh'
    )::bool;
    _scenario_1_offer_type_id int;
    _scenario_1_offer_type varchar;
    _scenario_2_offer_type_id int;
    _scenario_2_offer_type varchar;
BEGIN

    select 
        * into _ps_rules_record
    from price_promo.ps_rules
    where promo_id = p_promo_id;

    _is_discounting_level_overall_or_product_group = (
        _ps_rules_record.product_discount_level in (array[-100],array[-200]) 
        and _ps_rules_record.store_discount_level in (array[-100],array[-200])
    );

    if _is_discounting_level_overall_or_product_group then 
        return;
    end if;

    select 
        case 
            when coalesce(
                scenario_data[1]->>'offer_x_value',
                scenario_data[1]->>'offer_y_value',
                scenario_data[1]->>'offer_z_value',
                scenario_data[1]->>'tier_id',
                scenario_data[1]->>'special_offer_data'
            ) is not null or ia_recommended_data is not null then true
        else false 
        end  into _has_discounts_data
    from price_promo.ps_scenario_discounts
    where promo_id = p_promo_id
    limit 1;

    if not _has_discounts_data then
        raise notice 'has not discounts data so populating the table again';
        perform price_promo.fn_populate_scenario_discounts_table(
            p_promo_id,
            (select created_by from price_promo.promo_master where promo_id = p_promo_id)
        );
        return;
    end if;

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
        array_agg(dlc.id_key)
    from price_promo.discount_level_config dlc
    where 
        dlc.discount_level_id = any(_ps_rules_record.product_discount_level)
        and dlc.category = 'product'
        and dlc.discount_level_id != -200
    into _product_discounting_level,_product_discount_level_id_columns
    ;

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
        array_agg(dlc.id_key)
    from price_promo.discount_level_config dlc
    where 
        dlc.discount_level_id = any(_ps_rules_record.store_discount_level)
        and dlc.category = 'store'
        and dlc.discount_level_id != -200
    into _store_discounting_level,_store_discount_level_id_columns
    ;

    raise notice 'product discounting level: %', _product_discounting_level;
    raise notice 'store discounting level: %', _store_discounting_level;

    if _product_discounting_level != '' then
        _query = format(
            '
            drop table if exists temp_product_reco_details;
            create temp table temp_product_reco_details as 
            with new_product_level_values_cte as (
                select 
                    %1$s as promo_id,
                    jsonb_build_object(
                        %2$s
                    ) as product_level_value,
                    jsonb_build_object(
                        %3$s
                    ) as product_level_id_value,
                    array_agg(product_id) as product_ids,
                    min(promo_base_price) as price
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
                group by jsonb_build_object(
                    %2$s
                ),
                jsonb_build_object(
                    %3$s
                )
            )
            select 
                tpprd.product_level_id,
                nplv_cte.product_level_value,
                nplv_cte.product_ids,
                nplv_cte.price,
                nplv_cte.product_level_value != tpprd.product_level_value as values_updated
            from 
                new_product_level_values_cte nplv_cte
            left join (
                select *,jsonb_build_object(%4$s) as product_level_id_value from price_promo.tb_promo_product_reco_details 
                where promo_id = %1$s
            ) tpprd
            on nplv_cte.product_level_id_value = tpprd.product_level_id_value
            ;
            ',
            p_promo_id,
            _product_discounting_level,
            (
                select array_to_string(
                    array_agg(
                        format(
                            '
                            ''%1$s'',pm.%1$s::text
                            ',
                            id_key
                        )
                    ),
					','
                )
                from unnest(_product_discount_level_id_columns) as id_key
            ),
            (
                select array_to_string(
                    array_agg(
                        format(
                            '
                            ''%1$s'',product_level_value->>''%1$s''
                            ',
                            id_key
                        )
                    ),
                    ','
                )
                from unnest(_product_discount_level_id_columns) as id_key
            )
        );
        raise notice 'product discounting level insertion query: %', _query;
        execute _query;

    else 
        drop table if exists temp_product_reco_details;
        create temp table temp_product_reco_details 
        as 
        select
            product_level_id,
            p_promo_id as promo_id,
            product_level_value,
            array[]::int[] as product_ids,
            false as values_updated,
            (
                select min(promo_base_price) from price_promo.product_master pm
                inner join price_promo.promo_product pp
				on pm.product_id = pp.product_id
                where promo_id = p_promo_id
            ) as price
        from price_promo.tb_promo_product_reco_details
        where promo_id = p_promo_id
        ;
    end if;

    if _store_discounting_level != '' then
        _query = format(
            '
            drop table if exists temp_store_reco_details;
            create temp table temp_store_reco_details as 
            with new_store_level_values_cte as (
                select 
                    %1$s as promo_id,
                jsonb_build_object(
                    %2$s
                ) as store_level_value,
                jsonb_build_object(
                    %3$s
                ) as store_level_id_value,
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
                group by jsonb_build_object(
                    %2$s
                ),
                jsonb_build_object(
                    %3$s
                )
            )
            select 
                tpstrd.store_level_id,
                nslv_cte.store_level_value,
                nslv_cte.store_ids,
                nslv_cte.store_level_value != tpstrd.store_level_value as values_updated
            from 
                new_store_level_values_cte nslv_cte
            left join (
                select *,jsonb_build_object(%4$s) as store_level_id_value from price_promo.tb_promo_store_reco_details 
                where promo_id = %1$s
            ) tpstrd
            on nslv_cte.store_level_id_value = tpstrd.store_level_id_value
            ;
            ',
            p_promo_id,
            _store_discounting_level,
            (
                select array_to_string(
                    array_agg(
                        format(
                            '
                            ''%1$s'',sm.%1$s::text
                            ',
                            id_key
                        )
                    ),
                    ','
                )
                from unnest(_store_discount_level_id_columns) as id_key
            ),
            (
                select array_to_string(
                    array_agg(
                        format(
                            '
                            ''%1$s'',store_level_value->>''%1$s''
                            ',
                            id_key
                        )
                    ),
                    ','
                )
                from unnest(_store_discount_level_id_columns) as id_key
            )
        );
        raise notice 'store discounting level insertion query: %', _query;
        execute _query;
    else 
        drop table if exists temp_store_reco_details;
        create temp table temp_store_reco_details 
        as 
        select
            store_level_id,
            p_promo_id as promo_id,
            store_level_value,
            array[]::int[] as store_ids,
            false as values_updated
        from price_promo.tb_promo_store_reco_details
        where promo_id = p_promo_id
        ;
    end if;


    --exiting the function if there is no change in product_levels and store_levels
    if not exists (
        select 1 from temp_product_reco_details
        where product_level_id is null or values_updated = true
    ) and not exists (
        select 1 from temp_store_reco_details
        where store_level_id is null or values_updated = true
    ) and not exists(
        select 1 from price_promo.ps_scenario_discounts
        where promo_id = p_promo_id and (
            product_level_id not in (
                select product_level_id from temp_product_reco_details
            ) 
            or 
            store_level_id not in (
                select store_level_id from temp_store_reco_details
            )
        )
    )
    then
        raise notice 'exiting as there are no new products and stores';
        return;
    end if;


    -- deleting product levels which got removed due to ingestion
    delete from price_promo.tb_promo_product_reco_details
    where promo_id = p_promo_id and product_level_id not in (
        select product_level_id from temp_product_reco_details
        where product_level_id is not null
    );

    -- inserting only new product level values
    insert into price_promo.tb_promo_product_reco_details
    (promo_id,product_level_value)
    select 
        p_promo_id,
        product_level_value
    from temp_product_reco_details
    where product_level_id is null;

    update price_promo.tb_promo_product_reco_details
    set product_level_value = tprd.product_level_value
    from temp_product_reco_details tprd
    where price_promo.tb_promo_product_reco_details.promo_id = p_promo_id
    and price_promo.tb_promo_product_reco_details.product_level_id = tprd.product_level_id
    and tprd.values_updated = true;

    -- deleting store levels which got removed due to ingestion
    delete from price_promo.tb_promo_store_reco_details
    where promo_id = p_promo_id and store_level_id not in (
        select store_level_id from temp_store_reco_details
        where store_level_id is not null
    );

    insert into price_promo.tb_promo_store_reco_details
    (promo_id,store_level_value)
    select 
        p_promo_id,
        store_level_value
    from temp_store_reco_details
    where store_level_id is null;

    update price_promo.tb_promo_store_reco_details
    set store_level_value = tstrd.store_level_value
    from temp_store_reco_details tstrd
    where price_promo.tb_promo_store_reco_details.promo_id = p_promo_id
    and price_promo.tb_promo_store_reco_details.store_level_id = tstrd.store_level_id
    and tstrd.values_updated = true;

    select 
        (scenario_data['1']->>'offer_type_id')::int,
        (scenario_data['1']->>'offer_type')::varchar,
        coalesce((scenario_data['2']->>'offer_type_id')::int,_ps_rules_record.discount_type_id),
        coalesce((scenario_data['2']->>'offer_type')::varchar,_ps_rules_record.discount_type)
    from price_promo.ps_scenario_discounts
    where promo_id = p_promo_id
    limit 1
    into _scenario_1_offer_type_id, _scenario_1_offer_type, _scenario_2_offer_type_id, _scenario_2_offer_type;

    _default_scenario_json_object = (
        select 
        jsonb_object_agg(
            scenario_order_id,jsonb_build_object(
                'scenario_id',scenario_id,
                'scenario_name',scenario_name,
                'created_at', created_at,
                'created_by',created_by,
                'scenario_type','resimulation',
                'scenario_order_id', scenario_order_id,
                'offer_type_id', (
                    case 
                        when scenario_order_id = 1 then _scenario_1_offer_type_id 
                        else _scenario_2_offer_type_id 
                    end
                ), 
                'offer_type', (
                    case 
                        when scenario_order_id = 1 then _scenario_1_offer_type 
                        else _scenario_2_offer_type 
                    end
                ),
                'offer_value', null,
                'offer_x_type',null,
                'offer_x_value',null,
                'offer_y_type',null,
                'offer_y_value',null,
                'offer_z_type',null,
                'offer_z_value',null,
                'tier_id',null
            )
        )
        from price_promo.scenario_master
        where promo_id = p_promo_id
    );


    raise notice '_default_scenario_json_object: %', _default_scenario_json_object;

    delete from price_promo.ps_scenario_discounts
    where promo_id = p_promo_id and (
        product_level_id not in (
            select product_level_id from temp_product_reco_details
            where product_level_id is not null
        )
        or 
        store_level_id not in (
            select store_level_id from temp_store_reco_details
            where store_level_id is not null
        )
    );

    insert into price_promo.ps_scenario_discounts
    (promo_id,scenario_data,product_level_id,store_level_id,customer_level_id,ia_recommended_data)
    SELECT
        p_promo_id,
        price_promo.jsonb_recursive_merge(
            _default_scenario_json_object,
            (
                select jsonb_object_agg(
                    scenario_order_id,jsonb_build_object(
                        'offer_x_value', (
                            case 
                                when pr.discount_type_id in (14,15) then coalesce(pr.min_upto_percent,coalesce(pr.min_discount,0))
                                when pr.discount_type_id = 13 then 0
                                when pr.discount_type_id = 17 then temp_tpprd.price
                            end
                        )
                    )
                )
            from price_promo.scenario_master
            where promo_id = p_promo_id
            )
        ),
        tpprd.product_level_id,
        tpstrd.store_level_id,
        null as customer_level_id,
        case 
            when (
                select ia_recommended_data from price_promo.ps_scenario_discounts 
                where promo_id = p_promo_id
                limit 1
            ) is null
            then null
            else jsonb_build_object(
                '0',_default_scenario_json_object['1'] || jsonb_build_object(
                    'offer_type_id', pr.opt_discount_type_id,
                    'offer_type', tasm.name,
                    'scenario_id',0,
                    'scenario_name',null,
                    'scenario_type', 'ia_recommended',
                    'scenario_order_id',0,
                    'offer_x_value', (
                        case 
                            when pr.opt_discount_type_id in (14,15) then coalesce(pr.min_upto_percent,coalesce(pr.min_discount,0))
                            when pr.opt_discount_type_id = 13 then 0
                            when pr.opt_discount_type_id = 17 then temp_tpprd.price
                        end
                    )
                )
            )
        end
    FROM
        price_promo.promo_master pm
        inner JOIN
        price_promo.ps_rules pr
        on pm.promo_id = pr.promo_id
        left join
        metaschema.tb_app_sub_master tasm 
        on tasm.id = pr.opt_discount_type_id
        left join 
        (select * from price_promo.tb_promo_product_reco_details where promo_id = p_promo_id) tpprd
        on true
        left join
        (select * from price_promo.tb_promo_store_reco_details where promo_id = p_promo_id) tpstrd
        on true
        left JOIN
            price_promo.ps_scenario_discounts psd
        on psd.product_level_id = tpprd.product_level_id
        and psd.store_level_id = tpstrd.store_level_id
        left join
            temp_product_reco_details temp_tpprd 
        on temp_tpprd.product_level_value = tpprd.product_level_value
    WHERE
        pm.promo_id = p_promo_id
        and psd.id is null;

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
        from temp_product_reco_details
        cross join lateral 
        (select unnest(product_ids) as product_id) as product_ids
        where product_level_id is null
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
        from temp_store_reco_details
        cross join lateral 
        (select unnest(store_ids) as store_id) as store_ids
        where store_level_id is null
    ) tpstrd_temp
    on tpstrd.store_level_value = tpstrd_temp.store_level_value
    where tpstrd.promo_id = p_promo_id;

    update price_promo.promo_master
    set to_be_simulated = _should_simulate_after_scenario_discounts_refresh,
        to_be_optimised = _should_optimise_after_scenario_discounts_refresh
    where promo_id = p_promo_id;
END;
$procedure$
;
