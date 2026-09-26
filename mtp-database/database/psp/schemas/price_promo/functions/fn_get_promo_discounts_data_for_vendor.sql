--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_promo_discounts_data_for_vendor runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_promo_discounts_data_for_vendor

DROP FUNCTION if exists price_promo.fn_get_promo_discounts_data_for_vendor;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_discounts_data_for_vendor(
    p_promo_id integer,
    p_page integer DEFAULT 1,
    p_limit integer DEFAULT 100,
    p_sort_key text DEFAULT 'id'::text,
    p_sort_order text DEFAULT 'asc'::text,
    p_filters jsonb DEFAULT NULL::jsonb,
    p_include_temporary_saved_changes boolean DEFAULT false,
    p_user_id integer DEFAULT NULL::integer
)
 RETURNS TABLE(
    row_id integer,
    product_level_id bigint,
    product_level_value jsonb,
    store_level_id integer,
    store_level_value jsonb,
    customer_level_id bigint,
    customer_level_value jsonb,
    vendor_scenario_data jsonb,
    min_allowed_discount_price double precision,
    max_allowed_discount_price double precision,
    finalized_scenario_data jsonb, 
    change_status text
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
    is_original_vendor_promo text := '';
    i record;
    _has_parent_vendor_promo boolean = false;
BEGIN

    select
    case 
        when exists(
            select 1
            from price_promo.promo_master
            where promo_id = p_promo_id
            and is_vendor_created_promo is true and parent_vendor_promo_id is null
        )
        then 'true'
        else 'false'
	end into is_original_vendor_promo;

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

    p_sort_key = price_promo.fn_format_column_name_for_getting_discount_values_for_vendor(p_promo_id,p_sort_key,_has_parent_vendor_promo);

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
                    format(
                        '(%1$s)::numeric',
                        price_promo.fn_format_column_name_for_getting_discount_values_for_vendor(
                            p_promo_id,
                            _filter_record.column_name,
                            _has_parent_vendor_promo
                        )
                    ),
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
                        'lower((%1$s)::text)',
                        price_promo.fn_format_column_name_for_getting_discount_values_for_vendor(
                            p_promo_id,
                            _filter_record.column_name,
                            _has_parent_vendor_promo
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
            on coalesce(tpprd.product_level_value[''product_id''],vendor_scenario.product_level_value[''product_id''])::int = pm.product_id
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
            on coalesce(tpsrd.store_level_value[''store_id''],vendor_scenario.store_level_value[''store_id''])::int = sm.store_id
        ';
    end if;

    _query = format(
        '
        select
            coalesce(psd.id,vendor_scenario.id) as row_id,
            coalesce(psd.product_level_id,vendor_scenario.product_level_id) as product_level_id,
            coalesce(coalesce(tpprd.product_level_value,vendor_scenario.product_level_value),jsonb_build_object()) || %8$s as product_level_value,
            coalesce(psd.store_level_id,vendor_scenario.store_level_id) as store_level_id,
            coalesce(coalesce(tpsrd.store_level_value,vendor_scenario.store_level_value),jsonb_build_object()) || %10$s as store_level_value,
            psd.customer_level_id,
            coalesce(tpcrd.customer_level_value,jsonb_build_object()) as customer_level_value,
            coalesce(
                vendor_scenario.scenario_data,
                jsonb_build_object()
            ) as vendor_scenario_data,
            0::float8 as min_allowed_discount_price,
            case 
                when pr.product_discount_level = array[-200] then 
                    (select min(promo_base_price) from price_promo.product_master where product_id in (
                        select product_id from price_promo.promo_product
                        where promo_id = %1$s 
                    ))
                else 
                    tpprd.max_allowed_discount_price
            end as max_allowed_discount_price,
            coalesce(psd.scenario_data,jsonb_build_object()) as finalized_scenario_data,
			case
				when %12$s then null
			    when vendor_scenario.id is not null and psd.id is null then ''Removed''
			    when vendor_scenario.id is null and psd.id is not null then ''Newly added''
			    when (
              coalesce(psd.scenario_data -> ''1'' ->> ''loyality_points'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''loyality_points'', '''')
                or coalesce(psd.scenario_data -> ''1'' ->> ''marketing_support'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''marketing_support'', '''')
                or coalesce(psd.scenario_data -> ''1'' ->> ''promotional_theme'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''promotional_theme'', '''')
                or coalesce(psd.scenario_data -> ''1'' ->> ''offer_value'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''offer_value'', '''')
                or coalesce(psd.scenario_data -> ''1'' ->> ''scan_back_allowance_amount'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''scan_back_allowance_amount'', '''')
                or coalesce(psd.scenario_data -> ''1'' ->> ''off_invoice_allowance_amount'', '''') <> coalesce(vendor_scenario.scenario_data -> ''1'' ->> ''off_invoice_allowance_amount'', '''')
            )
			   then ''Modified''
			end as change_status
        from 
        (
            select * from 
            price_promo.ps_rules pr
            where pr.promo_id = %1$s
        ) pr
        inner join
        (
            select * from %7$s psd
            where psd.promo_id = %1$s
        ) psd
        on pr.promo_id = psd.promo_id
        full outer join 
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
        full outer join (
            select 
                psd.*,
                tpprd.product_level_value,
                tpsrd.store_level_value
            from price_promo.ps_scenario_discounts psd
            left join price_promo.tb_promo_product_reco_details tpprd
            on psd.product_level_id = tpprd.product_level_id
            left join price_promo.tb_promo_store_reco_details tpsrd
            on psd.store_level_id = tpsrd.store_level_id
            where psd.promo_id = (
                select parent_vendor_promo_id from price_promo.promo_master
                where promo_id = %1$s
            )
        ) vendor_scenario
        on 
            coalesce(tpprd.product_level_value,''{}''::jsonb) = coalesce(vendor_scenario.product_level_value,''{}''::jsonb) and 
            coalesce(tpsrd.store_level_value,''{}''::jsonb) = coalesce(vendor_scenario.store_level_value,''{}''::jsonb)
        left join
            price_promo.tb_promo_customer_reco_details tpcrd
        on psd.customer_level_id = tpcrd.customer_level_id
        %9$s
        %11$s
        where true
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
        _store_master_join,
        is_original_vendor_promo
    );

    raise notice 'query %', _query;

    return query execute _query;

END;
$function$
;
