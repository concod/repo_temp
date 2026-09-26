--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_finalize_create_temp_pccd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_finalize_create_temp_pccd

DROP PROCEDURE if exists price_promo_opt.pc_finalize_create_temp_pccd;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_finalize_create_temp_pccd(IN p_promo_id integer[], IN _pccd_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

_query_1 text;

_scenario_ids integer[];

begin

	select array_agg(scenario_id) from price_promo.scenario_master

	where promo_id = any(p_promo_id) into _scenario_ids;



	_query_1 = FORMAT('DROP table if exists %1$s;

						create table %1$s

						as

						(with sc_data as

							(select product_id,currency_id, store_hierarchy, customer_id, recommendation_date from price_promo.ps_recommended_scenarios prs

						where scenario_id = any(%2$L)

						group by 1,2,3,4,5

							),

						ia_data as

						(select product_id,currency_id, store_hierarchy, customer_id, recommendation_date from price_promo.ps_recommended_ia_projected pri

						where promo_id = any(%3$L)

						group by 1,2,3,4,5

						)

						select product_id,currency_id, store_hierarchy, customer_id, recommendation_date

						from (select * from sc_data union select * from ia_data) base

						group by 1,2,3,4,5

						);', _pccd_table, _scenario_ids, p_promo_id);



			raise notice '_query_1 : %', _query_1;

			execute _query_1;

end;

$procedure$



;