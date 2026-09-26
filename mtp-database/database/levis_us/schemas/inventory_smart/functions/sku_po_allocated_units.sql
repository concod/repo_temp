--liquibase formatted sql
--changeset rajesh.kumar:MTP-119351-fix runOnChange:true stripComments:false splitStatements:false context:MTP-119351-fix labels:MTP-119351-fix
--comment: MTP-119351-fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_po_allocated_units(varchar);
DROP FUNCTION IF EXISTS inventory_smart.sku_po_allocated_units(varchar, varchar[]);

CREATE OR REPLACE FUNCTION inventory_smart.sku_po_allocated_units(_allocation_code varchar, _articles varchar[] default '{}')
RETURNS TABLE(
	article varchar,
	allocation_code varchar,
	dc_code varchar,
	pack_type_id text,
	channel varchar,
	"size" text,
	quantity float8,
	eaches_allocated float8,
	packs_allocated float8,
	updated_at timestamptz
)
LANGUAGE PLPGSQL
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

    RAISE NOTICE 'article list: %', _article_list;
    
    -- Fetch refresh date once into a variable
    EXECUTE 'SELECT (((da.attribute_value -> ''value''::text) ->> ''refresh_date''::text)::date AT TIME ZONE ''America/Los_Angeles'')::timestamp AT TIME ZONE ''America/Los_Angeles''
             FROM global.default_attributes da 
             WHERE da.attribute_type::text = ''dashboard_date_ticker''::text' 
    INTO _refresh_date_value;
    
    RAISE NOTICE 'refresh date value: %', _refresh_date_value;
    
    --    RETURN QUERY
        _query_combine := format($$WITH allocation AS (
         SELECT y.allocation_code,
            y.article,
            y.dc_code,
            y.pack_type_id,
            y.channel,
            y.retail_size_cd AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.retail_size_cd,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
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
                          WHERE (pm.status = 3 AND pm.created_at >= (date((now() AT TIME ZONE 'America/Los_Angeles'::text))::timestamp without time zone AT TIME ZONE 'America/Los_Angeles'::text) AND pm.created_at <= ((date((now() AT TIME ZONE 'America/Los_Angeles'::text))::timestamp without time zone AT TIME ZONE 'America/Los_Angeles'::text) + '23:59:59'::interval) OR pm.status = 2 AND pm.created_at >= ((date((now() AT TIME ZONE 'America/Los_Angeles'::text))::timestamp without time zone AT TIME ZONE 'America/Los_Angeles'::text) - '14 days'::interval) AND pm.created_at <= ((date((now() AT TIME ZONE 'America/Los_Angeles'::text))::timestamp without time zone AT TIME ZONE 'America/Los_Angeles'::text) + '23:59:59'::interval)) AND pm.is_deleted = false AND carfs.source::text = 'po'::text
                          AND carfs.article = any($$ || quote_literal(_article_list) || $$)
                          GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, saf.channel, saf.store_code, js.items, js.value) x
                  GROUP BY x.allocation_code, x.article, x.retail_size_cd, x.dc_code, x.channel, x.store_code, x.updated_at, (unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[])), (unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]))) y
          GROUP BY y.allocation_code, y.article, y.retail_size_cd, y.dc_code, y.pack_type_id, y.channel, y.updated_at
        ), packs AS (
         SELECT dpc.article,
            allocation.allocation_code,
            allocation.dc_code,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (pack_type_id, article, size)
          WHERE dpc.pack_type::text = 'packs'::text
        )
 SELECT allocation.article,
    allocation.allocation_code,
    allocation.dc_code::varchar        AS dc_code,
    allocation.pack_type_id::text      AS pack_type_id,
    allocation.channel,
    allocation.size::text              AS size,
    allocation.quantity::float8        AS quantity,
    allocation.quantity::float8        AS eaches_allocated,
    0::float8                          AS packs_allocated,
    allocation.updated_at
   FROM allocation
     JOIN inventory_smart.dc_pack_configuration dpc USING (pack_type_id, article, size)
  WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION ALL
 SELECT packs.article,
    packs.allocation_code,
    packs.dc_code::varchar             AS dc_code,
    packs.pack_type_id::text           AS pack_type_id,
    packs.channel,
    packs.size::text                   AS size,
    packs.quantity::float8             AS quantity,
    0::float8                          AS eaches_allocated,
    packs.packs_allocated::float8      AS packs_allocated,
    packs.updated_at
   FROM packs;$$, _refresh_date_value, _refresh_date_value, quote_literal(_article_list));
    
    raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$;