--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_promo_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_promo_discounts

DROP FUNCTION if exists price_promo.fn_get_promo_discounts;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_discounts(
    p_promo_id int,
    p_page int default 1,
    p_limit int default 100,
    p_sort_key text default 'id',
    p_sort_order text default 'asc',
    p_filters jsonb default null,
    p_include_temporary_saved_changes boolean default false,
    p_user_id int default null
)
 RETURNS TABLE(
    row_id int,
    product_level_id int8,
    product_level_value jsonb,
    store_level_id int,
    store_level_value jsonb,
    customer_level_id int8,
    customer_level_value jsonb,
    scenario_data jsonb,
    ia_recommended_data jsonb
 )
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
    _product_discounting_level int;
    _store_discounting_level int;
    _product_additional_columns text = 'jsonb_build_object()';
    _product_master_join text = '';
    _store_additional_columns text = 'jsonb_build_object()';
    _store_master_join text = '';
    _sku_additional_column_details jsonb;
    _store_additional_column_details jsonb;
    _product_additional_columns_array text[];
    _store_additional_columns_array text[];
    i record;
BEGIN

    if p_include_temporary_saved_changes then
        _source_table = format('price_promo.tb_user_promo_temp_bulk_edit_data_%1$s_%2$s',p_promo_id,p_user_id);
    else 
        _source_table = 'price_promo.ps_scenario_discounts';
    end if;

    select 
        product_discount_level,
        store_discount_level
    from price_promo.ps_rules
    where promo_id = p_promo_id
    into _promo_product_discounting_level,
        _promo_store_discounting_level;

    select
        discount_level_id into _product_discounting_level
    from price_promo.discount_level_config
    where id_key = 'product_id';


    select
        discount_level_id into _store_discounting_level
    from price_promo.discount_level_config
    where id_key = 'store_id';

    p_sort_key = price_promo.fn_format_column_name_for_getting_discount_values(p_sort_key);

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
                global.fn_generate_filter_condition_for_int(
                    format('(%1$s)::numeric',price_promo.fn_format_column_name_for_getting_discount_values(_filter_record.column_name)),
                    _filter_record.operator,
                    _filter_record.value1,
                    _filter_record.value2
                    )
            );
        else
            _where_clause_array:= array_append(
                _where_clause_array ,
                global.fn_generate_filter_condition_for_string(
                    format(
                        'lower(%1$s)',
                        price_promo.fn_format_column_name_for_getting_discount_values(
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

    _sku_additional_column_details = (
        select config_value::jsonb 
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'discount_level_sku_additional_columns'
    );

    _store_additional_column_details = (
        select config_value::jsonb 
        from price_promo.tb_tool_configurations
        where module = 'store' and config_name = 'discount_level_store_additional_columns'
    );

    if _product_discounting_level = any(_promo_product_discounting_level) then
        _product_additional_columns_array = array[]::text[];
        for i in (select value from jsonb_array_elements(_sku_additional_column_details))
        loop
            _product_additional_columns_array = array_append(
                _product_additional_columns_array,
                format('''%1$s'',pm.%2$s',i.value->>'key',i.value->>'db_column')
            );
        end loop;
        _product_additional_columns = format(
            'jsonb_build_object(%1$s)',
            array_to_string(_product_additional_columns_array, ',')
        );
        _product_master_join = '
            inner join price_promo.product_master pm 
            on tpprd.product_level_value[''product_id'']::int = pm.product_id
        ';
    end if;

    if _store_discounting_level = any(_promo_store_discounting_level) then
        _store_additional_columns_array = array[]::text[];
        for i in (select value from jsonb_array_elements(_store_additional_column_details))
        loop
            _store_additional_columns_array = array_append(
                _store_additional_columns_array,
                format('''%1$s'',sm.%2$s',i.value->>'key',i.value->>'db_column')
            );
        end loop;
        _store_additional_columns = format(
            'jsonb_build_object(%1$s)',
            array_to_string(_store_additional_columns_array, ',')
        );
        _store_master_join = '
            inner join global.tb_store_master sm 
            on tpsrd.store_level_value[''store_id'']::int = sm.store_id
        ';
    end if;

    _query = format(
        '
        select
            psd.id as row_id,
            psd.product_level_id,
            coalesce(tpprd.product_level_value,jsonb_build_object()) || %8$s as product_level_value,
            psd.store_level_id,
            coalesce(tpsrd.store_level_value,jsonb_build_object()) || %10$s as store_level_value,
            psd.customer_level_id,
            coalesce(tpcrd.customer_level_value,jsonb_build_object()) as customer_level_value,
            psd.scenario_data,
            coalesce(
                psd.ia_recommended_data[0],
                jsonb_build_object(
                    ''scenario_type'',''ia_recommended'',
                    ''scenario_id'',0,
                    ''scenario_name'',null,
                    ''scenario_order_id'',0,
                    ''offer_type_id'', pr.discount_type_id,
                    ''offer_type'', tasm.name,
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
            price_promo.ps_rules pr
        inner join metaschema.tb_app_sub_master tasm
        on pr.discount_type_id = tasm.id
        inner join
            %7$s psd
        on pr.promo_id = psd.promo_id
        left join 
            price_promo.tb_promo_product_reco_details tpprd    
        on tpprd.product_level_id = psd.product_level_id
        left join
            price_promo.tb_promo_store_reco_details tpsrd
        on tpsrd.store_level_id = psd.store_level_id
        left join
            price_promo.tb_promo_customer_reco_details tpcrd
        on psd.customer_level_id = tpcrd.customer_level_id
        %9$s
        %11$s
        where psd.promo_id = %1$s
        %4$s
        order by %5$s %6$s
        limit %2$s offset %3$s
        ',
        p_promo_id,
        p_limit,
        _offset,
        _where_condition,
        p_sort_key,
        p_sort_order,
        _source_table,
        _product_additional_columns,
        _product_master_join,
        _store_additional_columns,
        _store_master_join
    );

    raise notice 'query %', _query;

    return query execute _query;

END;
$function$
;
