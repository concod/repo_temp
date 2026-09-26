--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_promo_forecast_using_multiplier_method-26111233 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: removed lift columns

DROP FUNCTION if exists price_promo.fn_get_promo_forecast_using_multiplier_method;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_forecast_using_multiplier_method(
    p_promo_id int,
    p_scenario_id int,
    p_new_sales_units float8,
    p_new_baseline_sales_units float8,
    p_old_sales_units float8,
    p_old_baseline_sales_units float8,
    from_stacking_view boolean DEFAULT false,
    p_target_currency_id int DEFAULT null
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE

    _query text;
	_source_table text;
    _sales_units_multiplier float8;
    _baseline_sales_units_multiplier float8;
	_return_value jsonb;

BEGIN

    p_new_sales_units = coalesce(p_new_sales_units,p_old_sales_units);
    p_new_baseline_sales_units = coalesce(p_new_baseline_sales_units,p_old_baseline_sales_units);

    _sales_units_multiplier = p_new_sales_units/p_old_sales_units;
    _baseline_sales_units_multiplier = p_new_baseline_sales_units/p_old_baseline_sales_units; 

    if from_stacking_view then
        if p_scenario_id = 0 then
            _source_table = 'price_promo.ps_recommended_stack_ia_agg';
        else
            _source_table = 'price_promo.ps_recommended_scenarios_stack_agg';
        end if;
    else
        if p_scenario_id = 0 then
            _source_table = 'price_promo.ps_recommended_ia_projected_agg';
        else
            _source_table = 'price_promo.ps_recommended_scenarios_agg';
        end if;
    end if;


    _query = format('
    with target_currency_cte AS (
        SELECT 
            fn_get_target_currency_id as target_currency_id  
        from 
            price_promo.fn_get_target_currency_id(
                (
                    SELECT array_agg(DISTINCT currency_id) as source_currency_id
                    FROM price_promo.promo_master 
                    WHERE promo_id = %1$s
                ),
                %7$L::integer
        )
    ),
    agg_scenario_forecast as (
        select 
            promo_id,
            sum(prsa.sales_units) as sales_units,
            sum(prsa.baseline_sales_units) as baseline_sales_units,
            sum(prsa.incremental_sales_units) as incremental_sales_units,
            sum(prsa.revenue * pfr.planned_conversion_multiplier) as revenue,
            sum(prsa.baseline_revenue * pfr.planned_conversion_multiplier) as baseline_revenue,
            sum(prsa.incremental_revenue * pfr.planned_conversion_multiplier) as incremental_revenue,
            sum(prsa.affinity_revenue * pfr.planned_conversion_multiplier) as affinity_revenue,
            sum(prsa.cannibalization_revenue * pfr.planned_conversion_multiplier) as cannibalization_revenue,
            sum(prsa.pull_forward_revenue * pfr.planned_conversion_multiplier) as pull_forward_revenue,
            sum(prsa.margin * pfr.planned_conversion_multiplier) as margin,
            sum(prsa.baseline_margin * pfr.planned_conversion_multiplier) as baseline_margin,
            sum(prsa.incremental_margin * pfr.planned_conversion_multiplier) as incremental_margin,
            sum(prsa.affinity_margin * pfr.planned_conversion_multiplier) as affinity_margin,
            sum(prsa.cannibalization_margin * pfr.planned_conversion_multiplier) as cannibalization_margin,
            sum(prsa.pull_forward_margin * pfr.planned_conversion_multiplier) as pull_forward_margin,
            sum(prsa.promo_spend * pfr.planned_conversion_multiplier) as promo_spend,
            sum(prsa.contribution_revenue * pfr.planned_conversion_multiplier) as contribution_revenue,
            sum(prsa.contribution_margin * pfr.planned_conversion_multiplier) as contribution_margin
        from 
            %5$s prsa
		inner join 
            global.planned_forex_rate pfr 
            on 
                prsa.recommendation_date = pfr.date 
                and pfr.source_currency_id = prsa.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        where promo_id = %1$s 
        %6$s
		group by promo_id
        )
        select
            jsonb_build_object(
				''currency_name'', tcm.currency_name,
                ''currency_id'', tcm.currency_id,
                ''currency_symbol'', tcm.currency_symbol,
                ''original'',jsonb_build_object(
                    ''sales_units'', ROUND(asf.sales_units::DECIMAL, 2),
                    ''baseline_sales_units'', ROUND(asf.baseline_sales_units::DECIMAL, 2),
                    ''incremental_sales_units'', ROUND(asf.incremental_sales_units::DECIMAL, 2),
                    ''total_sales_units'', ROUND(asf.sales_units::DECIMAL, 2),
                    ''revenue'', ROUND(asf.revenue::DECIMAL, 2),
                    ''baseline_revenue'', ROUND(asf.baseline_revenue::DECIMAL, 2),
                    ''incremental_revenue'', ROUND(asf.incremental_revenue::DECIMAL, 2),
                    ''affinity_revenue'', ROUND(asf.affinity_revenue::DECIMAL, 2),
                    ''cannibalization_revenue'', ROUND(asf.cannibalization_revenue::DECIMAL, 2),
                    ''pull_forward_revenue'', ROUND(asf.pull_forward_revenue::DECIMAL, 2),
                    ''total_revenue'', ROUND(asf.revenue::DECIMAL, 2),
                    ''margin'', ROUND(asf.margin::DECIMAL, 2),
                    ''baseline_margin'', ROUND(asf.baseline_margin::DECIMAL, 2),
                    ''incremental_margin'', ROUND(asf.incremental_margin::DECIMAL, 2),
                    ''affinity_margin'', ROUND(asf.affinity_margin::DECIMAL, 2),
                    ''cannibalization_margin'', ROUND(asf.cannibalization_margin::DECIMAL, 2),
                    ''pull_forward_margin'', ROUND(asf.pull_forward_margin::DECIMAL, 2),
                    ''total_margin'', ROUND(asf.margin::DECIMAL, 2),
                    ''promo_spend'', ROUND(asf.promo_spend::DECIMAL, 2),
                    ''aur'', CASE WHEN asf.sales_units = 0 THEN 0 ELSE ROUND((asf.revenue / asf.sales_units)::DECIMAL, 2) END,
                    ''aum'', CASE WHEN asf.sales_units = 0 THEN 0 ELSE ROUND((asf.margin / asf.sales_units)::DECIMAL, 2) END,
                    ''gm_percent'', CASE WHEN asf.revenue = 0 THEN 0 ELSE ROUND((asf.margin * 100 / asf.revenue)::DECIMAL, 2) END,
                    ''contribution_margin'', round(asf.contribution_margin::DECIMAL, 2),
                    ''contribution_margin_percent'', CASE WHEN asf.contribution_revenue = 0 THEN 0 
                                                    ELSE ROUND((asf.contribution_margin * 100 / asf.contribution_revenue)::DECIMAL, 2) 
                                                    END


                ),
                ''overridden'',jsonb_build_object(
                    ''sales_units'', ROUND((asf.sales_units*%3$s)::DECIMAL, 2),
                    ''baseline_sales_units'', ROUND((asf.baseline_sales_units*%4$s)::DECIMAL, 2),
                    ''incremental_sales_units'', ROUND(((asf.sales_units*%3$s)-(asf.baseline_sales_units*%4$s))::DECIMAL, 2),
                    ''total_sales_units'', ROUND((asf.sales_units*%3$s)::DECIMAL, 2),
                    ''revenue'', ROUND((asf.revenue*%3$s)::DECIMAL, 2),
                    ''baseline_revenue'', ROUND((asf.baseline_revenue*%4$s)::DECIMAL, 2),
                    ''incremental_revenue'', ROUND(((asf.revenue*%3$s) - (asf.baseline_revenue*%4$s))::DECIMAL, 2),
                    ''affinity_revenue'', ROUND((asf.affinity_revenue*%3$s)::DECIMAL, 2),
                    ''cannibalization_revenue'', ROUND((asf.cannibalization_revenue*%3$s)::DECIMAL, 2),
                    ''pull_forward_revenue'', ROUND((asf.pull_forward_revenue*%3$s)::DECIMAL, 2),
                    ''total_revenue'', ROUND((asf.revenue*%3$s)::DECIMAL, 2),
                    ''margin'', ROUND((asf.margin*%3$s)::DECIMAL, 2),
                    ''baseline_margin'', ROUND((asf.baseline_margin*%4$s)::DECIMAL, 2),
                    ''incremental_margin'', ROUND(((asf.margin*%3$s) - (asf.baseline_margin*%4$s))::DECIMAL, 2),
                    ''affinity_margin'', ROUND((asf.affinity_margin*%3$s)::DECIMAL, 2),
                    ''cannibalization_margin'', ROUND((asf.cannibalization_margin*%3$s)::DECIMAL, 2),
                    ''pull_forward_margin'', ROUND((asf.pull_forward_margin*%3$s)::DECIMAL, 2),
                    ''total_margin'', ROUND((asf.margin*%3$s)::DECIMAL, 2),
                    ''promo_spend'', ROUND((asf.promo_spend*%3$s)::DECIMAL, 2),
                    ''aur'', CASE WHEN asf.sales_units = 0 THEN 0 
                            ELSE ROUND(((asf.revenue*%3$s) / (asf.sales_units*%3$s))::DECIMAL, 2) 
                            END,
                    ''aum'', CASE WHEN asf.sales_units = 0 THEN 0 
                            ELSE ROUND(((asf.margin*%3$s) / (asf.sales_units*%3$s))::DECIMAL, 2) 
                            END,
                    ''gm_percent'', CASE WHEN asf.revenue = 0 THEN 0 
                                    ELSE ROUND(((asf.margin * %3$s ) * 100 / (asf.revenue * %3$s))::DECIMAL, 2) 
                                    END,
                    ''contribution_margin'', round((asf.contribution_margin*%3$s)::DECIMAL, 2),
                    ''contribution_margin_percent'',CASE WHEN asf.contribution_revenue = 0 THEN 0 
                                                    ELSE ROUND((asf.contribution_margin * 100 / asf.contribution_revenue)::DECIMAL, 2) 
                                                    END
                )
            )
        from agg_scenario_forecast asf
		inner join
            global.tb_currency_master tcm
            on tcm.currency_id = (select target_currency_id from target_currency_cte)
        ',
        p_promo_id,
        p_scenario_id,
        _sales_units_multiplier,
        _baseline_sales_units_multiplier,
        _source_table,
        case when p_scenario_id != 0 then format('and scenario_id = %1$s',p_scenario_id) else '' end,
		p_target_currency_id
    );

    raise notice 'query: %', _query;


	execute _query into _return_value;

    return _return_value;


END;
$function$
;
