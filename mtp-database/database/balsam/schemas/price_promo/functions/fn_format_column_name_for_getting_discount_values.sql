--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_format_column_name_for_getting_discount_values runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_format_column_name_for_getting_discount_values

DROP FUNCTION if exists price_promo.fn_format_column_name_for_getting_discount_values;
CREATE OR REPLACE FUNCTION price_promo.fn_format_column_name_for_getting_discount_values(
    p_promo_id int,
    p_column_name text
)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE

    _product_columns text[];
    _store_columns text[];
    _customer_columns text[];
    _scenario_order_id text;
	_column_name text;
    _sku_additional_columns jsonb;
    _store_additional_columns jsonb;

BEGIN

    select 
        array_agg(value_key) filter (where category = 'product'),
        array_agg(value_key) filter (where category = 'store'),
        array_agg(value_key) filter (where category = 'customer')
    from price_promo.discount_level_config,
    (select * from price_promo.ps_rules where promo_id = p_promo_id) pr
    where value_key is not null
    and (
        (discount_level_id = any(pr.product_discount_level) and category = 'product')
        or (discount_level_id = any(pr.store_discount_level) and category = 'store')
    )
    into _product_columns, _store_columns, _customer_columns;


    select 
        jsonb_object_agg(
            value->>'key',
            value->>'db_column'
        ) into _sku_additional_columns
    from 
        jsonb_array_elements(
            (select config_value::jsonb from price_promo.tb_tool_configurations where module = 'product' and config_name = 'discount_level_sku_additional_columns')
        );
    
    select 
        jsonb_object_agg(
            value->>'key',
            value->>'db_column'
        ) into _store_additional_columns
    from 
        jsonb_array_elements(
            (select config_value::jsonb from price_promo.tb_tool_configurations where module = 'store' and config_name = 'discount_level_store_additional_columns')
        );

    if p_column_name = any(_product_columns) then
        return format('product_level_value->>''%s''', p_column_name);
    elsif p_column_name = any(_store_columns) then
        return format('store_level_value->>''%s''', p_column_name);
    elsif p_column_name = any(_customer_columns) then
        return format('customer_level_value->>''%s''', p_column_name);
    elsif p_column_name in (select key from jsonb_each(_sku_additional_columns)) then
        return format('pm.%s', _sku_additional_columns[p_column_name]);
    elsif p_column_name in (select key from jsonb_each(_store_additional_columns)) then
        return format('sm.%s', _store_additional_columns[p_column_name]);
    elsif p_column_name like 'scenario#%' then
        _scenario_order_id = split_part(p_column_name, '#', 2);
        _column_name = split_part(p_column_name, '#', 3);
        if _column_name = 'offer_x_value' then
            return format('(psd.scenario_data->''%s''->>''%s'')::numeric',_scenario_order_id,_column_name);
        else
            return format('psd.scenario_data->''%s''->>''%s''',_scenario_order_id,_column_name);
        end if;
    elsif p_column_name like 'ia_recommended#%' then
        _column_name = split_part(p_column_name, '#', 3);
        if _column_name = 'offer_x_value' then
            return format('(psd.ia_recommended_data->''0''->>''%s'')::numeric',_column_name);
        else
            return format('psd.ia_recommended_data->''0''->>''%s''',_column_name);
        end if;
    else
        return format('psd.%s', p_column_name);
    end if;




END;
$function$
;
