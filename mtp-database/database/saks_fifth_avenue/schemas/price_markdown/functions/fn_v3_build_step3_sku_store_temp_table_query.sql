--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_build_step3_sku_store_temp_table_query-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_build_step3_sku_store_temp_table_query-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_build_step3_sku_store_temp_table_query;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_build_step3_sku_store_temp_table_query(_strategy_id integer, _product_level integer DEFAULT NULL::integer, _store_level integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    sku_store_pg_select text = '';
    sku_store_sg_select text = '';
    sku_store_pg_join text = '';
    sku_store_sg_join text = '';
    sku_store_temp_table_query text;
BEGIN
    -- product level logic
    if _product_level = -100 then
        sku_store_pg_select := ',tpp.pg_id as product_group_id';
        sku_store_pg_join := format('
            inner join (
                select pg_id, pm.product_id
                from global.tb_pg_product tpp
                inner join price_markdown.product_master pm
                    on pm.l5_cid = tpp.product_id
            ) tpp
            on tpp.product_id = ssm.product_id
            and tpp.pg_id in (
                select product_group_id
                from price_markdown.tb_strategy_product_groups
                where strategy_id = %1$L
            )
        ', _strategy_id);
    end if;

    -- store level logic
    if _store_level = -100 then
        sku_store_sg_select := ',tss.sg_id as store_group_id';
        sku_store_sg_join := format('
            inner join global.tb_sg_store tss
            on tss.store_id = ssm.store_id
            and tss.sg_id in (
                select store_group_id
                from price_markdown.tb_strategy_store_groups
                where strategy_id = %1$L
            )
        ', _strategy_id);
    end if;

    -- final temp table query
    sku_store_temp_table_query := format('
        create temp table sku_store_date_cte on commit drop as
        select
            ssm.strategy_id,
            ssm.product_id,
            ssm.store_id,
            ssm.product_level_id,
            ssm.store_level_id,
            tsp.pcd_id,
            tsp.pcd_start_date,
            tsp.pcd_end_date,
            ssm.price
            %1$s
            %2$s
        from
            price_markdown.tb_strategy_sku_store_mapping_%3$s ssm
        left join
            (select * from price_markdown.tb_strategy_master where strategy_id = %3$s) tsm
            on tsm.strategy_id = ssm.strategy_id
        left join
            price_markdown.tb_strategy_pcd tsp
            on ssm.strategy_id = tsp.strategy_id
        %4$s
        %5$s;
    ', sku_store_pg_select, sku_store_sg_select, _strategy_id::text, sku_store_pg_join, sku_store_sg_join);

    return sku_store_temp_table_query;
end;
$function$
;
