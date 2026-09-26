
--liquibase formatted sql
--changeset liquibase:sku_dc_available_units runOnChange:true stripComments:false splitStatements:false context:MTP-62087 labels:MTP-62087
--comment: MTP-62087
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_dc_available_units(text[], text[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_available_units(product_codes text[], articles text[])
 RETURNS TABLE(article character varying, product_code character varying, size character varying, oh integer, it integer, oo integer, channel character varying, dc_code integer, units_in_pack integer, type text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_combine text;
    _product_code_filter text := '';
    _article_filter text := '';
    _articles text[] := $2;
BEGIN
    IF cardinality($1) > 0 THEN
        _product_code_filter := 'AND paf.product_code = ANY($1)';
    END IF;
    IF cardinality($2) > 0 then
         RAISE NOTICE '%s',$2;
        _article_filter :=  format($$ AND paf.article = ANY('%s')$$, $2);
--       _article_filter :=   ' AND paf.article in (''' || array_to_string(_articles, ',') || ''')';
    END IF;
    _query_combine = $$
        SELECT 
            paf.article,
            delta.product_code,
            paf.size,
            delta.oh,
            delta.it,
            delta.oo,
            saf.channel,
            dc.dc_code,
            1,
            'E'::text
        FROM inventory_smart.latest_inventory_delta delta
        JOIN global.distribution_centres dc ON delta.store_code::text = dc.linked_store_code::text
        JOIN global.store_attributes_filter saf ON delta.store_code::text = saf.store_code ::text
        JOIN global.product_attributes_filter paf ON delta.product_code::text = paf.product_code::text
        WHERE TRUE
        %1$s
        %2$s
    $$;

    RAISE NOTICE '%s',FORMAT(_query_combine, _product_code_filter, _article_filter);

    RETURN QUERY EXECUTE FORMAT(_query_combine, _product_code_filter, _article_filter) USING $1, $2;

END;
$function$
;
