--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_end_cap runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_end_cap

DROP FUNCTION if exists price_promo_opt.fn_end_cap;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_end_cap(var_start_date date DEFAULT (CURRENT_DATE + 1), var_end_date date DEFAULT (CURRENT_DATE + 181))
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN

	DELETE FROM price_promo_opt.tb_end_cap_details d
    WHERE d."Start Date" BETWEEN var_start_date AND var_end_date;

    INSERT INTO price_promo_opt.tb_end_cap_details(
        "Product ID", "Promo ID", "Promo Name", "Status", "Start Date", "End Date", "Endcap flag"
    )
    SELECT 
        pp.product_id AS "Product ID",
        pp.promo_id AS "Promo ID",
        pm.name AS "Promo Name",
        pm.status AS "Status",
        pm.start_date AS "Start Date",
        pm.end_date AS "End Date",
        (pp.user_metadata->>'Endcap flag (As drop down 0 or 1)')::integer AS "Endcap flag"
    FROM price_promo.promo_product pp
    JOIN price_promo.promo_master pm USING (promo_id)
    WHERE pm.start_date BETWEEN var_start_date AND var_end_date;

END;
$function$
;

