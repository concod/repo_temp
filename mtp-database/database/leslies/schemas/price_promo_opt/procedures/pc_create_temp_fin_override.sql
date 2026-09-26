--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_temp_fin_override runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_temp_fin_override

DROP PROCEDURE IF EXISTS price_promo_opt.pc_create_temp_fin_override ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_temp_fin_override(IN _ia_promos integer[], IN _scenario_ids integer[], IN _fo_temp_table text, IN _fso_temp_table text, IN _pccd_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

_fo_query text;

_fso_query text;

begin

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------


    _fo_query = FORMAT('create table %1$s

                        (

                        with ia_fin as

                        (select * from (select * from price_promo.ps_recommended_override_ia ia

                        where promo_id = any(%3$L) ) ia

                        join %2$s pccd

                        on ia.product_id = pccd.product_id

                        and ia.s0_id = pccd.s0_id

                        and ia.s1_id = pccd.s1_id

                        and ia.recommendation_date = pccd.recommendation_date

                        ),

                        sc_fin as

                        (

                        select * from (select * from price_promo.ps_recommended_override

                        where scenario_id = any(%4$L) ) sc

                        join %2$s pccd

                        on sc.product_id = pccd.product_id

                        and sc.s0_id = pccd.s0_id

                        and sc.s1_id = pccd.s1_id

                        and sc.recommendation_date = pccd.recommendation_date

                        )

                        select * from ia_fin union select * from sc_fin;', _fo_temp_table, _pccd_table, _ia_promos, _scenario_ids);

    raise notice '_fo_query : %', _fo_query;



    

    _fso_query = FORMAT('create table %1$s

                        (

                        with ia_fin as

                        (

                        select event_id, array_agg(promo_id) as promo_ids,

                        product_id, recommendation_date, offer_type_combined_display_name, s0_id, s1_id,

                        max(discount_level_value) as discount_level_value, max(offer_type_id) as  offer_type_id ,

                        max(effective_discount) as effective_discount,

                        max(original_cost) as original_cost, max(discounted_price) as discounted_price,

                        max(promo_spend) as promo_spend, max(sales_units) as sales_units, 

                        min(baseline_sales_units) as baseline_sales_units, max(baseline_sales_units) as pos_baseline_sales_units,

                        max(incremental_sales_units) as incremental_sales_units,

                        max(revenue) as revenue, min(baseline_revenue) as baseline_revenue, 

                        max(baseline_revenue) as pos_baseline_revenue, max(incremental_revenue) as incremental_revenue,

                        max(margin) as margin, min(baseline_margin) as baseline_margin,

                        max(baseline_margin) as pos_baseline_margin, max(incremental_margin) as incremental_margin,

                        max(affinity_revenue) as affinity_revenue, max(cannibalization_revenue) as cannibalization_revenue,

                        max(pull_forward_revenue) as pull_forward_revenue,

                        max(affinity_margin) as affinity_margin, max(cannibalization_margin) as cannibalization_margin,

                        max(pull_forward_margin) as pull_forward_margin,

                        max(created_by) as created_by, max(updated_by) as updated_by, now() as created_at,

                        now() as updated_at, max(contribution_revenue) as contribution_revenue,

                        max(contribution_margin) as contribution_margin

                        from (select * from price_promo.ps_recommended_stack_override_ia ia

                        where promo_id = any(%3$L) ) ia

                        join %2$s pccd

                        on ia.product_id = pccd.product_id

                        and ia.s0_id = pccd.s0_id

                        and ia.s1_id = pccd.s1_id

                        and ia.recommendation_date = pccd.recommendation_date

                        ),

                        sc_fin as

                        (

                        select event_id, array_agg(promo_id) as promo_ids,

                        product_id, recommendation_date, offer_type_combined_display_name, s0_id, s1_id,

                        max(discount_level_value) as discount_level_value, max(offer_type_id) as  offer_type_id ,

                        max(effective_discount) as effective_discount, 

                        max(original_cost) as original_cost, max(discounted_price) as discounted_price,

                        max(promo_spend) as promo_spend, max(sales_units) as sales_units, 

                        min(baseline_sales_units) as baseline_sales_units, max(baseline_sales_units) as pos_baseline_sales_units,

                        max(incremental_sales_units) as incremental_sales_units, 

                        max(revenue) as revenue, min(baseline_revenue) as baseline_revenue, 

                        max(baseline_revenue) as pos_baseline_revenue, max(incremental_revenue) as incremental_revenue,

                        max(margin) as margin, min(baseline_margin) as baseline_margin,

                        max(baseline_margin) as pos_baseline_margin, max(incremental_margin) as incremental_margin,

                        max(affinity_revenue) as affinity_revenue, max(cannibalization_revenue) as cannibalization_revenue,

                        max(pull_forward_revenue) as pull_forward_revenue,

                        max(affinity_margin) as affinity_margin, max(cannibalization_margin) as cannibalization_margin,

                        max(pull_forward_margin) as pull_forward_margin, 

                        max(created_by) as created_by, max(updated_by) as updated_by, now() as created_at,

                        now() as updated_at, max(contribution_revenue) as contribution_revenue,

                        max(contribution_margin) as contribution_margin 

                        from (select * from price_promo.ps_recommended_scenarios_stack_override

                        where scenario_id = any(%4$L) ) sc

                        join %2$s pccd

                        on sc.product_id = pccd.product_id

                        and sc.s0_id = pccd.s0_id

                        and sc.s1_id = pccd.s1_id

                        and sc.recommendation_date = pccd.recommendation_date

                        )

                        select * from ia_fin union select * from sc_fin;', _fo_temp_table, _pccd_table, _ia_promos, _scenario_ids);

        raise notice '_fso_query : %', _fso_query;

end;

$procedure$
;
