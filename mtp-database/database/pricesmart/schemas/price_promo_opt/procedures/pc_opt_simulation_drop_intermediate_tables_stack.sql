--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_simulation_drop_intermediate_tables_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_simulation_drop_intermediate_tables_stack

DROP PROCEDURE if exists price_promo_opt.pc_opt_simulation_drop_intermediate_tables_stack;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_simulation_drop_intermediate_tables_stack(IN table_suffix character varying, IN delete_flag integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    IF delete_flag != 0 THEN

        EXECUTE format('

        DROP TABLE IF EXISTS price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s;

        DROP TABLE IF EXISTS price_promo_opt_temp.opt_stacked_discounts_table_%s;

        DROP TABLE IF EXISTS price_promo_opt_temp.opt_simulation_create_discount_filter_stack_%s_final;

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_store_level_data_%s;

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_pf_coefficient_stack_%s;

        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_cannibalization_coefficient_stack_%s;

        --DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_offer_attractiveness_factor_%s;

	    DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_store_level_data_%s;



        ',

            table_suffix, table_suffix, table_suffix,

            table_suffix, table_suffix, table_suffix,

			table_suffix, table_suffix

        );

    END IF;

END $procedure$



;