--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_finalize_delete_override_data_v101224 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_finalize_delete_override_data.2

DROP PROCEDURE IF EXISTS price_promo_opt.pc_finalize_delete_override_data;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_finalize_delete_override_data(IN p_promo_id integer[], IN _pccd_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
_query_1 text;
_scenario_ids integer[];
begin
	select array_agg(scenario_id) from price_promo.scenario_master
	where promo_id = any(p_promo_id) into _scenario_ids;


	_query_1 = FORMAT('DELETE FROM price_promo.ps_recommended_override pro
						USING %2$s pccd
						WHERE pro.scenario_id = any(%1$L)
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

						DELETE FROM price_promo.ps_recommended_scenarios_stack_override pro
						USING %2$s pccd
						WHERE pro.scenario_id = any(%1$L)
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

						DELETE FROM price_promo.ps_recommended_override_ia pro
						USING %2$s pccd
						WHERE pro.promo_id = any(%3$L)
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

						DELETE FROM price_promo.ps_recommended_stack_override_ia pro
						USING %2$s pccd
						WHERE pro.promo_id = any(%3$L)
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

						DELETE FROM price_promo.ps_recommended_finalized_override pro
						USING %2$s pccd
						WHERE pro.promo_id = any(%3$L)
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

						DELETE FROM price_promo.ps_recommended_finalized_stack_override pro
						USING %2$s pccd
						WHERE pro.promo_ids && %3$L
						and pro.product_id = pccd.product_id
						and pro.s0_id = pccd.s0_id
						and pro.s1_id = pccd.s1_id
						and pro.recommendation_date = pccd.recommendation_date;

', _scenario_ids, _pccd_table, p_promo_id);
			raise notice '_query_1 : %', _query_1;
			execute _query_1;
end;
$procedure$
;
