-- liquibase formatted sql
-- changeset liquibase:Hierarchy_mapping_changes_fix_for_ticketdescription1 runOnChange:true stripComments:false splitStatements:false context:MTP-121978 labels:Hierarchy_mapping_changes_fix_for_ticketdescription1
-- comment: tenant_hierarchy_mapping procedure fix for ticketdescription1
drop procedure if exists global.tenant_hierarchy_mapping();
-- Create the new procedure

CREATE OR REPLACE PROCEDURE global.tenant_hierarchy_mapping()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _log_code VARCHAR := gen_random_uuid();
    _sp_name  VARCHAR := 'global.tenant_hierarchy_mapping';
    _log_step VARCHAR;
    _st TIMESTAMP := clock_timestamp();
    result RECORD;
BEGIN
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::TEXT,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, TRUE);
    PERFORM set_config('local.sp_name', _sp_name, TRUE);

    BEGIN
        DELETE FROM global.tenant_hierarchy_mapping;

        FOR result IN
            WITH raw_data AS (
                SELECT COALESCE(p.l1_name, 'OTHERS') AS l1_name
                FROM global.product_attributes_filter p
                GROUP BY 1
            ),
            d AS (
                SELECT
                    *,
                    ROW_NUMBER() OVER () - 1 AS hierarchy_level_id
                FROM raw_data
            ),
            base_data AS (
                SELECT
                    d.hierarchy_level_id,
                    c.attribute_type,
                    c.attribute_value,
                    2 AS application_code,
                    FALSE AS is_active,
                    c.description
                FROM d
                CROSS JOIN (
                    VALUES
                        ('productgroupdescription', 'FALSE', 'product_indicator'),
                        ('subclassdescription', 'FALSE', 'product_indicator'),
                        ('collection', 'FALSE', 'product_indicator'),
                        ('color_name', 'FALSE', 'product_indicator'),
                        ('gender', 'FALSE', 'product_indicator'),
                        ('size_name', 'FALSE', 'product_indicator'),
                        ('metalcolor', 'FALSE', 'product_indicator'),
                        ('dial', 'FALSE', 'product_indicator'),
                        ('logosilhouette', 'FALSE', 'product_indicator'),
                        ('subcollection', 'FALSE', 'product_indicator'),
                        ('movementtype', 'FALSE', 'product_indicator'),
                        ('ticketdescription1', 'FALSE', 'product_indicator'),
                        ('style_id', 'FALSE', 'product_indicator'),
                        ('unit_receipts', 'TRUE', 'performance_indicator'),
                        ('sales_units', 'TRUE', 'performance_indicator'),
                        ('GMROI', 'TRUE', 'performance_indicator'),
                        ('sales_retail', 'TRUE', 'performance_indicator'),
                        ('margin', 'TRUE', 'performance_indicator'),
                        ('margin_perc', 'TRUE', 'performance_indicator'),
                        ('AUR', 'TRUE', 'performance_indicator'),
                        ('vesselclass', 'TRUE', 'store_indicator'),
                        ('productstoretype', 'TRUE', 'store_indicator'),
                        ('s1_name', 'TRUE', 'store_indicator')
                ) AS c(attribute_type, attribute_value, description)
            ),
            final_data AS (
                SELECT
                    b.hierarchy_level_id,
                    b.attribute_type,
                    b.attribute_value,
                    b.application_code,
                    CASE
                        WHEN b.attribute_type = 'productgroupdescription'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Fashion Jewelry%',
                                 '%Fine Jewelry%',
                                 '%Luxury Division%',
                                 '%Promo and Fashion Accessories%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'subclassdescription'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Fashion Jewelry%',
                                 '%Promo and Fashion Accessories%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'collection'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Apparel Soft Logo%',
                                 '%Fashion Jewelry%',
                                 '%Fine Jewelry%',
                                 '%Hard Logo & Toys%',
                                 '%Itinerary Gifts & Apparel%',
                                 '%Jewelry & Watch Luxury Brands%',
                                 '%Kids & Family%',
                                 '%Liquor%',
                                 '%Luxury Division%',
                                 '%Promo and Fashion Accessories%',
                                 '%STB Hong Kong%',
                                 '%Watches%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'color_name'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Jewelry & Watch Luxury Brands%',
                                 '%STB Hong Kong%',
                                 '%Watches%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'gender'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Jewelry & Watch Luxury Brands%',
                                 '%STB Hong Kong%',
                                 '%Watches%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'size_name'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%STB Hong Kong%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'metalcolor'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%STB Hong Kong%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'dial'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%STB Hong Kong%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'style_id'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%STB Hong Kong%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'logosilhouette'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Apparel Soft Logo%',
                                 '%Hard Logo & Toys%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'subcollection'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Apparel Soft Logo%',
                                 '%Hard Logo & Toys%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'movementtype'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Jewelry & Watch Luxury Brands%',
                                 '%STB Hong Kong%',
                                 '%Watches%'
                             ]) THEN TRUE

                        WHEN b.attribute_type = 'ticketdescription1'
                             AND d.l1_name NOT ILIKE ANY (ARRAY[
                                 '%Fine Jewelry%',
                                 '%Itinerary Gifts & Apparel%',
                                 '%Luxury Division%',
                                 '%STB Hong Kong%'
                             ]) THEN TRUE

                        WHEN b.attribute_type IN (
                            'unit_receipts','sales_units','GMROI','sales_retail',
                            'margin','margin_perc','AUR',
                            'vesselclass','productstoretype','s1_name'
                        ) THEN TRUE

                        ELSE b.attribute_value::BOOLEAN
                    END AS is_active,
                    CASE
                        WHEN b.attribute_type IN (
                            'productgroupdescription','subclassdescription','collection',
                            'color_name','gender','size_name','metalcolor',
                            'dial','logosilhouette','subcollection',
                            'movementtype','ticketdescription1'
                        ) THEN 'product_indicator'
                        WHEN b.attribute_type IN (
                            'unit_receipts','sales_units','GMROI','sales_retail',
                            'margin','margin_perc','AUR'
                        ) THEN 'performance_indicator'
                        WHEN b.attribute_type IN (
                            'vesselclass','productstoretype','s1_name'
                        ) THEN 'store_indicator'
                        ELSE b.description
                    END AS description
                FROM base_data b
                LEFT JOIN d USING (hierarchy_level_id)
            )
            SELECT * FROM final_data
        LOOP
            INSERT INTO global.tenant_hierarchy_mapping (
                hierarchy_level_id,
                attribute_type,
                attribute_value,
                application_code,
                is_active,
                description
            )
            VALUES (
                result.hierarchy_level_id,
                result.attribute_type,
                result.attribute_value,
                result.application_code,
                result.is_active,
                result.description
            );
        END LOOP;

        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::TEXT,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::TEXT,
                NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END;
$procedure$
;