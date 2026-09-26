--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:get_all_skus stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit_1
--comment: initial changeset for get_all_skus
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_all_skus(where_clause text, meta_filter jsonb);
CREATE OR REPLACE FUNCTION item_smart.get_all_skus(where_clause text, meta_filter jsonb)
 RETURNS TABLE(
    "sku" TEXT,
    "product_description" TEXT,
    "brand" TEXT,
    "department" TEXT,
    "sub_department" TEXT,
    "class" TEXT,
    "family" TEXT,
    "parent" TEXT,
    "entry_date" DATE,
    "exit_date" DATE,
    "mapped_product_code" TEXT,
    "mapped_product_description" TEXT,
    "hierarchy_code" INTEGER,
    "product_code" TEXT,
    "product_name" TEXT,
    "item" TEXT,
    "product_type" TEXT,
    "price" NUMERIC,
    "cost" NUMERIC,
    "is_mapped" BOOLEAN,
    "is_cadence_generated" BOOLEAN,
    "sku_status" TEXT,
    "source_table" TEXT,
    "created_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "color" VARCHAR,
    "size" VARCHAR,
    "shape" VARCHAR,
    "light_type" VARCHAR,
    "size_set_pack" VARCHAR,
    "print_catalog" VARCHAR,
    "drop_ship" VARCHAR,
    "vendor" VARCHAR,
    "country_of_origin" VARCHAR,
    "lifecycle" VARCHAR,
    "attributes" JSONB
)
 LANGUAGE plpgsql
AS $function$
DECLARE
    final_sql text;
    query_table_filters text := '';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    cleaned_where_clause text;
BEGIN
    -- Handle meta_filter
    IF meta_filter IS NOT NULL THEN
        query_table_filters := global.form_table_query(meta_filter);
    END IF;

    -- Clean the where_clause to remove any leading "WHERE" keyword
    IF where_clause IS NOT NULL AND where_clause != '' THEN
        cleaned_where_clause := trim(where_clause);
        -- Remove leading "WHERE" keyword (case insensitive)
        IF lower(left(cleaned_where_clause, 5)) = 'where' THEN
            cleaned_where_clause := trim(substring(cleaned_where_clause from 6));
        END IF;
    END IF;

    -- Build the final query by combining base SKU data with provided filters and ordering
    final_sql := format(
        'WITH base_query AS (
        SELECT
            sku,
            product_description,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            entry_date,
            exit_date,
            mapped_sku,
            mapped_product_description,
            hierarchy_code,
            product_code,
            product_name,
            item,
            product_type,
            price,
            cost,
            is_mapped,
            is_cadence_generated,
            CASE
                WHEN is_cadence_generated = true AND is_mapped = true THEN ''Copied to WP''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND (is_mapped = false OR is_mapped IS NULL) THEN ''Unmapped''
                WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                    AND is_mapped = true THEN ''Mapped''
            END as "sku_status",
            source_table as "source_table",
            created_at as "created_at",
            updated_at as "updated_at",
            created_by as "created_by",
            updated_by as "updated_by",
            color::varchar as "color",
            size::varchar as "size",
            shape::varchar as "shape",
            light_type::varchar as "light_type",
            size_set_pack::varchar as "size_set_pack",
            print_catalog::varchar as "print_catalog",
            drop_ship::varchar as "drop_ship",
            vendor::varchar as "vendor",
            country_of_origin::varchar as "country_of_origin",
            lifecycle::varchar as "lifecycle",
            jsonb_build_object(
                ''Color'', color,
                ''Size'', size,
                ''Shape'', shape,
                ''Light Type'', light_type,
                ''Set/Each'', size_set_pack,
                ''Catalog'', print_catalog,
                ''Dropship'', drop_ship,
                ''Vendor'', vendor,
                ''Country of Origin'', country_of_origin,
                ''Lifecycle'', lifecycle
            ) as attributes
        FROM item_smart.all_skus
        )
        SELECT 
            sku as "sku",
            product_description as "product_description",
            l0_name as "brand",
            l1_name as "department",
            l2_name as "sub_department",
            l3_name as "class",
            l4_name as "family",
            l5_name as "parent",
            entry_date as "entry_date",
            exit_date as "exit_date",
            mapped_sku as "mapped_product_code",
            mapped_product_description as "mapped_product_description",
            hierarchy_code as "hierarchy_code",
            product_code as "product_code",
            product_name as "product_name",
            item as "item",
            product_type as "product_type",
            price as "price",
            cost as "cost",
            is_mapped as "is_mapped",
            is_cadence_generated as "is_cadence_generated",
            sku_status as "sku_status",
            source_table as "source_table",
            created_at as "created_at",
            updated_at as "updated_at",
            created_by as "created_by",
            updated_by as "updated_by",
            color as "color",
            size as "size",
            shape as "shape",
            light_type as "light_type",
            size_set_pack as "size_set_pack",
            print_catalog as "print_catalog",
            drop_ship as "drop_ship",
            vendor as "vendor",
            country_of_origin as "country_of_origin",
            lifecycle as "lifecycle",
            attributes as "attributes"
        FROM base_query
        WHERE 1=1 %s %s
        ORDER BY updated_at DESC',
        CASE
            WHEN cleaned_where_clause IS NULL OR cleaned_where_clause = '' THEN ''
            ELSE 'AND ' || cleaned_where_clause
        END,
        COALESCE(query_table_filters, '')
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.get_all_skus', 'before returning final_sql', final_sql, jsonb_build_object('where_clause',$1, 'meta_filter',$2));

    -- Execute the query
    RETURN QUERY EXECUTE final_sql;
END;
$function$
; 