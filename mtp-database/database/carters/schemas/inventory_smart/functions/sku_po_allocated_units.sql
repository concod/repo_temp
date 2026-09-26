--liquibase formatted sql
--changeset aniruddh.singh:sku_po_allocated_units_logic_fix runOnChange:true stripComments:false splitStatements:false context:MTP-83860 labels:setting dc_code as varchar
--comment: setting dc_code as varchar
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_po_allocated_units(character varying, varchar[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_po_allocated_units(_allocation_code varchar, _articles varchar[] default '{}')
RETURNS TABLE(
  allocation_code varchar,
	article varchar,
	dc_code varchar,
	pack_type_id text,
	channel varchar,
	"size" varchar,
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
	_po_refresh_date_value timestamp;
	_refresh_date_value timestamp;
BEGIN
    IF _allocation_code <> '' AND (_articles = '{}' OR _articles IS NULL) THEN
        EXECUTE 'select attribute_value::varchar[] from inventory_smart.plan_attributes pa where plan_code = ' || quote_literal(_allocation_code) || ' and attribute_name = ''article'';' INTO _article_list;
    ELSEIF (_articles <> '{}' OR _articles IS NOT NULL) AND _allocation_code = '' THEN
        _article_list := _articles;
    END IF;

    RAISE NOTICE 'article list: %', _article_list;
    
    -- Fetch both refresh dates
    EXECUTE 'SELECT (((da.attribute_value -> ''value''::text) ->> ''po_refresh_date''::text)::date AT TIME ZONE ''America/New_York'')::timestamp AT TIME ZONE ''America/New_York''
             FROM global.default_attributes da 
             WHERE da.attribute_type::text = ''dashboard_date_ticker''::text' 
    INTO _po_refresh_date_value;
    
    EXECUTE 'SELECT (((da.attribute_value -> ''value''::text) ->> ''refresh_date''::text)::date AT TIME ZONE ''America/New_York'')::timestamp AT TIME ZONE ''America/New_York''
             FROM global.default_attributes da 
             WHERE da.attribute_type::text = ''dashboard_date_ticker''::text' 
    INTO _refresh_date_value;
    
    RAISE NOTICE 'po refresh date value: %', _po_refresh_date_value;
    RAISE NOTICE 'refresh date value: %', _refresh_date_value;
    
    --    RETURN QUERY
        _query_combine := format($$WITH allocation AS (
         SELECT
            y.allocation_code,
            y.article,
            y.dc_code::varchar,
            y.pack_type_id,
            y.channel,
            y.retail_size_cd AS size,
            y.updated_at,
            sum(y.allocated_qty) AS quantity
           FROM ( SELECT 
                    x.allocation_code,
                    x.article,
                    x.retail_size_cd,
                    x.dc_code,
                    x.channel,
                    x.store_code,
                    x.updated_at,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated'::text, '['::text, '{'::text), ']'::text, '}'::text)::text[]) AS pack_type_id,
                    unnest(replace(replace(x.inventory_data::jsonb ->> 'packs_allocated_qty'::text, '['::text, '{'::text), ']'::text, '}'::text)::double precision[]) AS allocated_qty
                   FROM ( 
                        SELECT
                            carfs.allocation_code, 
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
                          WHERE (
                                (pm.status = 3 AND pm.created_at BETWEEN %L AND (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' + '23:59:59'::interval)) OR
                                (pm.status = 2 AND pm.created_at BETWEEN %L AND (date(now() AT TIME ZONE 'America/New_York')::timestamp AT TIME ZONE 'America/New_York' + '23:59:59'::interval))
                               )
                            AND pm.is_deleted = false AND carfs.source::text = 'po'::text
                          AND carfs.article = any(%L)
                          GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, saf.channel, saf.store_code, js.items, js.value
                        ) x
                    GROUP BY allocation_code, article, retail_size_cd, dc_code, channel, store_code, updated_at, pack_type_id, allocated_qty
                  ) y
          GROUP BY y.article, y.dc_code, y.pack_type_id, y.channel, y.updated_at, y.allocation_code, y.retail_size_cd
        ), packs AS (
         SELECT allocation.allocation_code,
            dpc.article,
            allocation.dc_code,
            dpc.pack_type_id,
            allocation.channel,
            dpc.size,
            allocation.updated_at,
            allocation.quantity * dpc.units_in_pack::double precision AS quantity,
            allocation.quantity AS packs_allocated
           FROM inventory_smart.dc_pack_configuration dpc
           JOIN allocation USING (article, pack_type_id,size)
           WHERE dpc.pack_type='packs'
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
   JOIN inventory_smart.dc_pack_configuration dpc USING (article, pack_type_id, size)
   WHERE NOT (allocation.pack_type_id IN ( SELECT packs.pack_type_id
           FROM packs))
UNION
 SELECT 
    packs.allocation_code,
    packs.article,
    packs.dc_code::varchar,
    packs.pack_type_id,
    packs.channel,
    packs.size,
    packs.quantity,
    0 AS eaches_allocated,
    packs.packs_allocated,
    packs.updated_at
   FROM packs;$$, _refresh_date_value, _po_refresh_date_value, _article_list);
    
    raise notice 'query combine: %', _query_combine;
    RETURN QUERY execute _query_combine;
END;
$function$;