--liquibase formatted sql
--changeset shannonnelson.d@impactanalytics.co:get_line_plan_details_by_id_v2_updated_20251104 stripComments:false runOnChange:true splitStatements:false context:Release_2_1 labels:function_changed_v_2_1
--comment: updated changeset for get_line_plan_details_by_id_v2_1 - refreshed on 2025-11-04 (added is_locked)
DROP FUNCTION IF EXISTS visual_line_planning.get_line_plan_details_by_id_v2;
CREATE OR REPLACE FUNCTION visual_line_planning.get_line_plan_details_by_id_v2(p_line_plan_id uuid)
 RETURNS TABLE(line_plan_product_list_id uuid, air integer, aps numeric, auc integer, aur numeric, bop integer, buy_dollar numeric, buy_unit integer, buyer_email_count integer, exit_date date, gm_dollars numeric, gm_percent numeric, launch_date date, product_status character varying, receipt_u integer, regweeks integer, sales_dollars numeric, sales_u integer, st_percent numeric, store_count integer, product_attribute_list jsonb, a0_name text, a1_name text, a2_name text, image_url text, product_id character varying, plm_id uuid, design_system_id uuid, placeholder_id integer, additional_columns jsonb, comment_count integer, is_locked boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH variant_attributes AS (
        SELECT
            mmp.line_plan_product_list_id,
            jsonb_agg(
                jsonb_strip_nulls(
                    jsonb_build_object(
                        'a0_name', COALESCE(mmp.a0_name, ''),
                        'a1_name', COALESCE(mmp.a1_name, ''),
                        'a2_name', COALESCE(mmp.a2_name, ''),
                        'mapped_id', mmp.mapped_id,
                        'image_url', COALESCE(mmp.image_url, ''),
                        'is_primary', mmp.is_primary,
                        'source', mmp.source,
                        'is_deleted',mmp.is_deleted,
                        'is_locked',mmp.is_locked
                    )
                )
            ) AS attributes,
            BOOL_OR(mmp.is_locked) AS is_locked
        FROM
            visual_line_planning.multi_mapped_products mmp
        JOIN
            visual_line_planning.line_plan_products lpp ON mmp.line_plan_product_list_id = lpp.line_plan_product_list_id
        WHERE
            lpp.line_plan_id = p_line_plan_id
            AND mmp.is_deleted = false
        GROUP BY
            mmp.line_plan_product_list_id
    ),
    comment_counts AS (
        SELECT
            pc.product_id,
            COUNT(DISTINCT pc.id) AS total_comments
        FROM
            visual_line_planning.presentation_comments pc
            INNER JOIN global.user_master um ON pc.user_id = um.user_code
            INNER JOIN global.user_access_hierarchy_mapping uahm ON um.user_code = uahm.user_code
            INNER JOIN global.acl_master am ON uahm.acl_code = am.acl_code AND am.application_code = 200
        WHERE
            pc.product_id IN (
                SELECT lpp2.line_plan_product_list_id 
                FROM visual_line_planning.line_plan_products lpp2 
                WHERE lpp2.line_plan_id = p_line_plan_id
            )
			AND pc.parent_comment_id is null
            AND am.role_code = 30
            AND um.is_deleted = false
        GROUP BY
            pc.product_id
    )
    SELECT 
        lpp.line_plan_product_list_id,
        lpp.air::integer,
        lpp.aps::numeric,
        lpp.auc::integer,
        lpp.aur::numeric,
        lpp.bop::integer,
        lpp.buy_dollar::numeric,
        lpp.buy_unit::integer,
        COALESCE(ARRAY_LENGTH(lpp.buyer_emails, 1), 0)::integer AS buyer_email_count,
        lpp.exit_date,
        lpp.gm_dollars::numeric,
        lpp.gm_percent::numeric,
        lpp.launch_date,
        COALESCE(lpp.product_status, '')::varchar AS product_status,
        lpp.receipt_u::integer,
        lpp.regweeks::integer,
        lpp.sales_dollars::numeric,
        lpp.sales_u::integer,
        lpp.st_percent::numeric,
        lpp.store_count::integer,
        COALESCE(va.attributes, '[]'::jsonb) AS product_attribute_list,
        COALESCE(lpp.a0_name, '') AS a0_name,
        COALESCE(lpp.a1_name, '') AS a1_name,
        COALESCE(lpp.a2_name, '') AS a2_name,
        COALESCE(lpp.image_url, '') AS image_url,
        lpp.product_id,
        lpp.plm_id,
        lpp.design_system_id,
        lpp.placeholder_id,
        COALESCE(acv.additional_values, '{}'::jsonb) AS additional_columns,
        COALESCE(cc.total_comments, 0)::integer AS comment_count,
        COALESCE(va.is_locked, false) AS is_locked
    FROM 
        visual_line_planning.line_plan_products lpp
    LEFT JOIN 
        variant_attributes va ON lpp.line_plan_product_list_id = va.line_plan_product_list_id
    LEFT JOIN
        visual_line_planning.additional_columns_values acv ON lpp.line_plan_product_list_id = acv.lpp_id
    LEFT JOIN
        comment_counts cc ON lpp.line_plan_product_list_id = cc.product_id
    WHERE
        lpp.line_plan_id = p_line_plan_id
    ORDER BY lpp.product_id, lpp.placeholder_id;
END;

$function$
;