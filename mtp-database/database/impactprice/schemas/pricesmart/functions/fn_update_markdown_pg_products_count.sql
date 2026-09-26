--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_update_markdown_pg_products_count_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_update_markdown_pg_products_count_1

DROP FUNCTION if exists pricesmart.fn_update_markdown_pg_products_count;


CREATE OR REPLACE FUNCTION pricesmart.fn_update_markdown_pg_products_count(p_product_group_id integer, p_products_count integer DEFAULT NULL::integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    delete from price_markdown.tb_product_group_products_count 
    where product_group_id = p_product_group_id;

    if p_products_count is not null then
        insert into price_markdown.tb_product_group_products_count 
        (product_group_id, products_count)
        values (p_product_group_id, p_products_count);
    else
        insert into 
			price_markdown.tb_product_group_products_count(product_group_id, products_count) 
		select 
		    tpp.pg_id,
		    count(pm.product_id) as no_of_products
		from
		    "pricesmart".tb_pg_product tpp 
		inner join 
		    price_markdown.product_master pm on pm.product_id = tpp.product_id
		where 
		    pm.clearance_indicator = 0 
		    and tpp.pg_id = p_product_group_id 
		    and pm.is_active = 1
		group by 
			tpp.pg_id;
    end if;

    return 1;
END;
$function$
;
