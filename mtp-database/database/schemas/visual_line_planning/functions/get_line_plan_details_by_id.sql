--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:get_line_plan_details_by_id stripComments:false runOnChange:true splitStatements:false context:Release_1_2 labels:New_Approach_of_MV
--comment: updated function return type to send buyer emails
DROP FUNCTION IF EXISTS visual_line_planning.get_line_plan_details_by_id;
CREATE OR REPLACE FUNCTION visual_line_planning.get_line_plan_details_by_id(p_line_plan_id uuid)
 RETURNS TABLE(line_plan_product_list_id uuid, product_id character varying, plm_id uuid, design_system_id uuid, placeholder_id integer, a0_name text, a1_name text, a2_name text, image_url text, launch_date date, exit_date date, air integer, auc integer, generic_article_name character varying, sales_u integer, receipt_u integer, regweeks integer, bop integer, sales_dollars numeric, aur numeric, st_percent numeric, aps numeric, gm_percent numeric, gm_dollars numeric, product_status character varying, store_count integer, buy_unit integer, buy_dollar numeric, buyer_emails text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        lpp.line_plan_product_list_id,
        lpp.product_id,
        lpp.plm_id,
        lpp.design_system_id,
		lpp.placeholder_id,
        
        -- Conditional selection for names based on ID priority
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.a0_name
            WHEN lpp.plm_id IS NOT NULL THEN plm.a0_name
            WHEN lpp.design_system_id IS NOT NULL THEN ds.a0_name
            ELSE lpp.a0_name
        END AS a0_name,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.a1_name
            WHEN lpp.plm_id IS NOT NULL THEN plm.a1_name
            WHEN lpp.design_system_id IS NOT NULL THEN ds.a1_name
            ELSE lpp.a1_name
        END AS a1_name,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.a2_name
            WHEN lpp.plm_id IS NOT NULL THEN plm.a2_name
            WHEN lpp.design_system_id IS NOT NULL THEN ds.a2_name
            ELSE lpp.a2_name
        END AS a2_name,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.image_url
            WHEN lpp.plm_id IS NOT NULL THEN plm.product_image_url
            WHEN lpp.design_system_id IS NOT NULL THEN ds.product_image_url
            ELSE NULL
        END AS image_url,
        
        -- For these fields, prioritize product_master when product_id exists
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.launch_date
            ELSE lpp.launch_date
        END AS launch_date,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.exit_date
            ELSE lpp.exit_date
        END AS exit_date,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.air
            ELSE lpp.air
        END AS air,
        
        CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.auc
            ELSE lpp.auc
        END AS auc,
		CASE 
            WHEN lpp.product_id IS NOT NULL THEN p.generic_article_name
            ELSE NULL
        END AS generic_article_name,
        
        lpp.sales_u,
        lpp.receipt_u,
        lpp.regweeks,
        lpp.bop,
        lpp.sales_dollars,
        lpp.aur,
        lpp.st_percent,
        lpp.aps,
        lpp.gm_percent,
        lpp.gm_dollars,
        lpp.product_status,
        lpp.store_count,
        lpp.buy_unit,
        lpp.buy_dollar,
        lpp.buyer_emails
    FROM
        visual_line_planning.line_plan_products AS lpp
    LEFT JOIN
        visual_line_planning.product_master_new AS p ON lpp.product_id = p.product_code
        
    LEFT JOIN
        visual_line_planning.plm AS plm ON lpp.plm_id = plm.id
    LEFT JOIN
        visual_line_planning.design_system AS ds ON lpp.design_system_id = ds.id
        
    WHERE
        lpp.line_plan_id = p_line_plan_id;
END;
$function$
;
