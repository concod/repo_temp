--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_get_ongoing_promo_product_actuals runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_get_ongoing_promo_product_actuals

DROP PROCEDURE IF EXISTS price_promo_opt.pc_get_ongoing_promo_product_actuals ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_get_ongoing_promo_product_actuals(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

  distinct_promo_id INT;

BEGIN

  FOR distinct_promo_id IN
    SELECT DISTINCT promo_id
    FROM price_promo.promo_master pm
    WHERE status = 8 
    AND var_date BETWEEN start_date AND end_date

  LOOP 

  WITH prod_data_cte AS MATERIALIZED (
    SELECT unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 1)) AS product_id
    UNION ALL 
    SELECT unnest(price_promo.fn_get_promo_final_products(distinct_promo_id, 0)) AS product_id
	)

  DELETE FROM price_promo.promo_product_actuals WHERE promo_id = distinct_promo_id;

  INSERT INTO price_promo.promo_product_actuals(promo_id, product_id)
  SELECT distinct_promo_id AS promo_id, product_id 
  FROM prod_data_cte;
      
  END LOOP;

END;

$procedure$
;
