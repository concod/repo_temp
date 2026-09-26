--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:pc_temp_mkd_resim_agg_fin_19122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_temp_mkd_resim_agg_fin

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_config_strategy_start_end_date();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_temp_mkd_resim_agg_fin(IN _strategy_id integer, IN _reference_table character varying, IN _temp_table_agg_fin text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

    begin

    EXECUTE FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
    CREATE unlogged TABLE price_markdown_opt_temp.%I as
    with ending_rule as
    (
      select product_level_id, store_level_id, pcd_id, 99 as end_rule
                from price_markdown.tb_strategy_discount
               where strategy_id = $1
    ),


    base as (
    select t1.*,
           CASE WHEN end_rule is NULL THEN round(cast(selling_price as numeric), 2)
           ELSE ROUND(cast(selling_price -(end_rule::numeric/100) as numeric),1)+(end_rule::numeric/100)
           END as effective_price_point,
           CASE WHEN end_rule is NULL THEN round(cast(selling_price_with_vat as numeric), 2)
           ELSE ROUND(cast(selling_price_with_vat -(end_rule::numeric/100) as numeric),1)+(end_rule::numeric/100)
           END as effective_price_point_with_vat
    from (
        select strategy_id, currency_id, product_level_id, store_level_id,
               pcd_id, recommendation_date, recommended_offer_percentage, previous_markdown_percentage, channel_info,
               SUM(sales_units) sales_units, SUM(revenue) revenue, SUM(margin) margin,
               SUM(rem_inv) rem_inv, SUM(spend) spend,
            CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                 ELSE AVG(effective_price_point)
            END as selling_price,
            SUM(sales_units_uncapped) as sales_units_uncapped,
            SUM(revenue_with_vat) as revenue_with_vat,
            SUM(margin_with_vat) as margin_with_vat,
            SUM(spend_with_vat) as spend_with_vat,
            CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                 ELSE AVG(effective_price_point_with_vat)
            END as selling_price_with_vat
        from price_markdown_opt_temp.%I
        GROUP BY 1,2,3,4,5,6,7,8,9
            ) t1
    left join ending_rule t2
    on t1.product_level_id = t2.product_level_id
	and t1.store_level_id = t2.store_level_id
	and t1.pcd_id = t2.pcd_id
    )

    select strategy_id,
       product_level_id,
       store_level_id,
       recommendation_date,
       recommended_offer_percentage,
       effective_price_point,
       pcd_id,
       sales_units,
       margin,
       revenue,
       current_timestamp as created_at,
       current_timestamp as updated_at,
       rem_inv,
       spend,
       sales_units_uncapped,
       previous_markdown_percentage,
       channel_info,
       currency_id,
       effective_price_point_with_vat,
       margin_with_vat,
       revenue_with_vat,
       spend_with_vat
		    from base;', _temp_table_agg_fin, _temp_table_agg_fin, _reference_table)
        using _strategy_id;
    END;
    $procedure$
;