--liquibase formatted sql
--changeset liquibase:sku_dc_allocated_units runOnChange:true stripComments:false splitStatements:false context:MTP-82895 labels:MTP-82895
--comment: inital commit for sku_dc_allocated_units
--rollback: SELECT  1

DROP FUNCTION IF EXISTS inventory_smart.sku_dc_allocated_units(character varying, varchar[]);

CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_allocated_units(_allocation_code character varying, _articles character varying[] DEFAULT '{}'::character varying[])
 RETURNS TABLE(allocation_code character varying, article character varying, dc_code integer, pack_type_id text, channel character varying, size text, quantity double precision, eaches_allocated double precision, packs_allocated integer, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE 
	_query_combine text;
	_article_list varchar[];
BEGIN
    IF _allocation_code <> '' AND (_articles = '{}' OR _articles IS NULL) THEN
        EXECUTE 'select attribute_value::varchar[] from inventory_smart.plan_attributes pa where plan_code = ' || quote_literal(_allocation_code) || ' and attribute_name = ''article'';' INTO _article_list;
    ELSEIF (_articles <> '{}' OR _articles IS NOT NULL) AND _allocation_code = '' THEN
        _article_list := _articles;
    END IF;

    RAISE NOTICE 'article list: %', _article_list;
    --    RETURN QUERY
        _query_combine := $$WITH allocation AS (
         SELECT y.allocation_code,
            y.article,
            y.dc_code::integer AS dc_code,
            y.pack_type_id,
            y.channel,
            y.retail_size_cd::text AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity,
            max(y.each_rounding_factor) as each_rounding_factor
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.retail_size_cd,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'pack_rounding_factor'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) as each_rounding_factor
                   FROM ( SELECT carfs.allocation_code,
                            carfs.article,
                            carfs.retail_size_cd,
                            saf.channel,
                            saf.store_code,
                            js.items AS dc_code,
                            js.value AS inventory_data,
                            max(carfs.updated_at) AS updated_at
                           FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                             CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                             JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                             JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
                          WHERE (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.inventory_source::text = 'dc'::text AND date((pm.created_at AT TIME ZONE 'America/Chicago'::text)) = date((now() AT TIME ZONE 'America/Chicago'::text)) AND carfs.created_at >= (date((now() AT TIME ZONE 'America/Chicago'::text))::timestamp without time zone AT TIME ZONE 'America/Chicago'::text) AND carfs.created_at <= ((date((now() AT TIME ZONE 'America/Chicago'::text))::timestamp without time zone AT TIME ZONE 'America/Chicago'::text) + '23:59:59'::interval)
                          AND carfs.article = any($$ || quote_literal(_article_list) || $$)
						  GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, saf.channel, saf.store_code, js.items, js.value) x) y
          GROUP BY y.allocation_code, y.article, y.retail_size_cd, (y.dc_code::integer), y.pack_type_id, y.channel, y.updated_at
        )
 SELECT allocation.allocation_code,
    allocation.article,
    allocation.dc_code,
    allocation.pack_type_id,
    allocation.channel,
    allocation.size,
    allocation.quantity::double precision as quantity,
    allocation.quantity::double precision as eaches_allocated,
    0 AS packs_allocated,
    allocation.updated_at
   FROM allocation;$$;
    raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$
;
