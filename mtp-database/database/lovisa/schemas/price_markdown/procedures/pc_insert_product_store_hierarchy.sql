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
                select distinct 4 as hierarchy_level, pm.l4_cid as hierarchy_value
                from price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 3 as hierarchy_level, pm.l2_cid as hierarchy_value
                from  price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 2 as hierarchy_level, pm.l1_cid as hierarchy_value
                from  price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 1 as hierarchy_level, pm.range_id as hierarchy_value
                from  price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 0 as hierarchy_level, pm.l0_cid as hierarchy_value
                from price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
                union all
                select distinct 101 as hierarchy_level, pm.group_number_id as hierarchy_value
                from  price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
				union all
                select distinct 102 as hierarchy_level, pm.product_lifecycle_id as hierarchy_value
                from  price_markdown.product_master pm where pm.product_id in (select product_id from product_ids_cte)
            ) dd
    ),
    stores_info_cte as (
        select
            hierarchy_level,hierarchy_value, 0 as is_product_hierarchy
        from
            (
				select distinct 4 as hierarchy_level, unnest(sm.store_grade_id) as hierarchy_value
                from price_markdown.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
				union all
                select distinct 3 as hierarchy_level, sm.store_type_id as hierarchy_value
                from price_markdown.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 2 as hierarchy_level, sm.s2_id as hierarchy_value
                from price_markdown.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 1 as hierarchy_level, sm.s1_id as hierarchy_value
                from price_markdown.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
                union all
                select distinct 0 as hierarchy_level, sm.s0_id as hierarchy_value
                from price_markdown.tb_store_master sm where sm.store_code in (select store_id from store_ids_cte)
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
    (strategy_id,s0_ids,s1_ids,s2_ids,store_grade_ids)
    select
        _strategy_id as strategy_id,
        array_agg(distinct s0_id) as s0_ids,
        array_agg(distinct s1_id) as s1_ids,
        array_agg(distinct s2_id) as s2_ids,
		array_agg(distinct sg_elem) as store_grade_ids
    from price_markdown.tb_store_master sm, unnest(store_grade_id) AS sg_elem
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
