--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:get_new_skus_updated stripComments:false runOnChange:true splitStatements:false context:query_updated labels:MTP-116119
--comment: initial changeset for get_new_skus_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_skus(where_clause text, meta_filter jsonb);
CREATE OR REPLACE FUNCTION item_smart.get_new_skus(where_clause text, meta_filter jsonb)
 RETURNS TABLE(product_code character varying, product_name text, product_type text, l1_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, super_style_color_code character varying, added_construction character varying, back_type character varying, back_type_name character varying, breathability character varying, bust_type character varying, bust_type_name character varying, closure_type text, closure_type_name text, color character varying, coverage_bra character varying, coverage_bra_name character varying, department character varying, end_use character varying, fabric_feel character varying, fabric_stretch character varying, fabric_weight character varying, fit character varying, fit_name character varying, height character varying, height_name character varying, impact_level character varying, impact_level_name character varying, inseam character varying, inseam_name character varying, l0_name character varying, length_description character varying, length_description_name character varying, lining_bra character varying, lining_bra_name character varying, longline_bra character varying, neckline character varying, neckline_name character varying, original_price double precision, pocket_quantity character varying, price double precision, product_bucket_code bigint, product_description text, product_details_en_us text, product_lifecycle character varying, receipt_date date, replenishment_flag character varying, shapewear_wear_with character varying, sheerness character varying, sheerness_name character varying, silhouette character varying, silhouette_name character varying, sleeve_length character varying, sleeve_length_name character varying, special_features character varying, strap_type character varying, strap_type_name character varying, sweat_wicking character varying, target_area character varying, wash character varying, wash_name character varying, is_cadence_generated boolean, is_mapped boolean, mapped_product_code_description character varying, mapped_product_code character varying, hierarchy_code integer, launch_date date, exit_date date, updated_at timestamp without time zone, sku_status text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_sql text;
    query_table_filters text := '';
BEGIN
    -- Handle meta_filter
    IF meta_filter IS NOT NULL THEN
        query_table_filters := global.form_table_query(meta_filter);
    END IF;

    -- Build the final query
    final_sql := format(
        'SELECT * FROM (
        SELECT
            product_code,
            item_description as product_name,
            product_type,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            super_style_color_code,
            added_construction,
            back_type,
            back_type_name,
            breathability,
            bust_type,
            bust_type_name,
            closure_type,
            closure_type_name,
            color,
            coverage_bra,
            coverage_bra_name,
            department,
            end_use,
            fabric_feel,
            fabric_stretch,
            fabric_weight,
            fit,
            fit_name,
            height,
            height_name,
            impact_level,
            impact_level_name,
            inseam,
            inseam_name,
            l0_name,
            length_description,
            length_description_name,
            lining_bra,
            lining_bra_name,
            longline_bra,
            neckline,
            neckline_name,
            original_price,
            pocket_quantity,
            price,
            product_bucket_code,
            product_description,
            product_details_en_us,
            product_lifecycle,
            receipt_date,
            replenishment_flag,
            shapewear_wear_with,
            sheerness,
            sheerness_name,
            silhouette,
            silhouette_name,
            sleeve_length,
            sleeve_length_name,
            special_features,
            strap_type,
            strap_type_name,
            sweat_wicking,
            target_area,
            wash,
            wash_name,
            is_cadence_generated,
            is_mapped,
            mapped_product_code_description,
            mapped_product_code,
            hierarchy_code,
            launch_date,
            exit_date,
			updated_at::timestamp,
            CASE
                WHEN is_cadence_generated = true AND is_mapped = true THEN ''Copied to WP''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND (is_mapped = false OR is_mapped IS NULL) THEN ''Unmapped''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND is_mapped = true THEN ''Mapped''
            END as sku_status
        FROM item_smart.new_skus
        %s
        ORDER BY updated_at DESC
        ) AS x %s',
        CASE
            WHEN where_clause IS NULL OR where_clause = '' THEN ''
            ELSE where_clause
        END,
        COALESCE(query_table_filters, '')
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- Execute the query
    RETURN QUERY EXECUTE final_sql;
END;
$function$
;