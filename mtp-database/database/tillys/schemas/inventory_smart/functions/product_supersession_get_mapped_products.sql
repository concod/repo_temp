--liquibase formatted sql
--changeset liquibase:product_supersession_get_mapped_products runOnChange:true stripComments:false splitStatements:false context:MTP-125205 labels:MTP-125205
--comment: Create product supersession mapping function for Tillys client
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_get_mapped_products(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_get_mapped_products(input refcursor, product_filter jsonb, meta_filter jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_get_mapped_products_sql text := '';
    v_pa_sql text := '';
    v_meta_cls text := ''; 
    v_product_filter jsonb := NULL;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    v_product_filter := $2->0;
    IF $3 <> '{}' THEN 
        v_meta_cls := global.form_table_query($3);
    END IF;                                         

    v_pa_sql := inventory_smart.form_main_table_filters(
        'ph_master',
        v_product_filter
    );

    v_get_mapped_products_sql := '
    WITH base_data AS (
        SELECT
            smt.ps_code                             AS supersession_id,
            smt.article                             AS new_article,
            smt.product_code                        AS new_product_code,
            smt.old_article,
            smt.old_product_code,
            paf.size                                AS new_size,
            COALESCE(smt.priority, 1)               AS priority,
            smt.start_date,
            smt.end_date,
            smt.updated_at                          AS mapped_on,
            smt.updated_by                          AS mapped_by
        FROM
            global.product_attributes_filter paf
        JOIN
            inventory_smart.product_supersession_mapping smt ON paf.product_code = smt.product_code
        '||v_pa_sql||'
    ),
    old_data AS (
        SELECT
            bd.old_product_code,
            paf.style_color_desc                    AS old_style_color_desc,
            paf.department                          AS old_department,
            paf.subdepartment                       AS old_subdepartment,
            paf.class                               AS old_class,
            paf.subclass                            AS old_subclass,
            paf.style                               AS old_style,
            paf.color_id_name                       AS old_color_id_name,
            paf.brand                               AS old_brand,
            paf.vendor                              AS old_vendor,
            paf.size                                AS old_size
        FROM
            base_data bd
        LEFT JOIN
            global.product_attributes_filter paf
        ON
            paf.product_code = bd.old_product_code
    ),
    new_data AS (
        SELECT
            bd.new_product_code,
            paf.style_color_desc                    AS new_style_color_desc,
            paf.department                          AS new_department,
            paf.subdepartment                       AS new_subdepartment,
            paf.class                               AS new_class,
            paf.subclass                            AS new_subclass,
            paf.style                               AS new_style,
            paf.color_id_name                       AS new_color_id_name,
            paf.brand                               AS new_brand,
            paf.vendor                              AS new_vendor
        FROM
            base_data bd
        LEFT JOIN
            global.product_attributes_filter paf
        ON
            paf.product_code = bd.new_product_code
    ),
    aggregated_data AS (
        SELECT
            bd.new_article,
            nd.new_style_color_desc,
            nd.new_department,
            nd.new_subdepartment,
            nd.new_class,
            nd.new_subclass,
            nd.new_style,
            nd.new_color_id_name,
            nd.new_brand,
            nd.new_vendor,
            bd.old_article,
            od.old_style_color_desc,
            od.old_department,
            od.old_subdepartment,
            od.old_class,
            od.old_subclass,
            od.old_style,
            od.old_color_id_name,
            od.old_brand,
            od.old_vendor,
            bd.priority,
            bd.start_date,
            bd.end_date,
            bd.mapped_on,
            bd.mapped_by,
            bd.supersession_id,
            array_agg(DISTINCT bd.new_size)         AS mapped_sizes,
            array_agg(DISTINCT od.old_size)         AS old_sizes,
            array_agg(DISTINCT bd.old_product_code) AS old_product_codes,
            array_agg(DISTINCT bd.new_product_code) AS new_product_codes
        FROM
            base_data bd
        LEFT JOIN old_data od ON bd.old_product_code = od.old_product_code
        LEFT JOIN new_data nd ON bd.new_product_code = nd.new_product_code
        GROUP BY
            1,2,3,4,5,6,7,8,9,10,
            11,12,13,14,15,16,17,18,19,20,
            21,22,23,24,25,26
    )
    SELECT
        old_article                 AS "old_article",
        old_style_color_desc        AS "old_style_color_desc",
        old_department              AS "old_department",
        old_subdepartment           AS "old_subdepartment",
        old_class                   AS "old_class",
        old_subclass                AS "old_subclass",
        old_style                   AS "old_style",
        old_color_id_name           AS "old_color_id_name",
        old_brand                   AS "old_brand",
        old_vendor                  AS "old_vendor",
        new_article                 AS "article",
        new_style_color_desc        AS "new_style_color_desc",
        new_department              AS "new_department",
        new_subdepartment           AS "new_subdepartment",
        new_class                   AS "new_class",
        new_subclass                AS "new_subclass",
        new_style                   AS "new_style",
        new_color_id_name           AS "new_color_id_name",
        new_brand                   AS "new_brand",
        new_vendor                  AS "new_vendor",
        priority,
        mapped_sizes                AS "mapped_sizes",
        start_date                  AS "start_date",
        end_date                    AS "end_date",
        mapped_on                   AS "mapped_on",
        mapped_by                   AS "mapped_by",
        supersession_id,
        old_sizes,
        old_product_codes,
        new_product_codes
    FROM
        aggregated_data
    '||v_meta_cls;

    RAISE NOTICE 'v_get_mapped_products_sql %', v_get_mapped_products_sql;

    OPEN $1 FOR EXECUTE v_get_mapped_products_sql;
    PERFORM global.sp_log(
        v_gen_random_uuid,
        'inventory_smart.product_supersession_get_mapped_products',
        'Before return',
        v_get_mapped_products_sql,
        jsonb_build_object('product_filters', $2, 'meta_filters', $3)
    );
    RETURN $1;
END
$function$;