--liquibase formatted sql
--changeset surya.kuruvadi@impactanalytics.co:list_article_stores runOnChange:true stripComments:false splitStatements:false context:context:MTP-113480 labels:MTP-113480
--comment: MTP-113480  formatted timezone
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.list_article_stores(input refcursor, jsonb, jsonb,jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.list_article_stores(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine TEXT := '';
    _query_pa TEXT := inventory_smart.form_main_table_filters('ph_master', $2);
    _query_sa TEXT := global.form_main_table_filters('store_attributes_query', $3);
    _query_table_filters TEXT := global.form_table_query($4);
BEGIN
    _query_combine := '
        WITH ph AS (
            SELECT 
                article,
                l0_name,
                l1_name,
                l2_name,
                l3_name,
                l4_name,
                style_color_id,
                product_codes,
                product_description,
                model_description,
                supersede_flag,
                channel
            FROM inventory_smart.ph_master
            ' || _query_pa || '
            ORDER BY article
        ),
        saf AS (
            SELECT 
                store_code,
                active,
                channel,
                retail_facility_code
            FROM global.store_attributes_filter
            ' || _query_sa || ' AND active
            ),
        tz AS (
            SELECT TRIM(TEXT(attribute_value->''value''->''time_zone''), ''"'') AS timezone
            FROM "global".tenant_attribute_master 
            WHERE name = ''tenant_time_config''
        ),
        results AS (
            SELECT
                ph.article,
                saf.store_code,
                asg.grade,
                saf.retail_facility_code,
                ph.supersede_flag,
                ph.l0_name, 
                ph.l1_name, 
                ph.l2_name, 
                ph.l3_name, 
                ph.l4_name, 
                ph.style_color_id, 
                ph.product_description,
                ph.model_description,
                MAX(pmps.inv_source_flag)::TEXT AS inv_source_flag,
                CASE
                    WHEN MAX(inv_source_flag) = 1 THEN ''RFID Inv.''
                    WHEN MAX(inv_source_flag) = 0 THEN ''Book Inv.''
                    ELSE NULL
                END AS inv_source,
                um.user_name AS user,
                TO_CHAR(
                    MAX(pmps.updated_at) AT TIME ZONE (
                        SELECT timezone FROM tz
                    ), ''mm-dd-yyyy hh:mi:ss''
                ) AS updated_at,
                ARRAY_AGG(pmps.product_code) AS product_code,
                COALESCE(SUM(li.rfid_inv)::TEXT, ''-'') AS rfid_inv,
                COALESCE(SUM(li.book_inv)::TEXT, ''-'') AS book_inv
                                FROM
                        ph
                        JOIN saf USING (channel)
                        JOIN global.product_mapping_product_store pmps
                            ON pmps.product_code = ANY(ph.product_codes)
                            AND pmps.store_code = saf.store_code
                            AND ph.l0_name = pmps.l0_name
                LEFT JOIN inventory_smart.article_store_grade asg
                ON asg.article = ph.article
                AND asg.store_code = saf.store_code
                            LEFT JOIN "global".user_master um
                ON pmps.updated_by = um.user_code
            LEFT JOIN inventory_smart.latest_inventory li
                ON li.product_code = pmps.product_code
                AND li.store_code = saf.store_code
            GROUP BY 
                ph.article,
                saf.store_code,
                saf.retail_facility_code,
                ph.supersede_flag,
                ph.l0_name, 
                ph.l1_name, 
                ph.l2_name, 
                ph.l3_name, 
                ph.l4_name, 
                ph.style_color_id, 
                ph.product_description,
                ph.model_description,
                um.user_name,
                asg.grade
        )
        SELECT * FROM results ' || _query_table_filters;

    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN $1;
END;
$function$;