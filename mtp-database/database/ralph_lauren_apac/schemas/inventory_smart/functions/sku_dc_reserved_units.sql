--liquibase formatted sql
--changeset liquibase:sku_dc_reserved_units runOnChange:true stripComments:false splitStatements:false context:MTP-44616 labels:MTP-44616
--comment: removed channel filter as drq has only shared channel
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.sku_dc_reserved_units(text[], text[]);
CREATE OR REPLACE FUNCTION inventory_smart.sku_dc_reserved_units(product_codes text[], articles text[])
    RETURNS TABLE (
        article varchar,
        product_code varchar,
        size varchar,
        channel varchar,
        dc_code int,
        type varchar,
        quantity int,
        pack_flag boolean,
        units_in_pack int
 )
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
        with base_table as(
        SELECT
            paf.article,
            drq.product_code,
            coalesce(drq.pack_type_id, paf.size) as size,
            drq.channel,
            drq.dc_code,
            drq.type,
            SUM(drq.quantity)::int AS quantity,
            (case when paf.size != drq.pack_type_id then true else false end) as pack_flag,
            coalesce(dpc.units_in_pack, 1) units_in_pack,
            drq.daily_history
        FROM inventory_smart.dc_reserve_quantity drq
        JOIN global.product_attributes_filter paf USING (product_code)
        JOIN global.product_mapping_product_dc pmpd USING (product_code, dc_code)
        left join inventory_smart.dc_pack_configuration dpc using (article, product_code, pack_type_id)
        WHERE TRUE
        %1$s
        %2$s
        GROUP BY drq.product_code, paf.article, paf.size, drq.dc_code, drq.type, drq.channel, drq.pack_type_id, dpc.units_in_pack, drq.daily_history
        ),
        flat_table as (
            select
                foo.*,
                js.key::TIMESTAMPTZ as delta_updated_at,
                js.value::int as delta_quantity
                from base_table foo,
                JSONB_EACH(daily_history) js),
        result as (
            select article, product_code, size, channel, dc_code, type, sum(delta_quantity)::int as quantity,  pack_flag, max(units_in_pack) as units_in_pack
            from flat_table
            group by article, product_code, channel, dc_code, size, pack_flag, type
        )
        select * from result

    $$;

    RAISE NOTICE '%s',FORMAT(_query_combine, _product_code_filter, _article_filter);
    RAISE NOTICE '%', $1;
    RAISE NOTICE '%',$2;
    RETURN QUERY EXECUTE FORMAT(_query_combine, _product_code_filter, _article_filter) USING $1, $2;

END;
$function$
;