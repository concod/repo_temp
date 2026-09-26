--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:pc_clear_promo_product_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_clear_promo_product_data

DROP PROCEDURE IF EXISTS price_promo.pc_clear_promo_product_data;
CREATE OR REPLACE PROCEDURE price_promo.pc_clear_promo_product_data(IN _promo_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
	
	delete from price_promo.promo_product where promo_id = _promo_id;
	delete from price_promo.promo_product_hierarchy where promo_id = _promo_id;
	delete from price_promo.promo_product_pg_hierarchy where promo_id = _promo_id;
	delete from price_promo.included_promo_product_groups where promo_id = _promo_id;
	delete from price_promo.included_promo_pg_hierarchy where promo_id = _promo_id;
	delete from price_promo.tb_promo_product_groups where promo_id = _promo_id;
	delete from price_promo.included_product_hierarchy where promo_id = _promo_id;
	delete from price_promo.included_products where promo_id = _promo_id;

END;

$procedure$
;
