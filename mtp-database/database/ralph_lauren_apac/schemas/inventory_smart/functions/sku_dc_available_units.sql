
--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-29953 labels:MTP-19659
--comment: removed delta inventory dependency
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_dc_available_units(text[], text[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_available_units(product_codes text[], articles text[])
    RETURNS TABLE (
        article varchar,
        product_code varchar,
        pack_type_id varchar,
        size varchar,
        oh int,
        it int,
        oo int,
        channel varchar,
        dc_code int,
        units_in_pack int,
        oh_eaches int,
        oh_packs int,
        type text
 )
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text;
    _product_code_filter text := '';
    _article_filter text := '';
    _product_code_filter_dpi text := '';
    _article_filter_dpi text := '';
BEGIN
    IF cardinality($1) > 0 THEN
        _product_code_filter = 'AND paf.product_code = ANY($1)';
        _product_code_filter_dpi = 'AND dpi.product_code = ANY($1)';
    END IF;
    IF cardinality($2) > 0 THEN
        _article_filter = 'AND paf.article = ANY($2)';
        _article_filter_dpi = 'AND dpi.article = ANY($2)';
    END IF;
    _query_combine = $$
        SELECT
            paf.article,
            li.product_code,
            paf.size as pack_type_id,
            paf.size,
            li.oh,
            li.it,
            li.oo,
            li.channel,
            dc.dc_code,
            1,
            li.oh AS oh_eaches,
            0 AS oh_packs,
            'E'::text
        FROM inventory_smart.latest_inventory li
        JOIN global.distribution_centres dc ON li.store_code::integer = dc.linked_store_code::integer
        JOIN global.product_attributes_filter paf USING (product_code)
        WHERE NOT EXISTS (
                SELECT 1
                FROM inventory_smart.latest_inventory_delta delta
                JOIN global.distribution_centres dc_1 ON dc_1.name::integer = delta.store_code::integer
                WHERE delta.product_code::bigint = li.product_code::bigint AND dc_1.linked_store_code::text = li.store_code::text
            )
        %1$s
        %2$s
        UNION
        SELECT dpi.article,
            dpi.product_code,
            dpi.pack_type_id,
            dpc.size,
            COALESCE(dpi.oh_pack_qty, 0) AS oh,
            COALESCE(dpi.it_pack_qty, 0) AS it,
            COALESCE(dpi.oo_pack_qty, 0) AS oo,
            dpi.channel,
            dpi.dc_code,
            dpc.units_in_pack,
            0 AS oh_eaches,
            COALESCE(dpi.oh_pack_qty/dpc.units_in_pack, 0) AS oh_packs,
            'S'::text AS type
        FROM inventory_smart.dc_pack_inventory dpi
            FULL JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size, pack_type)
        WHERE dpi.pack_type::text = 'packs'::text
        %3$s
        %4$s
    $$;

    RAISE NOTICE '%s',FORMAT(_query_combine, _product_code_filter, _article_filter, _product_code_filter_dpi, _article_filter_dpi);

    RETURN QUERY EXECUTE FORMAT(_query_combine, _product_code_filter, _article_filter, _product_code_filter_dpi, _article_filter_dpi) USING $1, $2, $3, $4;

END;
$function$
;