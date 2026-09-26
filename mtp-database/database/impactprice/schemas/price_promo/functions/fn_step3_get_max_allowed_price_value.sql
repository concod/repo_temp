--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_step3_get_max_allowed_price_value runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_step3_get_max_allowed_price_value

DROP FUNCTION if exists price_promo.fn_step3_get_max_allowed_price_value;
CREATE OR REPLACE FUNCTION price_promo.fn_step3_get_max_allowed_price_value(p_promo_id integer, p_selected_rows integer[], p_unselected_rows integer[], p_filters jsonb, p_user_id integer, p_include_temporary_saved_changes boolean DEFAULT false)
 RETURNS TABLE(min_allowed_discount_price double precision, max_allowed_discount_price double precision)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _filter_condition text = '';
	_query text;
	_discount_level int[];
BEGIN

	select product_discount_level into _discount_level from price_promo.ps_rules where promo_id = p_promo_id;

    if coalesce(array_length(p_selected_rows, 1),0) > 0 THEN

        _filter_condition = format(
            'and psd.id in (select unnest(%1$L::int[]))',
            p_selected_rows
        );

    elsif coalesce(p_filters, '[]'::jsonb) != '[]'::jsonb THEN
        _filter_condition = format(
            '
            and psd.id in (
                select row_id
                from price_promo.fn_get_promo_discounts(
                    %1$s,
                    1,
                    100000000,
                    p_filters => %2$L,
                    p_include_temporary_saved_changes => %3$L,
                    p_user_id => %4$L
                )        
            )
            ',
            p_promo_id,
            p_filters,
            p_include_temporary_saved_changes,
            p_user_id
        );
    end if;

    if coalesce(array_length(p_unselected_rows, 1),0) > 0 THEN
        _filter_condition = format(
            '
                %1$s
                and id not in (select unnest(%2$L::int[]))
            ',
            _filter_condition,
            p_unselected_rows
        );
    end if;

	if _filter_condition != '' then
		_query = format(
            '
            select 
                0::float8 as min_allowed_discount_price,
                case when %3$L::int[] = array[-200] then 
                    (select min(pm.promo_base_price) from price_promo.product_master pm where pm.product_id in (
                        select product_id from price_promo.promo_product where promo_id = %1$s
                    ))
				else 
                    min(pm.promo_base_price)
                end as max_allowed_discount_price
            from 
            (
                select product_level_id
                from price_promo.ps_scenario_discounts psd
                where promo_id = %1$s
                %2$s
            ) psd
            inner join
                price_promo.tb_discount_level_products dlp
            on psd.product_level_id = dlp.product_level_id
            inner join
                price_promo.product_master pm
            on dlp.product_id = pm.product_id
            ',
            p_promo_id,
            _filter_condition,
            _discount_level
        );
	else 
        _query = format(
            '
            select 
                0::float8 as min_allowed_discount_price,
                min(pm.promo_base_price) as max_allowed_discount_price
            from 
                price_promo.product_master pm
            inner join 
                price_promo.promo_product_%1$s pp
            on pm.product_id = pp.product_id
            ',
            p_promo_id,
            _filter_condition,
            _discount_level
        );
    end if;
    raise notice 'query %', _query;

    return query execute _query;

END;
$function$
;
