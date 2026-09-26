--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-55724 labels:MTP-55724
--comment: MTP-55724
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_dc_reserved_units(text[], text[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_reserved_units(product_codes text[], articles text[])
 RETURNS TABLE(article character varying, product_code character varying, size character varying, channel character varying, dc_code integer, type character varying, quantity integer)
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
        SELECT 
            paf.article,
            drq.product_code,
            paf.size,
            drq.channel,
            drq.dc_code,
            drq.type,
            SUM(drq.quantity)::int AS quantity
        FROM inventory_smart.dc_reserve_quantity drq
        JOIN global.product_attributes_filter paf USING (product_code)
        WHERE TRUE
        %1$s
        %2$s
        GROUP BY drq.product_code, paf.article, paf.size, drq.dc_code, drq.type, drq.channel
    $$;

    RAISE NOTICE '%s',FORMAT(_query_combine, _product_code_filter, _article_filter);

    RETURN QUERY EXECUTE FORMAT(_query_combine, _product_code_filter, _article_filter) USING $1, $2;

END;
$function$
;
