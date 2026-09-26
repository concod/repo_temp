--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_step3_get_max_allowed_price_value runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_step3_get_max_allowed_price_value

DROP FUNCTION if exists price_promo.fn_step3_get_max_allowed_price_value;
CREATE OR REPLACE FUNCTION price_promo.fn_step3_get_max_allowed_price_value(
    p_promo_id int,
    p_selected_rows int[],
    p_unselected_rows int[],
    p_filters jsonb,
    p_user_id int,
    p_include_temporary_saved_changes boolean default false
)
 RETURNS table(
    min_allowed_discount_price float4,
    max_allowed_discount_price float4
 )
 LANGUAGE plpgsql
AS $function$
DECLARE
    _filter_condition text = '';
	_query text;
BEGIN

    if coalesce(array_length(p_selected_rows, 1),0) > 0 THEN

        _filter_condition = format(
            'and id in (select unnest(%1$L::int[]))',
            p_selected_rows
        );

    elsif coalesce(p_filters, '[]'::jsonb) != '[]'::jsonb THEN
        _filter_condition = format(
            '
            and id in (
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

    _query = format(
        '
        select 
            0::float4 as min_allowed_discount_price,
            min(tpprd.max_allowed_discount_price) as max_allowed_discount_price
        from 
            price_promo.ps_scenario_discounts psd
        inner join 
            price_promo.tb_promo_product_reco_details tpprd
        on psd.product_level_id = tpprd.product_level_id
        where
            psd.promo_id = %1$s %2$s
        ',
        p_promo_id,
        _filter_condition
    );
    raise notice 'query %', _query;

    return query execute _query;

END;
$function$
;
