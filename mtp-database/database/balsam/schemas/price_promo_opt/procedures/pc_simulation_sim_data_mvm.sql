--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_sim_data_mvm runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_sim_data_mvm

DROP PROCEDURE if exists price_promo_opt.pc_simulation_sim_data_mvm;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_sim_data_mvm(IN var_promo_id integer, IN var_week_start_date date, IN var_week_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



BEGIN



    EXECUTE format('



        -- Drop materialized view if it exists

        -- DROP MATERIALIZED VIEW IF EXISTS price_promo_opt_temp.mvm_sim_promo_id_%s;



        -- Create materialized view

        CREATE MATERIALIZED VIEW IF NOT EXISTS price_promo_opt_temp.mvm_sim_promo_id_%s

        AS

            SELECT * 

            FROM %s AS fd

            INNER JOIN (

                SELECT *

                FROM price_promo_opt.tb_simulation_week_opt

                WHERE week_start_date BETWEEN %L AND %L

            ) sim_week

            USING (product_id)

        ', 

        var_promo_id,  -- For view name



        var_promo_id,  -- For view name



        format('price_promo_opt_temp.promo_product_filter_resim_%s', var_promo_id), -- Dynamic table name



        var_promo_id, -- For optional join



        var_week_start_date, var_week_end_date  -- Date range for simulation week filter

    );



END;



$procedure$



;