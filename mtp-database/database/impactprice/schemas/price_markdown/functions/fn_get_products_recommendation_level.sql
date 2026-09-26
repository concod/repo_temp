--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_products_recommendation_level_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_get_products_recommendation_level_8
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_products_recommendation_level;


CREATE OR REPLACE FUNCTION price_markdown.fn_get_products_recommendation_level(p_strategy_id integer, p_product_recommendation_level integer, p_product_ids bigint[])
 RETURNS TABLE(product_id bigint, product_level_id bigint, product_level_value text, price double precision, cost double precision, last_reg_price_ecom real, last_reg_price_bnm real, msrp real, currency_id integer, msrp_with_vat real)
 LANGUAGE plpgsql
AS $function$
	begin
	return query

		with product_group_data_cte as (
		    select
		        smc.product_id,
		        tpg.pg_id,
				tpg.pg_name
		    from
			   (select unnest(p_product_ids) product_id) smc
               inner join pricesmart.product_master pm on pm.product_id = smc.product_id
		        inner join pricesmart.tb_pg_product tpp on pm.product_id = tpp.product_id
				left join pricesmart.tb_product_group tpg on tpp.pg_id = tpg.pg_id
			where tpg.pg_id in (
				select product_group_id from price_markdown.tb_strategy_product_groups
				where strategy_id = p_strategy_id
			)
		)
		select
			pm.product_id::bigint,
			(
				case
                    when prlc."name" = 'l7' then pm.product_id
                    when prlc."name" = 'l6' then pm.customer_choice_id
					when prlc."name" = 'l5' then pm.l5_cid
					when prlc."name" = 'l4' then pm.l4_cid
					when prlc."name" = 'l3' then pm.l3_cid
					when prlc."name" = 'l2' then pm.l2_cid
					when prlc."name" = 'l1' then pm.l1_cid
                    when prlc."name" = 'l0' then pm.l0_cid
					when prlc."name" = '-200' then -200
                    else pgdc.pg_id
				end
			)::bigint as product_recommendation_level,
			(
				case
					when prlc."name" = 'l7' then pm.product_name::text
					when prlc."name" = 'l6' then pm.customer_choice_description::text
					when prlc."name" = 'l5' then pm.l5_cuq::text
					when prlc."name" = 'l4' then pm.l4_cuq::text
					when prlc."name" = 'l3' then pm.l3_cuq::text
					when prlc."name" = 'l2' then pm.l2_cuq::text
					when prlc."name" = 'l1' then pm.l1_cuq::text
					when prlc."name" = 'l0' then pm.l0_cuq::text
					when prlc."name" = '-200' then 'Overall'::text
                    else pgdc.pg_name::text
				end
			) as product_recommendation_value,
            pm.current_price::double precision  as price,
            pm."cost"::double precision as cost,
            pm.last_reg_price_ecom,
            pm.last_reg_price_bnm::real,
            pm.msrp,
			pm.currency_id,
			pm.msrp_with_vat
		from
		 (select
					"name" as name
				from
					price_markdown.tb_view_by_config tvbc
				where
					tvbc.category = 'product_level'
					and tvbc.value = p_product_recommendation_level
			) prlc,
			pricesmart.product_master pm
			left join product_group_data_cte pgdc
			on pgdc.product_id = pm.product_id
		where pm.product_id = any(p_product_ids);

	END;
$function$
;
