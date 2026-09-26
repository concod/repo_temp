--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:MTP-50768 runOnChange:true stripComments:false splitStatements:false context:store attributes labels:MTP-50768
--comment: MTP-50768 optimisation_changes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.store_capacity_check(input refcursor, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.store_capacity_check(input refcursor, character varying)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
    _query_combine text;
    _created_at timestamp;
    _refreshed_at timestamp;
    begin
       
        select (created_at::date)::timestamp into _created_at from inventory_smart.plan_master pm WHERE plan_code = REPLACE($2, 'edit_', '');
        raise notice '_created_at: %', _created_at;
        
        select 
        timezone(inventory_smart.get_tenant_timezone(),(attribute_value->'value'->>'mfp_date')::varchar::date )
        into _refreshed_at from "global".tenant_attribute_master tam where "name" like '%dashboard_date_ticker%';
        raise notice '_refreshed_at: %', _refreshed_at;
      
        _query_combine := format($$
            with
            article_store_allocated as(
                select
                    article ,
                    store,
                    sum(allocated_total)
                from
                    inventory_smart.create_allocation_result_flat_gurobi carfg
                where
                    carfg.created_at between '%2$s'::timestamp and '%3$s'::timestamp
                    and carfg.allocation_code  = '%1$s'
                group by 1,2)
            ,article_store_allocated_for_today as (
                select
                    article ,
                    store,
                    sum(allocated_total)
                from
                    inventory_smart.create_allocation_result_flat_gurobi carfg
                where 
                carfg.created_at  between '%4$s'::timestamp and '%5$s'::timestamp 
                and
                allocation_code in (        
                    select plan_code from inventory_smart.plan_master 
                    where status = 2 and created_at between '%4$s'::timestamp and '%5$s'::timestamp 
                    and plan_code <> '%1$s'
                    )
                group by 1,2)
            ,article_list as (
                select distinct article from article_store_allocated
                union all
                select distinct article from article_store_allocated_for_today
            )
            ,l3_article as (
                select 
                    distinct l3_name,
                    article
                from
                    "global".product_attributes_filter paf
                where article in 
                (select * from article_list))
            ,latest_inventory_store_l3_allocated as (
                select
                    store_code,
                    l3_name,
                    sum(oo + oh + it)
                from
                    inventory_smart.latest_inventory li
                    join
                    "global".product_attributes_filter paf using (product_code)
                    where paf.l3_name in (
                        select
                            distinct l3_name
                        from
                            "global".product_attributes_filter paf
                        where
                            article in (select distinct article from article_store_allocated))
                        and store_code in (select distinct store from article_store_allocated)
                        group  by 1,2)
            ,create_allocation_result_flat_gurobi_store_l3 as (
                select 
                    asa.store store_code,
                    la.l3_name,
                    asa.sum
                from article_store_allocated asa 
                left join l3_article la on asa.article = la.article)
            ,create_allocation_result_flat_gurobi_store_l3_for_today as (
                select 
                    asa.store store_code,
                    la.l3_name,
                    asa.sum
                from article_store_allocated_for_today asa 
                left join l3_article la on asa.article = la.article)
            ,combined_result as (
                select 
                    store_code,
                    l3_name,
                    SUM(sum) as total_sum
                from (
                    select * from latest_inventory_store_l3_allocated
                union all
                    select * from create_allocation_result_flat_gurobi_store_l3 
                union all
                    select * from create_allocation_result_flat_gurobi_store_l3_for_today
                    ) as t
                group by 1,2
            )
            ,capacity_l3_store as (
                select
                    store_code,
                    product_hierarchy l3_name,
                    SUM(unit_capacity)
                from
                    inventory_smart.store_unit_capacity suc
                where
                    product_hierarchy in (select l3_name from  l3_article)
                    and store_code in (select store from article_store_allocated)
                group by 1,2)
            select
                combined_result.store_code,
                combined_result.l3_name,
                (capacity_l3_store.sum - combined_result.total_sum) as result
            from
                combined_result
                inner join capacity_l3_store on combined_result.store_code = capacity_l3_store.store_code and combined_result.l3_name = capacity_l3_store.l3_name
            where
                capacity_l3_store.sum - combined_result.total_sum < 0
        $$, $2, _created_at, _created_at+ interval '23 hours 59 minutes', _refreshed_at, now());
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
        RETURN $1;
    end
 $function$
;
