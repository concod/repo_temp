--liquibase formatted sql
--changeset shashwat.yadav:sku_dc_reserved_units_sp runOnChange:true stripComments:false splitStatements:false context:VS-730 labels:VS-730
--comment: Creating function for sku_dc_reserved_units that accepts list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.sku_dc_reserved_units(varchar);

CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_reserved_units(p_articles_str character varying[] DEFAULT '{}'::character varying[])
 RETURNS TABLE(product_code character varying, article character varying, size character varying, dc_code integer, type character varying, channel character varying, quantity bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE 
	_query_combine text;
	_article_list varchar[];
BEGIN
 	_article_list := p_articles_str;
    _query_combine := 
    $$
    SELECT pmpd.product_code,
        paf.article,
        paf.size,
        pmpd.dc_code,
        drq.type,
        drq.channel,
        sum(drq.quantity) AS quantity
    FROM inventory_smart.dc_reserve_quantity drq
        JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
        JOIN global.product_attributes_filter paf USING (product_code)
    WHERE paf.article = any($$ || quote_literal(_article_list) || $$)
    GROUP BY pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel
    $$;

	raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$
;