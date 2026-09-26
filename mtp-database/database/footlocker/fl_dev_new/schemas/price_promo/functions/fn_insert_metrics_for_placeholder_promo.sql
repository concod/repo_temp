--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_insert_metrics_for_placeholder_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.fn_insert_metrics_for_placeholder_promo

drop function if exists price_promo.fn_insert_metrics_for_placeholder_promo;
CREATE OR REPLACE FUNCTION price_promo.fn_insert_metrics_for_placeholder_promo(
    p_promo_id int,
    p_start_date DATE, 
    p_end_date DATE,
    p_metrics jsonb
)
RETURNS void AS $$
DECLARE

    _weighted_price jsonb;
    _weighted_base_price numeric;
    _weighted_cost_price numeric;
    _weighted_selling_price numeric;
    _gross_margin_target numeric;
    _sales_units_target numeric;

BEGIN

    _weighted_price = price_promo.fn_fetch_pricing_with_max_usage(p_start_date, p_end_date);    
    _weighted_base_price = (_weighted_price->>'weighted_base_price')::float;
    _weighted_cost_price = (_weighted_price->>'weighted_cost_price')::float;

    _weighted_selling_price = _weighted_base_price * (100-(p_metrics->>'discount')::float)/100;
    _sales_units_target = case 
        when _weighted_selling_price = 0 then 0
        else 
            round(((p_metrics->>'revenue_target')::float / _weighted_selling_price)::numeric, 2)
    end;
    _gross_margin_target = case 
        when _weighted_selling_price = 0 then 0
        else 
            round(
                (
                    (p_metrics->>'revenue_target')::float * (1 - _weighted_cost_price / _weighted_selling_price)
                )::numeric
                ,
                2
            )
    end;

    delete from price_promo.tb_placeholder_targets
    where promo_id = p_promo_id;
    insert into price_promo.tb_placeholder_targets
    (promo_id, status, inventory, discount, revenue_target, units_target, gross_margin_target, gross_margin_percent_target)
    VALUES
    (
        p_promo_id, 
        -1 ,
        (p_metrics->>'inventory')::float,
        (p_metrics->>'discount')::float,
        (p_metrics->>'revenue_target')::float,
        _sales_units_target,
        _gross_margin_target,
        CASE
            when (p_metrics->>'revenue_target')::float = 0 then 0
            else (_gross_margin_target * 100) / (p_metrics->>'revenue_target')::float
        end
    );


    delete from price_promo.ps_recommended_finalized_agg where promo_id = p_promo_id;
    delete from price_promo.ps_recommended_finalized_stack_agg where promo_ids = array[p_promo_id];

    perform price_promo.fn_insert_recommendation_data_for_placeholder_promo(
        p_promo_id,
        p_start_date,
        p_end_date,
        _sales_units_target::numeric,
        (p_metrics->>'revenue_target')::numeric,
        _gross_margin_target::numeric
    );

    

END;
$$ LANGUAGE plpgsql;
