--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_promos_finalized_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_promos_finalized_stack

DROP FUNCTION IF EXISTS price_promo_opt.fn_get_promos_finalized_stack ;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_promos_finalized_stack(p_promo_id integer)
 RETURNS TABLE(stackable_type_return text, promo_id_return integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _response jsonb;
		_query text;
        _conflicted_promos int[];
        _eligible_promos int[];
        _promo_record price_promo.promo_master%ROWTYPE;
        _status_condition text; 
		p_consider_draft_promos bool;
	BEGIN
		p_consider_draft_promos:=True;

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
			pm.store_selection_type,
            pm.customer_selection_type
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
                'and pm.status = any(array(select remarks::int2[] from metaschema.tb_app_sub_master where name = ''stacked_offers_eligibility''))'
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


        if _promo_record.customer_selection_type = 1 then
            _query = format(
                '
                drop table if exists tb_tmp_customer_conflict_promos;
                create temp table tb_tmp_customer_conflict_promos as 
                select
                    distinct conflicted_promo_customers.promo_id
                from price_promo.tb_promo_customers conflicted_promo_customers
                inner join (
                    select tpc.promo_id,customer_id
                    from price_promo.tb_promo_customers tpc
                    where tpc.promo_id = %1$s
                ) current_promo_customers
                on conflicted_promo_customers.customer_id = current_promo_customers.customer_id
                where conflicted_promo_customers.promo_id = any(%2$L)
                ',
                p_promo_id,
                _eligible_promos
            );
        else
            _query = format(
                '
                drop table if exists tb_tmp_customer_conflict_promos;
                create temp table tb_tmp_customer_conflict_promos as
                select
                    ttep.promo_id
                from tb_tmp_eligible_promos ttep
                '
            );
        end if;
        raise notice 'store_conflict_query: %', _query;
        execute _query;

        _query = format(
            '
			drop table if exists tb_tmp_product_and_store_and_customer_conflict_promos;
            create temp table tb_tmp_product_and_store_and_customer_conflict_promos as 
            select
                ttpcp.promo_id
            from tb_tmp_product_conflict_promos ttpcp
            intersect 
            select ttscp.promo_id
            from tb_tmp_store_conflict_promos ttscp
            intersect 
            select ttccp.promo_id
            from tb_tmp_customer_conflict_promos ttccp
            '
        );
        raise notice 'product_and_store_and_customer_conflict_query: %', _query;
        execute _query;

        _conflicted_promos = (select array_agg(ttpscp.promo_id) from tb_tmp_product_and_store_and_customer_conflict_promos ttpscp);

        if coalesce(array_length(_conflicted_promos,1),0) = 0 then
            return;
        end if;
        _query = format(
        '
        with final_conflicted_promos_cte as (
            select
            *
            from tb_tmp_eligible_promos epc
            where promo_id = any(%1$L)
        ),
        offer_type_details_cte as (
            select
                promo_id,
                max(offer_type_combined_display_name) as offer_type_combined_display_name
            from price_promo.ps_recommended_finalized_agg
            where promo_id = any(%1$L)
            group by promo_id
        ),
        aggregated_response as (
            select
                stackable_type,
                cp.promo_id
            from final_conflicted_promos_cte cp
            left join offer_type_details_cte otpc
            on cp.promo_id = otpc.promo_id
        )
        select df.stackable_type as stackable_type_return, df.promo_id as promo_id_return
        from aggregated_response df order by 1 desc
        ',
        _conflicted_promos
        );
        raise notice 'final_response_query: %', _query;
    	RETURN QUERY EXECUTE _query;

	END;
$function$
;