--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_promos_stack runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_promos_stack

DROP FUNCTION if exists price_promo_opt.fn_get_promos_stack;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_promos_stack(p_promo_id integer)
 RETURNS TABLE(stackable_type_return text, promo_id_return integer)
 LANGUAGE plpgsql
AS $function$
    declare
        _response jsonb;
		_query text;
        _conflicted_promos int[];
        _eligible_promos int[];
        _promo_record price_promo.promo_master%ROWTYPE;
	BEGIN

        select * into _promo_record
        from price_promo.promo_master
        where promo_id = p_promo_id;

        _query = format(
        '
		drop table if exists tb_tmp_eligible_promos;
        create temp table tb_tmp_eligible_promos as
        select
            pm.promo_id,
            pm.name as promo_name,
            pm.start_date,
            pm.end_date,
            (pm.end_date - pm.start_date) as duration,
            (least(pm.end_date, current_promo.end_date) - greatest(pm.start_date, current_promo.start_date)) as overlap_duration,
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
            and pm.status = any(array[0,2,4,8])
            and pm.start_date <= current_promo.end_date and pm.end_date >= current_promo.start_date
        ',
        p_promo_id
        );

        raise notice 'eligible_promos query: %', _query;
        execute _query;

        _eligible_promos = (select array_agg(promo_id) from tb_tmp_eligible_promos);

        if _promo_record.product_selection_type = 1 then
            _query = format(
                '
                drop table if exists tb_tmp_product_conflict_promos;
                create temp table tb_tmp_product_conflict_promos as
                select
                    promo_id
                from tb_tmp_eligible_promos
                '
            );
        else

            _query = format(
                '
                drop table if exists tb_tmp_product_conflict_promos;
                create temp table tb_tmp_product_conflict_promos as
                select
                    distinct conflicted_promo_products.promo_id
                from price_promo.included_products conflicted_promo_products
                inner join (
                    select promo_id,product_id
                    from price_promo.included_products
                    where promo_id = %1$s
                ) current_promo_products
                on conflicted_promo_products.product_id = current_promo_products.product_id
                where conflicted_promo_products.promo_id = any(%2$L)
                union all
                select
                    promo_id
                from tb_tmp_eligible_promos
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
                    promo_id
                from tb_tmp_eligible_promos
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
                    select promo_id,store_id
                    from price_promo.promo_store
                    where promo_id = %1$s
                ) current_promo_stores
                on conflicted_promo_stores.store_id = current_promo_stores.store_id
                where conflicted_promo_stores.promo_id = any(%2$L)
                union all
                select
                    promo_id
                from tb_tmp_eligible_promos
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
                promo_id
            from tb_tmp_product_conflict_promos
            intersect
            select promo_id
            from tb_tmp_store_conflict_promos
            '
        );
        raise notice 'product_and_store_conflict_query: %', _query;
        execute _query;

        _conflicted_promos = (select array_agg(promo_id) from tb_tmp_product_and_store_conflict_promos);


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
--            left join offer_type_details_cte otpc
--            on cp.promo_id = otpc.promo_id
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