--liquibase formatted sql
--changeset shashwat.yadav:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:VS-730 labels:VS-730
--comment: Creating function for sku_dc_reserved_units that accepts list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.sku_dc_reserved_units(varchar);

CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_reserved_units(p_articles_str character varying[] DEFAULT '{}'::character varying[])
RETURNS TABLE (
    l0_name varchar,
    product_code varchar,
    article varchar,
    size varchar,
    dc_code int4,
    type varchar,
    channel varchar,
    quantity int4,
    units_in_pack int4
)
LANGUAGE plpgsql
AS $function$
DECLARE 
	_query_combine text;
	_article_list varchar[];
BEGIN
 	_article_list := p_articles_str;
    _query_combine := $$
    SELECT paf.l0_name,
        pmpd.product_code,
        paf.article,
        paf.size,
        pmpd.dc_code,
        drq.type,
        drq.channel,
        sum(drq.quantity)::int4 AS quantity,
        1::int4 AS units_in_pack
    FROM inventory_smart.dc_reserve_quantity drq
        JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
        JOIN global.product_attributes_filter paf USING (product_code)
    WHERE paf.article = any($$ || quote_literal(_article_list) || $$)
    GROUP BY paf.l0_name, pmpd.product_code, paf.article, paf.size, pmpd.dc_code, drq.type, drq.channel
    
    UNION DISTINCT
    
    SELECT 
        paf.l0_name,
        paf.product_code,
        paf.article,
        paf.size,
        source_dc::int4 AS dc_code,
        'D'::varchar as type,
        saf.channel,
        transfer_units::int4 as quantity,
        1::int4 AS units_in_pack
    FROM inventory_smart.dc_review_recommendation_updated drru
    JOIN global.product_attributes_filter paf USING(product_code)
    JOIN global.distribution_centres dc ON drru.source_dc = dc.dc_code 
    JOIN global.store_attributes_filter saf ON dc.linked_store_code = saf.store_code 
    WHERE drru.status_code = 3 
      AND (drru.updated_at at TIME zone 'America/New_York'::text) >= (now() at TIME zone 'America/New_York'::text) - interval '1 DAY'
      AND paf.article = any($$ || quote_literal(_article_list) || $$)

    UNION DISTINCT

    SELECT 
    paf.l0_name,
    nsr.product_code,
    paf.article,
    paf.size,
    dc.dc_code::int4 as dc_code,
    CASE WHEN nsa.remodel_flag = true THEN 'R'::character varying ELSE 'N'::character varying END AS type,
    'Retail'::text AS channel,
    COALESCE(sum(GREATEST(COALESCE(nsr.approved_qty, 0), COALESCE(nsr.past_releases, 0)) - COALESCE(nsr.past_releases_yest, 0)), 0)::int4 AS quantity,
    1::int4 AS units_in_pack
    FROM global.new_store_reserve nsr
    JOIN global.new_store_attributes nsa ON nsa.store_code::text = nsr.store_code::text
    JOIN global.product_attributes_filter paf ON nsr.product_code::text = paf.product_code::text
    JOIN global.distribution_centres dc ON dc.linked_store_code::text = CASE WHEN upper(paf.l0_id::text) LIKE '%VSB%'::text THEN 'S003'::text ELSE 'S015'::text END
    WHERE nsr.approved = true AND nsa.opening_date > CURRENT_DATE AND nsr.is_deleted = false
    AND paf.article = any($$ || quote_literal(_article_list) || $$)
    GROUP BY paf.l0_name, nsr.product_code, paf.article, paf.size, dc.dc_code, nsa.remodel_flag 
$$;
	raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$;