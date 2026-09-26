--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:backsync_forecast_reporting_post_hierarchy_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for backsync_forecast_reporting_post_hierarchy_date

DROP PROCEDURE if exists price_promo_opt.backsync_forecast_reporting_post_hierarchy_date;
CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_forecast_reporting_post_hierarchy_date(IN var_start_date date DEFAULT (CURRENT_DATE - 7), IN var_end_date date DEFAULT (CURRENT_DATE - 1))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_backsync_reporting_post_hierarchy_date;

	INSERT INTO price_promo_opt.tb_backsync_reporting_post_hierarchy_date	
	SELECT *, now() AS last_backsync_at
    FROM price_promo.ps_reporting_post_hierarchy_date r2
    WHERE r2.date BETWEEN var_start_date AND var_end_date;
	
END;
$procedure$
;

