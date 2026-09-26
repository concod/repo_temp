--liquibase formatted sql
--changeset rajesh:sku_dc_available_units_3 runOnChange:true stripComments:false splitStatements:false context:MTP-101693 labels:MTP-101693
--comment: MTP-101693 Function version of sku_dc_available_units_3 that filters by a list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.sku_dc_available_units( _articles character varying[]);

CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_available_units(_articles character varying[] DEFAULT '{}'::character varying[])
 RETURNS TABLE(article text, product_code text, pack_type_id text, pack_description text, size text, oh double precision, it double precision, oo double precision, channel text, dc_code integer, units_in_pack double precision, oh_packs real, oo_packs real, it_packs real, pack_type text, type text)
 LANGUAGE plpgsql
AS $function$
DECLARE 
	_query_combine text;
BEGIN
  RAISE NOTICE 'article list: %', _articles;
  _query_combine := $$WITH input_articles AS (
    SELECT DISTINCT unnest($$ || quote_literal(_articles) || $$::varchar[]) AS article
  )
  SELECT
    dpi.article::text AS article,
    dpc.product_code::text AS product_code,
    dpi.pack_type_id::text AS pack_type_id,
    dpc.pack_description::text AS pack_description,
    dpc.size::text AS size,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oh_pack_qty, 0::real) AS oh,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.it_pack_qty, 0::real) AS it,
    COALESCE(dpc.units_in_pack, 1::double precision) * COALESCE(dpi.oo_pack_qty, 0::real) AS oo,
    dpi.channel::text AS channel,
    dpi.dc_code,
    dpc.units_in_pack,
    dpi.oh_pack_qty AS oh_packs,
    dpi.oo_pack_qty AS oo_packs,
    dpi.it_pack_qty AS it_packs,
    dpc.pack_type::text AS pack_type,
    'S'::text AS type
  FROM inventory_smart.dc_pack_inventory dpi
  FULL JOIN inventory_smart.dc_pack_configuration dpc
    USING (pack_type_id, article, pack_type, product_code)
  JOIN input_articles ia USING (article);$$;
  raise notice 'query combine: %', _query_combine;
  RETURN QUERY execute _query_combine;
END;
$function$
;