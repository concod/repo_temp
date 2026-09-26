--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_promo_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_promo_discounts

DROP FUNCTION if exists price_promo.fn_get_promo_discounts;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_discounts(p_promo_id integer, p_page integer DEFAULT 1, p_limit integer DEFAULT 100, p_sort_key text DEFAULT 'id'::text, p_sort_order text DEFAULT 'asc'::text, p_filters jsonb DEFAULT NULL::jsonb, p_include_temporary_saved_changes boolean DEFAULT false, p_user_id integer DEFAULT NULL::integer)
 RETURNS TABLE(row_id integer, product_level_id bigint, product_level_value jsonb, store_level_id integer, store_level_value jsonb, customer_level_id bigint, customer_level_value jsonb, scenario_data jsonb, min_allowed_discount_price double precision, max_allowed_discount_price double precision, ia_recommended_data jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _offset int = (p_page - 1) * p_limit;
    _where_clause_array text[] = array[]::text[];
    _where_condition text = '';
    _filter_record record;
    _query text;
	_source_table text;
    _promo_product_discounting_level int[];
    _promo_store_discounting_level int[];
    _product_additional_columns text = 'jsonb_build_object()';
    _product_master_join text = '';
    _store_additional_columns text = 'jsonb_build_object()';
    _store_master_join text = '';
    _product_additional_columns_config jsonb = '{}'::jsonb;
    _store_additional_columns_config jsonb = '{}'::jsonb;
    _product_additional_columns_array text[];
    _store_additional_columns_array text[];
    _product_join_key text;
    _store_join_key text;
	_discount_type_id int;
    _offer_type_name text;
    _order_by_sql text = '';
    i record;
BEGIN

    if p_include_temporary_saved_changes then
        _source_table = format('price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s',p_promo_id,p_user_id);
    else 
        _source_table = format(
                'price_promo.ps_scenario_discounts_%1$s',
                p_promo_id
        );
    end if;

    select 
        product_discount_level,
        store_discount_level,
		discount_type_id
    from price_promo.ps_rules
    where promo_id = p_promo_id
    into _promo_product_discounting_level,
        _promo_store_discounting_level,
		_discount_type_id;

	select tasm.name
    into _offer_type_name
    from price_promo.tb_offer_master tasm
    where tasm.id = _discount_type_id;

    -- p_sort_key = price_promo.fn_format_column_name_for_getting_discount_values(p_promo_id,p_sort_key);

    for _filter_record in (
        select * from jsonb_to_recordset(p_filters) as x(
            column_name text,
            operator text,
            value text,
            value1 text,
            value2 text,
            type text
        )
    )
    loop

        if _filter_record.type = 'numeric' then
            _where_clause_array:= array_append(
                _where_clause_array,
                pricesmart.fn_generate_filter_condition_for_int(
                    format('(%1$s)::numeric',price_promo.fn_format_column_name_for_getting_discount_values(p_promo_id,_filter_record.column_name)),
                    _filter_record.operator,
                    _filter_record.value1,
                    _filter_record.value2
                    )
            );
        else
            _where_clause_array:= array_append(
                _where_clause_array ,
                pricesmart.fn_generate_filter_condition_for_string(
                    format(
                        'lower((%1$s)::text)',
                        price_promo.fn_format_column_name_for_getting_discount_values(
                            p_promo_id,
                            _filter_record.column_name
                        )
                    ),
                    _filter_record.operator,
                    lower(_filter_record.value)
                )
            );
        end if;

    end loop;

    if array_length(_where_clause_array, 1) > 0 then
        _where_condition = format(' and %1$s ',array_to_string(_where_clause_array, ' AND '));
    end if;

    raise notice 'where condition %', _where_condition;

    _product_additional_columns_config = (
        select config_value::jsonb
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'discount_level_additional_columns'
    );

    _store_additional_columns_config = (
        select config_value::jsonb
        from price_promo.tb_tool_configurations
        where module = 'store' and config_name = 'discount_level_additional_columns'
    );

    _product_additional_columns_array = array[]::text[];

    for i in (
        select distinct on (t.elem->>'key')
            t.elem->>'key' as k,
            t.elem->>'db_column' as dbc
        from price_promo.ps_rules pr
        cross join lateral unnest(pr.product_discount_level) u(did)
        inner join price_promo.discount_level_config dlc
            on dlc.discount_level_id = u.did and dlc.category = 'product'
        cross join lateral jsonb_array_elements(
            coalesce(_product_additional_columns_config -> (dlc.discount_level_id::text), '[]'::jsonb)
        ) as t(elem)
        where pr.promo_id = p_promo_id and dlc.id_key is not null
        order by t.elem->>'key', dlc.discount_level_id desc
    )
    loop
        if coalesce(i.k, '') <> '' then
            _product_additional_columns_array = array_append(
                _product_additional_columns_array,
                format('''%s'', coalesce(to_jsonb(pm.%I), tpprd.product_level_value->%L)', i.k, i.dbc, i.k)
            );
        end if;
    end loop;

    select dlc.id_key into _product_join_key
    from price_promo.ps_rules pr
    cross join lateral unnest(pr.product_discount_level) u(did)
    inner join price_promo.discount_level_config dlc
        on dlc.discount_level_id = u.did and dlc.category = 'product'
    where pr.promo_id = p_promo_id and dlc.id_key is not null
    order by dlc.discount_level_id desc
    limit 1;

    if coalesce(array_length(_product_additional_columns_array, 1), 0) > 0 and _product_join_key is not null then
        _product_additional_columns = format(
            'jsonb_build_object(%1$s)',
            array_to_string(_product_additional_columns_array, ',')
        );
        _product_master_join = format(
            ' left join lateral ( select pm_inner.* from price_promo.product_master pm_inner where pm_inner.%I::text = coalesce(tpprd.product_level_value->>%L, '''') limit 1 ) pm on true ',
            _product_join_key,
            _product_join_key
        );
    end if;

    _store_additional_columns_array = array[]::text[];

    for i in (
        select distinct on (t.elem->>'key')
            t.elem->>'key' as k,
            t.elem->>'db_column' as dbc
        from price_promo.ps_rules pr
        cross join lateral unnest(pr.store_discount_level) u(did)
        inner join price_promo.discount_level_config dlc
            on dlc.discount_level_id = u.did and dlc.category = 'store'
        cross join lateral jsonb_array_elements(
            coalesce(_store_additional_columns_config -> (dlc.discount_level_id::text), '[]'::jsonb)
        ) as t(elem)
        where pr.promo_id = p_promo_id and dlc.id_key is not null
        order by t.elem->>'key', dlc.discount_level_id desc
    )
    loop
        if coalesce(i.k, '') <> '' then
            _store_additional_columns_array = array_append(
                _store_additional_columns_array,
                format('''%s'', coalesce(to_jsonb(sm.%I), tpsrd.store_level_value->%L)', i.k, i.dbc, i.k)
            );
        end if;
    end loop;

    select dlc.id_key into _store_join_key
    from price_promo.ps_rules pr
    cross join lateral unnest(pr.store_discount_level) u(did)
    inner join price_promo.discount_level_config dlc
        on dlc.discount_level_id = u.did and dlc.category = 'store'
    where pr.promo_id = p_promo_id and dlc.id_key is not null
    order by dlc.discount_level_id desc
    limit 1;

    if coalesce(array_length(_store_additional_columns_array, 1), 0) > 0 and _store_join_key is not null then
        _store_additional_columns = format(
            'jsonb_build_object(%1$s)',
            array_to_string(_store_additional_columns_array, ',')
        );
        _store_master_join = format(
            ' left join lateral ( select sm_inner.* from pricesmart.tb_store_master sm_inner where sm_inner.%I::text = coalesce(tpsrd.store_level_value->>%L, '''') limit 1 ) sm on true ',
            _store_join_key,
            _store_join_key
        );
    end if;
	
	if p_sort_key is not null then
        _order_by_sql := format(
            ' order by %s %s',
            price_promo.fn_format_column_name_for_getting_discount_values(p_promo_id, p_sort_key),
            p_sort_order
		);
    end if;

    _query = format(
        '
        select
            psd.id as row_id,
            psd.product_level_id,
            coalesce(tpprd.product_level_value,jsonb_build_object()) || %7$s as product_level_value,
            psd.store_level_id,
            coalesce(tpsrd.store_level_value,jsonb_build_object()) || %9$s as store_level_value,
            psd.customer_level_id,
            coalesce(tpcrd.customer_level_value,jsonb_build_object()) as customer_level_value,
            psd.scenario_data,
            0::float8 as min_allowed_discount_price,
            case 
                when %13$s = array[-200]::integer[] then 
                    (select min(promo_base_price) from price_promo.product_master where product_id in (
                        select product_id from price_promo.promo_product
                        where promo_id = %1$s 
                    ))
                else 
                    tpprd.max_allowed_discount_price
            end as max_allowed_discount_price,
            coalesce(
                psd.ia_recommended_data[0],
                jsonb_build_object(
                    ''scenario_type'',''ia_recommended'',
                    ''scenario_id'',0,
                    ''scenario_name'',null,
                    ''scenario_order_id'',0,
                    ''offer_type_id'', %11$L,
                    ''offer_type'', %12$L,
                    ''offer_x_type'',null,
                    ''offer_x_value'',null,
                    ''offer_y_type'',null,
                    ''offer_y_value'',null,
                    ''offer_z_type'',null,
                    ''offer_z_value'',null,
                    ''tier_id'',null
                )
            ) as ia_recommended_data
        from 
            %6$s psd
        left join 
            (
                select 
                    tpprd.product_level_id,
                    tpprd.product_level_value,
                    min(pm.promo_base_price) as max_allowed_discount_price
                from price_promo.tb_promo_product_reco_details tpprd
                left join price_promo.tb_discount_level_products dlp
                using (product_level_id)
                left join price_promo.product_master pm 
                using (product_id)
                where tpprd.promo_id = %1$s
                group by product_level_id
            ) tpprd
        on tpprd.product_level_id = psd.product_level_id
        left join
            price_promo.tb_promo_store_reco_details tpsrd
        on tpsrd.store_level_id = psd.store_level_id
        left join
            price_promo.tb_promo_customer_reco_details tpcrd
        on psd.customer_level_id = tpcrd.customer_level_id
        %8$s
        %10$s
        where true
        %4$s
        %5$s
        limit %2$s offset %3$s
        ',
        p_promo_id,
        p_limit,
        _offset,
        _where_condition,
        _order_by_sql,
        _source_table,
        _product_additional_columns,
        _product_master_join,
        _store_additional_columns,
        _store_master_join,
		_discount_type_id,
        _offer_type_name,
        format('%L::integer[]', _promo_product_discounting_level)
    );

    raise notice 'query %', _query;

    return query execute _query;

END;
$function$
;
