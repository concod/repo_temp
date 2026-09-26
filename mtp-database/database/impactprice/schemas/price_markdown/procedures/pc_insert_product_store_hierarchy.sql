--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_insert_product_store_hierarchy_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_insert_product_store_hierarchy_5

DROP PROCEDURE if exists price_markdown.pc_insert_product_store_hierarchy;


CREATE OR REPLACE PROCEDURE price_markdown.pc_insert_product_store_hierarchy(IN _strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    delete_query text:= '';
   	create_partition_query text:= '';
    insert_query text:= '';
begin
	-- delete outdated strategy hierarchy.
    delete from price_markdown.tb_strategy_hierarchy where strategy_id = _strategy_id;

   	-- create hierarchy partition for current strategy, if not present.
   	-- call price_markdown.pc_create_partition_hierarchy_table(array[_strategy_id]);
   	create_partition_query = 'create table if not exists price_markdown.tb_strategy_hierarchy_%1$s partition of price_markdown.tb_strategy_hierarchy for values in (%1$s)';
   	create_partition_query = FORMAT(create_partition_query, _strategy_id::text);
    execute create_partition_query;

   	-- insert into strategy hierarchy.
    with product_ids_cte as(
        select distinct tsssm.product_id from price_markdown.tb_strategy_sku_store_mapping tsssm where tsssm.strategy_id = _strategy_id
    ),
    store_ids_cte as(
        select distinct tsssm.store_id from price_markdown.tb_strategy_sku_store_mapping tsssm where tsssm.strategy_id = _strategy_id
    ),
    products_info_cte as (
        select
            hierarchy_level, hierarchy_value, 1 as is_product_hierarchy
        from
            (
                select distinct 7 as hierarchy_level, product_id as hierarchy_value
                 from product_ids_cte
                union all
                select distinct 6 as hierarchy_level, pm.l6_cid as hierarchy_value
                from pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 5 as hierarchy_level, pm.l5_cid as hierarchy_value
                from pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 4 as hierarchy_level, pm.l4_cid as hierarchy_value
                from pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 3 as hierarchy_level, pm.l3_cid as hierarchy_value
                from  pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 2 as hierarchy_level, pm.l2_cid as hierarchy_value
                from  pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 1 as hierarchy_level, pm.l1_cid as hierarchy_value
                from  pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 0 as hierarchy_level, pm.l0_cid as hierarchy_value
                from pricesmart.product_master pm where pm.product_id in (select product_id from product_ids_cte)
            ) dd
    ),
    stores_info_cte as (
        select
            hierarchy_level,hierarchy_value, 0 as is_product_hierarchy
        from
            (
                select distinct 6 as hierarchy_level, store_id as hierarchy_value
                from store_ids_cte
                union all
                select distinct 5 as hierarchy_level, sm.s5_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 4 as hierarchy_level, sm.s4_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 3 as hierarchy_level, sm.s3_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 2 as hierarchy_level, sm.s2_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 1 as hierarchy_level, sm.s1_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 0 as hierarchy_level, sm.s0_id as hierarchy_value
                from pricesmart.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
            ) dd
    )
    insert into price_markdown.tb_strategy_hierarchy
    select
        _strategy_id as strategy_id, hierarchy_level, hierarchy_value, is_product_hierarchy
    from
        (
            select * from products_info_cte
            union all
            select * from stores_info_cte
        ) s
	where 
		s.hierarchy_level is not null
		and s.hierarchy_value is not null;

    delete from price_markdown.tb_strategy_store_hierarchies
    where strategy_id = _strategy_id;

    insert into price_markdown.tb_strategy_store_hierarchies
    (strategy_id,s0_ids,s1_ids,s2_ids,s3_ids,s4_ids,s5_ids,s6_ids)
    select
        _strategy_id as strategy_id,
        array_agg(distinct s0_id) as s0_ids,
        array_agg(distinct s1_id) as s1_ids,
        array_agg(distinct s2_id) as s2_ids,
        array_agg(distinct s3_id) as s3_ids,
        array_agg(distinct s4_id) as s4_ids,
        array_agg(distinct s5_id) as s5_ids,
        array_agg(distinct store_id) as s6_ids
    from pricesmart.tb_store_master sm 
    where sm.store_code in (select distinct tsssm.store_id from price_markdown.tb_strategy_sku_store_mapping tsssm where tsssm.strategy_id = _strategy_id);


	update price_markdown.tb_strategy_master
	set currency_id = (
	   select currency_id
	   from price_markdown.tb_strategy_sku_store_mapping
	   where strategy_id = _strategy_id
	   limit 1
	)
	where strategy_id = _strategy_id;
END;
$procedure$
;
