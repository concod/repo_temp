--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_update_is_processing_flag runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_update_is_processing_flag

DROP PROCEDURE IF EXISTS price_promo_opt.pc_update_is_processing_flag;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_update_is_processing_flag(IN var_promo_id integer[], IN value integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

BEGIN

    UPDATE price_promo.promo_master

    SET is_under_processing = value

    WHERE promo_id = any(var_promo_id);

END;

$procedure$
;
