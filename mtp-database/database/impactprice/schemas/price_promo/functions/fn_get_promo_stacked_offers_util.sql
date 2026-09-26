--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_promo_stacked_offers_util runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_get_promo_stacked_offers_util

DROP FUNCTION if exists price_promo.fn_get_promo_stacked_offers_util;
CREATE OR REPLACE FUNCTION price_promo.fn_get_promo_stacked_offers_util(
    p_promo_id integer,
    p_consider_draft_promos bool default false
)
 RETURNS TABLE(
    promo_id int,
    stacked_promo_id int,
    promo_name text,
    start_date date,
    end_date date,
    duration int,
    overlap_duration int,
    priority_number int,
    priority_display_name text,
    products_count int,
    stackable_type text,
    offer_type_combined_display_name text
 )
 LANGUAGE plpgsql
AS $function$
    declare
        _response jsonb;
		_query text;
        _conflicted_promos int[];
        _eligible_promos int[];
        _promo_record price_promo.promo_master%ROWTYPE;
        _status_condition text; 
	BEGIN

        select * into _promo_record
        from price_promo.promo_master pm
        where pm.promo_id = p_promo_id;
        
        _query = format(
        '  
		drop table if exists tb_tmp_eligible_promos;
        create temp table tb_tmp_eligible_promos as 
        select
            pm.promo_id,
            pm.name as promo_name,
            pm.start_date,
            pm.end_date,
            (pm.end_date - pm.start_date)+1 as duration,
            (least(pm.end_date, current_promo.end_date) - greatest(pm.start_date, current_promo.start_date))+1 as overlap_duration,
            pr.priority_number,
            tpn.priority_display_name,
            pm.products_count,
            case when tspr.is_stackable then ''stackable'' else ''non_stackable'' end as stackable_type,
            pm.product_selection_type,
			pm.store_selection_type
        from 
            price_promo.promo_master pm
            inner join
            price_promo.ps_rules pr
            on pr.promo_id = pm.promo_id
            left join
            price_promo.tb_priority_number tpn
            on tpn.priority_number = pr.priority_number
			cross join (
                select ppm.promo_id,ppm.start_date,ppm.end_date,ppr.priority_number
                from price_promo.promo_master ppm
                inner join price_promo.ps_rules ppr
                on ppm.promo_id = ppr.promo_id
                where ppm.promo_id = %1$s
            ) current_promo
            left join
            price_promo.tb_stacking_priority_rules tspr
            on tspr.priority_x = current_promo.priority_number and tspr.priority_y = pr.priority_number
        where 
            pm.promo_id != %1$s
            %2$s
            and pm.start_date <= current_promo.end_date and pm.end_date >= current_promo.start_date
        ',
        p_promo_id,
        case
            when p_consider_draft_promos then
                'and pm.status not in (-1,6)'
            else
                'and pm.status =  any(ARRAY(SELECT jsonb_array_elements_text(config_value::jsonb)::int2 FROM price_promo.tb_tool_configurations WHERE config_name = ''stacked_offers_eligibility''))'
        end   
        );

        raise notice 'eligible_promos query: %', _query;
        execute _query;

        _eligible_promos = (select array_agg(ttep.promo_id) from tb_tmp_eligible_promos ttep);

		if coalesce(array_length(_eligible_promos,1),0) = 0 then
            return;
        end if;


        if _promo_record.product_selection_type = 1 then
            _query = format(
                '
                drop table if exists tb_tmp_product_conflict_promos;
                create temp table tb_tmp_product_conflict_promos as
                select
                    ttep.promo_id
                from tb_tmp_eligible_promos ttep
                '
            );
        else

            _query = format(
                '
                drop table if exists tb_tmp_product_conflict_promos;
                create temp table tb_tmp_product_conflict_promos as 
                select 
                    distinct conflicted_promo_products.promo_id
                from price_promo.promo_product conflicted_promo_products
                inner join (
                    select pp.promo_id,pp.product_id
                    from price_promo.promo_product pp
                    where pp.promo_id = %1$s
                ) current_promo_products
                on conflicted_promo_products.product_id = current_promo_products.product_id
                where conflicted_promo_products.promo_id = any(%2$L)
                union all
                select 
                    ttep.promo_id
                from tb_tmp_eligible_promos ttep
                where product_selection_type = 1
                ',
                p_promo_id,
                _eligible_promos
            );
        end if;
		
        raise notice 'product_conflict_query : %', _query;
        execute _query;
		

        if _promo_record.store_selection_type = 1 then
            _query = format(
                '
                drop table if exists tb_tmp_store_conflict_promos;
                create temp table tb_tmp_store_conflict_promos as
                select
                    ttep.promo_id
                from tb_tmp_eligible_promos ttep
                '
            );
        else
            _query = format(
                '
                drop table if exists tb_tmp_store_conflict_promos;
                create temp table tb_tmp_store_conflict_promos as 
                select
                    distinct conflicted_promo_stores.promo_id
                from price_promo.promo_store conflicted_promo_stores
                inner join (
                    select ps.promo_id,store_id
                    from price_promo.promo_store ps
                    where ps.promo_id = %1$s
                ) current_promo_stores
                on conflicted_promo_stores.store_id = current_promo_stores.store_id
                where conflicted_promo_stores.promo_id = any(%2$L)
                union all
                select 
                    ttep.promo_id
                from tb_tmp_eligible_promos ttep
                where store_selection_type = 1
                ',
                p_promo_id,
                _eligible_promos
            );
        end if;
        raise notice 'store_conflict_query: %', _query;
        execute _query;

        _query = format(
            '
			drop table if exists tb_tmp_product_and_store_conflict_promos;
            create temp table tb_tmp_product_and_store_conflict_promos as 
            select
                ttpcp.promo_id
            from tb_tmp_product_conflict_promos ttpcp
            intersect 
            select ttscp.promo_id
            from tb_tmp_store_conflict_promos ttscp
            '
        );
        raise notice 'product_and_store_conflict_query: %', _query;
        execute _query;

        _conflicted_promos = (select array_agg(ttpscp.promo_id) from tb_tmp_product_and_store_conflict_promos ttpscp);

        if coalesce(array_length(_conflicted_promos,1),0) = 0 then
            return;
        end if;

        _query = format(
        '
        with final_conflicted_promos_cte as (
            select 
            *
            from tb_tmp_eligible_promos epc
            where epc.promo_id = any(%1$L)
        ),
        offer_type_details_cte as (
            select
                psrfa.promo_id,
                max(psrfa.offer_type_combined_display_name) as offer_type_combined_display_name
            from price_promo.ps_recommended_finalized_agg psrfa
            where promo_id = any(%1$L)
            group by promo_id
        )
        select
            %2$s as promo_id,
            cp.promo_id as stacked_promo_id,
            cp.promo_name::text as promo_name,
            cp.start_date,
            cp.end_date,
            cp.duration,
            cp.overlap_duration,
            cp.priority_number,
            cp.priority_display_name::text,
            cp.products_count,
			cp.stackable_type::text,
            otpc.offer_type_combined_display_name::text
        from final_conflicted_promos_cte cp
        left join offer_type_details_cte otpc
        on cp.promo_id = otpc.promo_id

        ',
        _conflicted_promos,
        p_promo_id
        );

        raise notice 'final_conflicted_promos_query: %', _query;
        return query execute _query;
    END;
$function$
;