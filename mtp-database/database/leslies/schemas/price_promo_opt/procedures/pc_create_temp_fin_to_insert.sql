--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_temp_fin_to_insert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_create_temp_fin_to_insert

DROP PROCEDURE IF EXISTS price_promo_opt.pc_create_temp_fin_to_insert ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_temp_fin_to_insert(IN _table_type text, IN _ia_promos integer[], IN _scenario_ids integer[], IN _temp_table text, IN _pccd_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

_query_1 text;

_ia_ref text;

_sc_ref text;

begin
---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------



	if _table_type = 'fo' then

		_ia_ref := 'price_promo.ps_recommended_override_ia';

		_sc_ref := 'price_promo.ps_recommended_override';



	elsif _table_type = 'fso' then

		_ia_ref := 'price_promo.ps_recommended_stack_override_ia';

		_sc_ref := 'price_promo.ps_recommended_scenarios_stack_override';



	elsif _table_type = 'f' then

		_ia_ref := 'price_promo.ps_recommended_ia_projected';

		_sc_ref := 'price_promo.ps_recommended_scenarios';



	else

		_ia_ref := 'price_promo.ps_recommended_stack_ia';

		_sc_ref := 'price_promo.ps_recommended_scenarios_stack';



	end if;



	if  _table_type in ('f', 'fo') then

		_query_1 = FORMAT('DROP table if exists %1$s;

							create table %1$s as

						(

						with ia_fin as materialized

						(select

						event_id, promo_id, pccd.product_id, pccd.recommendation_date, pccd.offer_type_combined_display_name, pccd.store_hierarchy, pccd.customer_id,

			            discount_level_value, offer_type_id,

			            effective_discount,  original_cost, discounted_price,

			            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,

			          revenue, baseline_revenue, incremental_revenue,

			             margin, baseline_margin, incremental_margin,

			             affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			            affinity_margin, cannibalization_margin, pull_forward_margin,



			            created_by, updated_by, created_at, updated_at,

			            contribution_margin,

			            contribution_revenue

						from (select * from %5$s ia

						where promo_id = any(%3$L) ) ia

						join %2$s pccd

						on ia.product_id = pccd.product_id

						and ia.store_hierarchy = pccd.store_hierarchy

						and ia.customer_id = pccd.customer_id

						and ia.recommendation_date = pccd.recommendation_date

						),

						sc_fin as materialized

						(

						select

						event_id, promo_id, pccd.product_id, pccd.recommendation_date, pccd.offer_type_combined_display_name, pccd.store_hierarchy, pccd.customer_id,

			            discount_level_value, offer_type_id,

			            effective_discount, original_cost, discounted_price,

			            promo_spend, sales_units, baseline_sales_units, incremental_sales_units,

			             revenue, baseline_revenue, incremental_revenue,

			             margin, baseline_margin, incremental_margin,

			             affinity_revenue, cannibalization_revenue, pull_forward_revenue,

			            affinity_margin, cannibalization_margin, pull_forward_margin,



			            created_by, updated_by, created_at, updated_at,

			            contribution_margin,

			            contribution_revenue from (select * from %6$s

						where scenario_id = any(%4$L) ) sc

						join %2$s pccd

						on sc.product_id = pccd.product_id

						and sc.store_hierarchy = pccd.store_hierarchy

						and sc.customer_id = pccd.customer_id

						and sc.recommendation_date = pccd.recommendation_date

						)

						select * from ia_fin union select * from sc_fin);', _temp_table, _pccd_table, _ia_promos, _scenario_ids, _ia_ref, _sc_ref);

		raise notice '_fo_query : %', _query_1;

		execute _query_1;



	else

	_query_1 = FORMAT('DROP table if exists %1$s;

						create table %1$s as

						(

						with ia_fin as materialized

						(

						select event_id, array_agg(distinct promo_id order by promo_id) as promo_ids,

						pccd.product_id, pccd.recommendation_date, pccd.offer_type_combined_display_name, pccd.store_hierarchy, pccd.customer_id,

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

						from (select * from %5$s ia

						where promo_id = any(%3$L) ) ia

						join %2$s pccd

						on ia.product_id = pccd.product_id

						and ia.store_hierarchy = pccd.store_hierarchy

						and ia.customer_id = pccd.customer_id

						and ia.recommendation_date = pccd.recommendation_date

						GROUP BY 1,3,4,5,6,7

						),

						sc_fin as materialized

						(

						select event_id, array_agg(distinct promo_id order by promo_id) as promo_ids,

						pccd.product_id, pccd.recommendation_date, pccd.offer_type_combined_display_name, pccd.store_hierarchy, pccd.customer_id,

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

						from (select * from %6$s

						where scenario_id = any(%4$L) ) sc

						join %2$s pccd

						on sc.product_id = pccd.product_id

						and sc.store_hierarchy = pccd.store_hierarchy

						and sc.customer_id = pccd.customer_id

						and sc.recommendation_date = pccd.recommendation_date

						GROUP BY 1,3,4,5,6,7

						)

						select * from ia_fin union select * from sc_fin);', _temp_table, _pccd_table, _ia_promos, _scenario_ids, _ia_ref, _sc_ref);

		raise notice '_fso_query : %', _query_1;

		execute _query_1;



	end if;

end;

$procedure$
;
