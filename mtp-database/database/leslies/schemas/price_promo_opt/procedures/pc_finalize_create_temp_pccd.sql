--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_finalize_create_temp_pccd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_finalize_create_temp_pccd

DROP PROCEDURE IF EXISTS price_promo_opt.pc_finalize_create_temp_pccd ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_finalize_create_temp_pccd(IN p_promo_id integer[], IN _pccd_table text, IN f_promo_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

_query_1 text;

_scenario_ids integer[];

begin

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

	select array_agg(scenario_id) from price_promo.scenario_master

	where promo_id = any(p_promo_id) into _scenario_ids;



	_query_1 = FORMAT('DROP table if exists %1$s;

						create table %1$s

						as

						(with 
							product_filter as 
								(select distinct product_id from price_promo.promo_product 
									where promo_id = any(%2$L)),

							sc_data as

							(select product_id, store_hierarchy, customer_id, recommendation_date, 
							max(offer_type_combined_display_name) as offer_type_combined_display_name 
							from price_promo.ps_recommended_scenarios prs

						where scenario_id = any(%3$L) and product_id in (select product_id from product_filter)

						group by 1,2,3,4

							),

						ia_data as

						(select product_id, store_hierarchy, customer_id, recommendation_date, 
						max(offer_type_combined_display_name) as offer_type_combined_display_name
						from price_promo.ps_recommended_ia_projected pri

						where promo_id = any(%4$L)
						and product_id in (select product_id from product_filter)

						group by 1,2,3,4

						)

						select product_id, store_hierarchy, customer_id, recommendation_date, offer_type_combined_display_name

						from (select * from sc_data union select * from ia_data) base

--						group by 1,2,3,4

						);', _pccd_table, f_promo_id, _scenario_ids, p_promo_id);



			raise notice '_query_1 : %', _query_1;

			execute _query_1;

end;

$procedure$
;