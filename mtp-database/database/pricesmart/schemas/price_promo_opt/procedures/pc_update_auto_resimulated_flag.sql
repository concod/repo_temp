--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_update_auto_resimulated_flag runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_update_auto_resimulated_flag

DROP PROCEDURE if exists price_promo_opt.pc_update_auto_resimulated_flag;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_update_auto_resimulated_flag(IN var_promo_id integer[], IN value integer, IN last_sim_time boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    -- Update is_auto_resimulated flag
    UPDATE price_promo.promo_master
    SET is_auto_resimulated = value
    WHERE promo_id = any(var_promo_id);

    -- Conditionally update last_simulation_time if last_sim_time = true
    IF last_sim_time THEN
        UPDATE price_promo.promo_master
        SET last_simulation_time = now() AT TIME ZONE 'UTC'
        WHERE promo_id = any(var_promo_id);
    END IF;

END;

$procedure$



;