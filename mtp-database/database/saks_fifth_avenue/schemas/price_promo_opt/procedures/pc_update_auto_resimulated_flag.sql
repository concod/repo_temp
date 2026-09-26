
--liquibase formatted sql
--changeset vaibhav@:pc_update_auto_resimulated_flag_v261124 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_update_auto_resimulated_flag

DROP PROCEDURE IF EXISTS price_promo_opt.pc_update_auto_resimulated_flag ;    
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_update_auto_resimulated_flag(IN var_promo_id integer[], IN value integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    UPDATE price_promo.promo_master

    SET is_auto_resimulated = value

    WHERE promo_id = any(var_promo_id);

END;

$procedure$
;
