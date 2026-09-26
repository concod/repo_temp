--liquibase formatted sql
--changeset mayank.dubey:article_selection_list_po runOnChange:true stripComments:false splitStatements:false context:MTP-41563  labels:MTP-41563 
--comment: added allocated qty filter, fixed net available inventory
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_selection_list_po(input refcursor, jsonb, jsonb, integer[], character[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_selection_list_po(input refcursor, character varying, jsonb, text[])
 RETURNS refcursor
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
declare
    _po_code text := $2;
    _articles text[] := $4;
    _article_filter text := '';
    _ph_sort text ;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
    _query_table_filters text := '';
    _query_combine text := '';
	_query_combine_format text := '';
begin

    IF _articles IS NOT NULL AND cardinality(_articles) > 0 THEN
        _article_filter := format(' AND pda.article = any(%L::text[])', _articles);
    END IF;

    _query_combine_format := $$
        with po_dc_agg as (
            select 
            po.po_code,
            po.article,
            po.product_code,
            po.channel,
            po.s1_id,
            po.dest_whouse,
            jsonb_object_agg(po.po_code, po.available_qty) as oh_map,
            COALESCE(SUM(po.available_qty), 0) oh,
            COALESCE(SUM(po.allocated_qty), 0) allocated_qty
            from inventory_smart.po_master po
            -- RLGLBLIS-362: Support Pre-Allocation PO (matches on raw_po_code)
            where po_code = '%1$s' OR raw_po_code = '%1$s'
            group by 1,2,3,4,5,6
        ),
        po_size_agg as (
            select po_code,
                pda.article,
                pda.channel,
                pda.s1_id,
                pda.dest_whouse,
                json_object_agg(paf.size, oh_map) oh_map,
                SUM(oh) as oh,
                SUM(allocated_qty) as allocated_qty
                from po_dc_agg pda
                left join "global".product_attributes_filter paf using (product_code)
                where TRUE %2$s
                group by 1,2,3,4,5
        ),
        po as MATERIALIZED (
            select * 
            from po_size_agg
            join inventory_smart.ph_master pm using (article, channel)
        ),
        product_store_dc_mapping as (
            SELECT pmps.mapping_code, 
                pmps.product_code,
                pmps.store_code, 
                ph_code,
                saf.channel,
                ph.l0_name
            FROM po ph 
            JOIN global.product_mapping_product_store pmps ON pmps.l0_name = ph.l0_name AND pmps.product_code = ANY(ph.product_codes)
            JOIN "global".store_attributes_filter saf USING(store_code, channel)  
            WHERE pmps.l0_name IN (SELECT DISTINCT l0_name FROM po) AND pmps.is_active = true AND CURRENT_DATE <@ pmps.validity AND saf.active = true AND saf.s1_id = ANY(ph.s1_id)
        ),
        constraint_data as (
            SELECT ph_code, 
                ROUND(AVG(aps)::numeric, 2) as aps, 
                ROUND(AVG(wos)::numeric, 2) as wos, 
                ARRAY_AGG(store_code) as mapped_stores, 
                ARRAY_LENGTH(ARRAY_AGG(store_code), 1) as mapped_stores_count 
            FROM (
                SELECT ph_code, 
                    cm.store_code, 
                    SUM(aps) as aps, --if there is null then it remains null and not considered in average
                    -- null + 1 = 1 -> one product code having null while other is not, will be considered
                    AVG(wos) as wos 
                FROM product_store_dc_mapping psm
                JOIN inventory_smart.constraint_master cm using(mapping_code, l0_name)
                GROUP BY 1, 2
            ) foo 
            GROUP BY 1
        ),
        --select * from constraint_data;
        aid as (
            SELECT article,
                COALESCE(SUM(week_to_date_sales), 0) as week_to_date_sales, 
                COALESCE(SUM(last_day_sales), 0) as last_day_sales, 
                ROUND(COALESCE(AVG(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc,
                COALESCE(SUM(lw_qty), 0) lw_qty,
                ROUND(COALESCE(AVG(si) * 100, 0)::decimal, 2) as si,
                COALESCE(SUM(sales_1_ago), 0) sales_1_ago,
                COALESCE(SUM(sales_2_ago), 0) sales_2_ago,
                COALESCE(SUM(sales_3_ago), 0) sales_3_ago,
                COALESCE(SUM(sales_4_ago), 0) sales_4_ago,
                COALESCE(SUM(sales_5_ago), 0) sales_5_ago,
                COALESCE(SUM(sales_6_ago), 0) sales_6_ago,
                COALESCE(SUM(sales_7_ago), 0) sales_7_ago,
                COALESCE(SUM(sales_8_ago), 0) sales_8_ago
            FROM inventory_smart.article_inventory_dashboard
            where article in (select distinct article from po)
            GROUP BY 1
        ),
        product_profiles_ia as (
            SELECT ph.ph_code, 
                JSONB_BUILD_OBJECT('value', pp_code, 'name', name, 'label', special_classification) as iapp 
            FROM po ph 
            JOIN inventory_smart.product_profile_master ppm using(ph_code) 
            WHERE special_classification = 'ia-recommended'
        ),
        article_udpp_config as (
            SELECT ph.ph_code, 
                    JSONB_BUILD_OBJECT('value', pp_code, 'name', name, 'label', special_classification) as udpp 
            FROM po ph 
            JOIN inventory_smart.ph_configuration_mapping pcm using(ph_code, channel) 
            -- optimization - right  now ph_conf is small so doing the same join 3 times is ok
            -- when this data swells up, can join once and use thrice
            join inventory_smart.product_profile_master ppm on pcm.default_product_profile = ppm.pp_code
        ),
        allocated as (
            select article, channel, updated_at AT TIME ZONE 'EDT' as allocated_time
            from inventory_smart.article_allocation_tracker aat
        ),
        sg_level as (
            select
                ph_code,
                default_sg_code,
                name,
                case
                        when s.default_sg_code = any(default_store_groups_selected) then true
                        else false
                end as is_selected
            from
                (
                    select
                            ph_code,
                            unnest(default_store_groups) as default_sg_code ,
                            default_store_groups_selected
                    from
                            inventory_smart.ph_configuration_mapping pc
                    join po pm
                                    using(ph_code,
                            channel)
                )s
            join global.store_groups sg on
                    sg.sg_code = s.default_sg_code 
        )
        ,article_sg_config as (
            select
                    ph_code,
                    ARRAY_AGG(JSONB_BUILD_OBJECT('value', default_sg_code, 'label', name, 'is_default', is_selected)) as store_groups
            from
                    sg_level
            group by 1
        ),
        final_result as (
            select
                ii.*,
                ph.l0_name, 
                ph.l1_name, 
                ph.l2_name, 
                ph.l3_name, 
                ph.l4_name, 
                ph.style, 
                ph.article,
                ph.ph_code,
                ph.product_description,
                ph.model_description,  
                ph.sizes, 
                ph.product_codes upc, 
                ph.color, 
                ph.article_status_tag,
                ph.style_color_id,
                ph.rtl_coordinate_group_desc,
                ph.supersede_flag,
                ph.brand,
                ph.dest_whouse,
                STRING_TO_ARRAY(ph.channel, ',')  as channel, 
                ph.vendor_case_pack vendor_case_pack,
                0 as reserve_quantity, 
                COALESCE(oh, 0) as oh,
                0 as oo,
                0 as it,
                (COALESCE(oh, 0) - 0) as total_inventory, 
                oh_map, 
                null rq_map,
                null rq_map_no_purge, 
                0 as allocated_units, 
                COALESCE(oh, 0) - COALESCE(allocated_qty, 0) as net_available_inventory, 
                null au_map,
                CASE WHEN udpp IS NULL THEN ARRAY[iapp || '{"is_default": true}']
                    WHEN iapp = udpp THEN ARRAY[iapp || '{"is_default": true}']
                    ELSE ARRAY[udpp || '{"is_default": true}', iapp || '{"is_default": false}']
                END as product_profiles, 
                al.allocated_time, 
                array[json_build_object('value', po_code, 'label', po_code, 'is_default', true)] dcs, 
                CASE WHEN store_groups IS NULL THEN store_groups || jsonb_build_object('value', -1, 'label', 'Default - Mapping', 'is_default', true)
                    ELSE store_groups || JSONB_BUILD_OBJECT('value', -1, 'label', 'Default - Mapping', 'is_default', 
                            NOT TRUE IN (SELECT (a::jsonb->>'is_default')::boolean FROM UNNEST(store_groups) as a)
                        )
                END as store_groups, 
                cd.mapped_stores_count, 
                cd.mapped_stores, 
                cd.aps, 
                cd.wos
            from po ph
            left JOIN article_sg_config asgc using (ph_code)
            left join aid ii using (article)
            left join constraint_data cd using (ph_code)
            left join product_profiles_ia using (ph_code)
            left join article_udpp_config using (ph_code)
            LEFT JOIN allocated al on ph.article = al.article and ph.channel = al.channel
            where oh - allocated_qty > 0
        )
        select * from final_result WHERE TRUE;
        $$;

        _query_combine = format(_query_combine_format, _po_code, _article_filter);
        raise notice 'A: %', _query_combine;
        OPEN $1 FOR EXECUTE _query_combine;
        RETURN $1;
end
$function$
;