--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:sp_get_placeholder_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sp_get_placeholder_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sp_get_placeholder_info(where_clause text, meta_filter jsonb);

CREATE OR REPLACE FUNCTION item_smart.sp_get_placeholder_info(where_clause text, meta_filter jsonb)
RETURNS TABLE (
    "placeholder_id" varchar(10),
    "item" VARCHAR,
    "product_code" VARCHAR,
    "product_name" VARCHAR,
    "product_description" VARCHAR,
    "l0_name" VARCHAR,
    "l1_name" VARCHAR,
    "l2_name" VARCHAR,
    "l3_name" VARCHAR,
    "l4_name" VARCHAR,
    "l5_name" VARCHAR,
    "entry_date" DATE,
    "exit_date" DATE,
    "price" DECIMAL(10,2),
    "cost" DECIMAL(10,2),
    "mapped_sku" VARCHAR,
    "mapped_product_description" VARCHAR,
    "hierarchy_code" INTEGER,
    "product_type" VARCHAR,
    "is_cadence_generated" BOOLEAN,
    "is_mapped" BOOLEAN,
    "mapped_product_code" VARCHAR,
    "mapped_product_code_description" VARCHAR,
    "created_at" TIMESTAMP,
    "updated_at" TIMESTAMP,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "sku_status" VARCHAR,
    "color" VARCHAR,
    "size" VARCHAR,
    "tree_shape" VARCHAR,
    "light_type" VARCHAR,
    "size_set_pack" VARCHAR,
    "print_catalog" VARCHAR,
    "drop_ship" VARCHAR,
    "channel_status" VARCHAR,
    "vendor" VARCHAR,
    "country_of_origin" VARCHAR,
    "attributes" JSONB
) 
LANGUAGE plpgsql 
AS $$
DECLARE
    final_sql text;
    query_table_filters text := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    cleaned_where_clause text := '';
BEGIN
    -- Handle meta_filter
    IF meta_filter IS NOT NULL THEN
        query_table_filters := global.form_table_query(meta_filter);
    END IF;

    -- Validate and clean the where_clause
    IF where_clause IS NOT NULL AND where_clause != '' THEN
        cleaned_where_clause := trim(where_clause);
        -- Remove leading "WHERE" keyword (case insensitive)
        IF lower(left(cleaned_where_clause, 5)) = 'where' THEN
            cleaned_where_clause := trim(substring(cleaned_where_clause from 6));
        END IF;
        -- Add AND prefix since query already has WHERE 1=1
        cleaned_where_clause := 'AND ' || cleaned_where_clause;
    END IF;

    -- Build the final query
    final_sql := format(
        'WITH base_query AS (
        SELECT 
            pi.placeholder_id as "placeholder_id",
            pi.item as "item",
            pi.product_code as "product_code",
            pi.product_name as "product_name",
            pi.product_description as "product_description",
            pi.l0_name as "brand",
            pi.l1_name as "department",
            pi.l2_name as "sub_department",
            pi.l3_name as "class",
            pi.l4_name as "family",
            pi.l5_name as "parent",
            pi.entry_date as "entry_date",
            pi.exit_date as "exit_date",
            pi.price as "price",
            pi.cost as "cost",
            pi.mapped_sku as "mapped_sku",
            pi.mapped_product_description as "mapped_product_description",
            pi.hierarchy_code as "hierarchy_code",
            pi.product_type as "product_type",
            pi.is_cadence_generated as "is_cadence_generated",
            pi.is_mapped as "is_mapped",
            pi.mapped_product_code as "mapped_product_code",
            pi.mapped_product_code_description as "mapped_product_code_description",
            pi.created_at as "created_at",
            pi.updated_at as "updated_at",
            pi.created_by as "created_by",
            pi.updated_by as "updated_by",
            CASE
                WHEN pi.is_cadence_generated = true AND pi.is_mapped = true THEN ''Copied to WP''
                WHEN (pi.is_cadence_generated = false OR pi.is_cadence_generated IS NULL)
                    AND (pi.is_mapped = false OR pi.is_mapped IS NULL) THEN ''Unmapped''
                WHEN (pi.is_cadence_generated = false OR pi.is_cadence_generated IS NULL)
                    AND pi.is_mapped = true THEN ''Mapped''
            END::VARCHAR as "sku_status",
            pi.color as "color",
            pi.size as "size",
            pi.tree_shape as "tree_shape",
            pi.light_type as "light_type",
            pi.size_set_pack as "size_set_pack",
            pi.print_catalog as "print_catalog",
            pi.drop_ship as "drop_ship",
            pi.channel_status as "channel_status",
            pi.vendor as "vendor",
            pi.country_of_origin as "country_of_origin",
            jsonb_build_object(
                ''color'', pi.color,
                ''size'', pi.size,
                ''tree_shape'', pi.tree_shape,
                ''light_type'', pi.light_type,
                ''size_set_pack'', pi.size_set_pack,
                ''print_catalog'', pi.print_catalog,
                ''drop_ship'', pi.drop_ship,
                ''channel_status'', pi.channel_status,
                ''vendor'', pi.vendor,
                ''country_of_origin'', pi.country_of_origin,
                ''cost'', pi.cost,
                ''price'', pi.price
            ) as "attributes"
        FROM item_smart.placeholders_info pi
        WHERE 1=1 %s
        )
        SELECT * FROM base_query
        WHERE 1=1 %s
        ORDER BY "updated_at" DESC',
        COALESCE(cleaned_where_clause, ''),
        COALESCE(query_table_filters, '')
    );

    -- Log the query for debugging
    RAISE NOTICE 'Executing query: %', final_sql;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.sp_get_placeholder_info', 'before returning final_sql', final_sql, jsonb_build_object('where_clause',$1, 'meta_filter',$2));

    -- Execute the query with error handling
    BEGIN
        RETURN QUERY EXECUTE final_sql;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error executing query: %. Original where_clause: %. SQL Error: %', final_sql, where_clause, SQLERRM;
    END;
END;
$$;