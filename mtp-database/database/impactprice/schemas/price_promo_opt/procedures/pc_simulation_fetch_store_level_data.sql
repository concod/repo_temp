--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_fetch_store_level_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_fetch_store_level_data

DROP PROCEDURE if exists price_promo_opt.pc_simulation_fetch_store_level_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_fetch_store_level_data(IN var_promo_id integer, IN var_week_start_date date, IN var_week_end_date date, IN arr_scenario_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    EXECUTE format('

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_store_level_data_%s_%s;

        CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_store_level_data_%s_%s

        AS
            select l3_cid, l0_cid, simulation_week_start_date, 
--s0_id, s1_id,--, concat(s0_id, ''_'', s1_id) as store_hierarchy,
store_reco_level,
            sum(coalesce(store_split_ratio, 0))::float4 as store_split
            from
            (select * from price_promo_opt.tb_store_split_opt sso
            WHERE sso.simulation_week_start_date BETWEEN %L AND %L
            ) so
            INNER JOIN price_promo.fn_fetch_stores_for_promo(%s) using(store_id)
            INNER JOIN
            (select distinct l3_cid, l0_cid from price_promo_opt_temp.promo_product_filter_resim_%s_%s) aa
            using(l3_cid, l0_cid)
            GROUP BY l3_cid, l0_cid, simulation_week_start_date, 
--s0_id, s1_id
store_reco_level

;

		CREATE INDEX idx_price_promo_simulation_store_level_data_%s_%s 

		ON price_promo_opt_temp.promo_simulation_store_level_data_%s_%s 

		USING btree (simulation_week_start_date,l3_cid,l0_cid,store_reco_level);



    ', 	var_promo_id,  array_to_string(arr_scenario_id, '_'), 

   		var_promo_id,  array_to_string(arr_scenario_id, '_'), 

   		 var_week_start_date, var_week_end_date,var_promo_id,

   		 var_promo_id,  array_to_string(arr_scenario_id, '_'), 

   		var_promo_id,  array_to_string(arr_scenario_id, '_'), 

   		var_promo_id,  array_to_string(arr_scenario_id, '_'));

END;

$procedure$
;

