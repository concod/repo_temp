--liquibase formatted sql
--changeset rajesh.kumar:MTP-119351-fix runOnChange:true stripComments:false splitStatements:false context:MTP-119351-fix labels:MTP-119351-fix
--comment: MTP-119351-fix
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.sku_dc_allocated_units(_allocation_code character varying, _articles character varying[]);

CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_allocated_units(_allocation_code character varying, _articles character varying[] DEFAULT '{}'::character varying[])
 RETURNS TABLE(allocation_code character varying, article character varying, dc_code integer, pack_type_id text, channel character varying, size text, quantity double precision, eaches_allocated double precision, packs_allocated double precision, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE 
	_query_combine text;
	_article_list varchar[];
     _refresh_date_value timestamp;
BEGIN
    -- Non-empty _articles prioritised; else load from plan when allocation_code is set; else empty array.
    IF _articles IS NOT NULL AND _articles <> '{}'::varchar[] THEN
        _article_list := _articles;
    ELSIF _allocation_code IS NOT NULL AND btrim(_allocation_code) <> '' THEN
        EXECUTE
            'SELECT attribute_value::varchar[] '
            || 'FROM inventory_smart.plan_attributes pa '
            || 'WHERE plan_code = ' || quote_literal(_allocation_code) || ' '
            || '  AND attribute_name = ''article'''
        INTO _article_list;
        IF _article_list IS NULL THEN
            _article_list := '{}'::varchar[];
        END IF;
    ELSE
        _article_list := '{}'::varchar[];
    END IF;

    -- Fetch refresh date once into a variable
    EXECUTE 'SELECT (((da.attribute_value -> ''value''::text) ->> ''dc_refresh_date''::text)::date AT TIME ZONE ''EST'')::timestamp AT TIME ZONE ''EST''
             FROM global.default_attributes da
             WHERE da.attribute_type::text = ''dashboard_date_ticker''::text'
    INTO _refresh_date_value;
    RAISE NOTICE 'refresh date value: %', _refresh_date_value;

    RAISE NOTICE 'article list: %', _article_list;
    --    RETURN QUERY
        _query_combine := $$WITH input_display_articles AS (
            SELECT DISTINCT 
                split_part(article, '_', -1) as display_article,
                article as input_article
            FROM unnest($$ || quote_literal(_article_list) || $$::varchar[]) as article
        ),
        ph_articles AS MATERIALIZED(
            SELECT DISTINCT pm.article, pm.display_article, ida.input_article
            FROM inventory_smart.ph_master pm
            JOIN input_display_articles ida ON pm.display_article = ida.display_article
        ),
        allocation AS (
         SELECT y.allocation_code,
            y.article,
            y.input_article,
            y.display_article,
            y.dc_code::integer AS dc_code,
            y.pack_type_id,
            y.channel,
            y.retail_size_cd::text AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.retail_size_cd,
                    x.input_article,
                    x.display_article,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( SELECT carfs.allocation_code,
                            carfs.article,
                            carfs.retail_size_cd,
                            ph.display_article,
                            ph.input_article,
                            saf.channel,
                            saf.store_code,
                            js.items AS dc_code,
                            js.value AS inventory_data,
                            MAX(
    						CASE
     							 WHEN carfs.article = ph.input_article THEN carfs.updated_at
     							 ELSE NULL
   							 END
 							 ) AS updated_at
                           FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                             CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                             JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                             JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
                             JOIN ph_articles ph ON carfs.article = ph.article
                                WHERE carfs.created_at BETWEEN $$ || quote_literal(_refresh_date_value) || $$ AND (date(now() AT TIME ZONE 'America/Los_Angeles')::timestamp AT TIME ZONE 'America/Los_Angeles' + '23:59:59'::interval) AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.source::text = 'dc'::text
                          GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, ph.display_article, ph.input_article, saf.channel, saf.store_code, js.items, js.value) x
                  GROUP BY x.allocation_code, x.article, x.retail_size_cd, x.input_article, x.display_article, x.dc_code, x.channel, x.store_code, x.updated_at, (unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[])), (unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]))) y
          GROUP BY y.allocation_code, y.article, y.retail_size_cd,y.input_article, y.display_article, (y.dc_code::integer), y.pack_type_id, y.channel, y.updated_at
        ), packs AS (
         SELECT allocation.allocation_code,
            dpc.article,
            allocation.input_article,
            allocation.display_article,
            allocation.dc_code,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (pack_type_id, article, size)
             WHERE dpc.pack_type='packs'
        )
 SELECT allocation.allocation_code,
    allocation.input_article as article,
    allocation.dc_code,
    allocation.pack_type_id,
    allocation.channel,
    allocation.size,
    sum(allocation.quantity) as quantity,
    sum(allocation.quantity) as eaches_allocated,
    0 AS packs_allocated,
    max(allocation.updated_at) as updated_at
   FROM allocation
   JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
  WHERE NOT ((allocation.allocation_code::text, allocation.pack_type_id) IN ( SELECT packs.allocation_code,
            packs.pack_type_id
           FROM packs))
  GROUP BY allocation.allocation_code, allocation.input_article, allocation.dc_code, allocation.pack_type_id, allocation.channel, allocation.size
UNION
 SELECT packs.allocation_code,
    packs.input_article as article,
    packs.dc_code,
    packs.pack_type_id,
    packs.channel,
    packs.size,
    sum(packs.quantity) as quantity,
    0 AS eaches_allocated,
    sum(packs.packs_allocated) as packs_allocated,
    max(packs.updated_at) as updated_at
   FROM packs
  GROUP BY packs.allocation_code, packs.input_article, packs.dc_code, packs.pack_type_id, packs.channel, packs.size;$$;
    raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$
;