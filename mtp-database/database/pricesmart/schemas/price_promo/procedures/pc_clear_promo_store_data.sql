--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:pc_clear_promo_store_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_clear_promo_store_data

DROP PROCEDURE IF EXISTS price_promo.pc_clear_promo_store_data;
CREATE OR REPLACE PROCEDURE price_promo.pc_clear_promo_store_data(IN _promo_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
	
	delete from price_promo.promo_store where promo_id = _promo_id;
	delete from price_promo.promo_store_hierarchy where promo_id = _promo_id;
	delete from price_promo.promo_store_sg_hierarchy where promo_id = _promo_id;
	delete from price_promo.tb_promo_store_groups where promo_id = _promo_id;

END;

$procedure$
;
