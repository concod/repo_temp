--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_refresh_product_group_products_count_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added is_active, fn_refresh_product_group_products_count_3

DROP FUNCTION if exists price_markdown.fn_refresh_product_group_products_count;

CREATE OR REPLACE FUNCTION price_markdown.fn_refresh_product_group_products_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 begin
    delete from price_markdown.tb_product_group_products_count;

    insert into price_markdown.tb_product_group_products_count(product_group_id, products_count)
    select
        tpp.pg_id,
        count(pm.product_id) as no_of_products
    from
    	"global".tb_pg_product tpp
    inner join
    	price_markdown.product_master pm on pm.product_id =  tpp.product_id
    where
		pm.is_active = 1
		and pm.clearance_indicator  = 0
    group by
		tpp.pg_id;
    return 1;
end;
$function$
;