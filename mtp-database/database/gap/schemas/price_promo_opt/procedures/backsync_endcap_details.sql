--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:backsync_endcap_details runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for backsync_endcap_details

DROP PROCEDURE if exists price_promo_opt.backsync_endcap_details;
CREATE OR REPLACE PROCEDURE price_promo_opt.backsync_endcap_details(IN var_start_date date DEFAULT (CURRENT_DATE + 1), IN var_end_date date DEFAULT (CURRENT_DATE + 181))
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

	TRUNCATE TABLE price_promo_opt.tb_end_cap_details;

    INSERT INTO price_promo_opt.tb_end_cap_details(
        "Product ID", "Promo ID", "Promo Name", "Status", "Start Date", "End Date", "Endcap flag", "Last Backsync At"
    )
    SELECT 
        pp.product_id AS "Product ID",
        pp.promo_id AS "Promo ID",
        pm.name AS "Promo Name",
        CASE
		WHEN pm.status = 4 THEN 'Finalized'
		WHEN pm.status = 8 THEN 'Execution Approved'
		END AS "Status",
        pm.start_date AS "Start Date",
        pm.end_date AS "End Date",
        COALESCE((pp.user_metadata->>'endcap_flag')::integer, 0) AS "Endcap flag",
		NOW() AS "Last Backsync At"
    FROM price_promo.promo_product pp
    JOIN price_promo.promo_master pm USING (promo_id)
    WHERE pm.start_date BETWEEN var_start_date AND var_end_date 
	AND pm.end_date BETWEEN var_start_date AND var_end_date
	AND pm.status in (4, 8);

END;
$procedure$
;

