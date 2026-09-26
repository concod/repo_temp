--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_delete_finalized runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_delete_finalized

DROP PROCEDURE if exists price_promo_opt.pc_simulation_delete_finalized;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_finalized(IN var_promo_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



BEGIN



    -- Delete existing recommended scenarios for given promo and scenario IDs







    DELETE FROM price_promo.ps_recommended_finalized



    WHERE promo_id = var_promo_id;



    



END;



$procedure$
;

