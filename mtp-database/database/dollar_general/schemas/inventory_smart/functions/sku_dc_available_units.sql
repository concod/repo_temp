--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-40575
--comment: MTP-40575
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_dc_available_units(_text, _text);
CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_available_units(product_codes text[], articles text[])
 RETURNS TABLE(article character varying, product_code character varying, size character varying, oh integer, it integer, oo integer, channel character varying, dc_code integer, units_in_pack integer, type text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text;
    _product_code_filter text := '';
    _article_filter text := '';
BEGIN
    IF cardinality($1) > 0 THEN
        _product_code_filter = 'AND paf.product_code = ANY($1)';
    END IF;
    IF cardinality($2) > 0 THEN
        _article_filter = 'AND paf.article = ANY($2)';
    END IF;
    _query_combine = $$
--        SELECT 
--            paf.article,
--            delta.product_code,
--            paf.size,
--            delta.oh,
--            delta.it,
--            delta.oo,
--            saf.channel,
--            dc.dc_code,
--            1,
--            'E'::text
--        FROM inventory_smart.latest_inventory_delta delta
--        JOIN global.distribution_centres dc ON delta.store_code::integer = dc.name::integer
--        JOIN global.store_attributes_filter saf ON delta.store_code::integer = saf.store_code::integer
--        JOIN global.product_attributes_filter paf ON delta.product_code::text = paf.product_code::text
--        WHERE TRUE
--        %1$s
--        %2$s
--        UNION
        SELECT
            paf.article,
            li.product_code,
            paf.size,
            li.oh,
            li.it,
            li.oo,
            li.channel,
            dc.dc_code,
            1,
            'E'::text
        FROM inventory_smart.latest_inventory li
        JOIN global.distribution_centres dc ON li.store_code::integer = dc.linked_store_code::integer
        JOIN global.product_attributes_filter paf USING (product_code)
        WHERE NOT EXISTS (
                SELECT 1
                FROM inventory_smart.latest_inventory_delta delta
                JOIN global.distribution_centres dc_1 ON dc_1.name::integer = delta.store_code::integer
                WHERE delta.product_code::text = li.product_code::text AND dc_1.linked_store_code::text = li.store_code::text
            )
        %1$s
        %2$s
    $$;

    RAISE NOTICE '%s',FORMAT(_query_combine, _product_code_filter, _article_filter);

    RETURN QUERY EXECUTE FORMAT(_query_combine, _product_code_filter, _article_filter) USING $1, $2;

END;
$function$
;
