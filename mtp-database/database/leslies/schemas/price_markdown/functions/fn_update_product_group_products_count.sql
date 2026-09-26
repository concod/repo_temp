--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_update_product_group_products_count_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_update_product_group_products_count_2

DROP FUNCTION if exists price_markdown.fn_update_product_group_products_count;

CREATE OR REPLACE FUNCTION price_markdown.fn_update_product_group_products_count(
    p_product_group_id int
)
 RETURNS int
 LANGUAGE plpgsql
AS $function$
 begin
    delete from price_markdown.tb_product_group_products_count where product_group_id = p_product_group_id;

    insert into price_markdown.tb_product_group_products_count 
    (product_group_id,products_count)
    select 
        tpp.pg_id,
        count(pm.product_id) as no_of_products
    from
    "global".tb_pg_product tpp 
    inner join 
    price_markdown.product_master pm on pm.l5_cid =  tpp.product_id
    where pm.clearance_indicator  = 0 and pm.clearance_eligible = 1 
    and tpp.pg_id = p_product_group_id
    and pm.is_active = 1
    group by tpp.pg_id;

    return 1;
end;
$function$
;