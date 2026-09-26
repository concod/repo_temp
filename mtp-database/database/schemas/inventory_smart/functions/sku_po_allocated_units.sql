--liquibase formatted sql
--changeset kamuju.mahaveer:sku_po_allocated_units_v1 runOnChange:true stripComments:false splitStatements:false context:MTP-83860 labels:setting dc_code as varchar
--comment: Added allocation_code to the function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_po_allocated_units(character varying, varchar[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_po_allocated_units(_allocation_code varchar, _articles varchar[] default '{}')
RETURNS TABLE(
    allocation_code varchar,
	article varchar,
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
    IF _allocation_code <> '' AND (_articles = '{}' OR _articles IS NULL) THEN
        EXECUTE 'select attribute_value::varchar[] from inventory_smart.plan_attributes pa where plan_code = ' || quote_literal(_allocation_code) || ' and attribute_name = ''article'';' INTO _article_list;
    ELSEIF (_articles <> '{}' OR _articles IS NOT NULL) AND _allocation_code = '' THEN
        _article_list := _articles;
    END IF;

    RAISE NOTICE 'article list: %', _article_list;
    
    -- Fetch refresh date once into a variable
    EXECUTE 'SELECT (((da.attribute_value -> ''value''::text) ->> ''refresh_date''::text)::date AT TIME ZONE ''America/New_York'')::timestamp AT TIME ZONE ''America/New_York''
             FROM global.default_attributes da 
             WHERE da.attribute_type::text = ''dashboard_date_ticker''::text' 
    INTO _refresh_date_value;
    
    RAISE NOTICE 'refresh date value: %', _refresh_date_value;
    
    --    RETURN QUERY
        _query_combine := format($$WITH allocation AS (
         SELECT y.allocation_code,
            y.article,
            y.dc_code::varchar,
            y.pack_type_id,
            y.channel,
            y.pack_type_id AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT x.allocation_code,
                    x.article,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( SELECT 
                            carfs.allocation_code,
                            carfs.article,
                            saf.channel,
                            saf.store_code,
                            js.items AS dc_code,
                            js.value AS inventory_data,
                            max(carfs.updated_at) AS updated_at
                           FROM inventory_smart.create_allocation_result_flat_gurobi carfs
                             CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
                             JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
                             JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
                          WHERE (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.inventory_source::text = 'po'::text 
                          AND date((pm.created_at AT TIME ZONE 'America/Chicago'::text)) = date((now() AT TIME ZONE 'America/Chicago'::text)) AND carfs.created_at >= (date((now() AT TIME ZONE 'America/Chicago'::text))::timestamp without time zone AT TIME ZONE 'America/Chicago'::text) AND carfs.created_at <= ((date((now() AT TIME ZONE 'America/Chicago'::text))::timestamp without time zone AT TIME ZONE 'America/Chicago'::text) + '23:59:59'::interval)
                          AND carfs.article = any($$ || quote_literal(_article_list) || $$)
                          GROUP BY carfs.allocation_code, carfs.article, saf.channel, saf.store_code, js.items, js.value) x) y
          GROUP BY y.allocation_code, y.article, y.dc_code, y.pack_type_id, y.channel, y.updated_at
        ), packs AS (
         SELECT 
            allocation_code,
            dpc.article,
            allocation.dc_code::varchar,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
             JOIN allocation USING (article, pack_type_id)
        )
 SELECT 
 allocation.allocation_code,
    allocation.article,
    allocation.dc_code,
    allocation.pack_type_id,
    allocation.channel,
    allocation.size,
    allocation.quantity,
    allocation.quantity AS eaches_allocated,
    0 AS packs_allocated,
    allocation.updated_at
   FROM allocation
  WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION
 SELECT 
    packs.allocation_code,
    packs.article,
    packs.dc_code,
    packs.pack_type_id,
    packs.channel,
    packs.size,
    packs.quantity,
    0 AS eaches_allocated,
    packs.packs_allocated,
    packs.updated_at
   FROM packs;$$, _refresh_date_value, _refresh_date_value, quote_literal(_article_list));
    
    raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$;