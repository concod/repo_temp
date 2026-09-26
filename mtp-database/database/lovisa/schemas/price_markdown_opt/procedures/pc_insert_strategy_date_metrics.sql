--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_insert_strategy_date_metrics_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_strategy_date_metrics

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_strategy_date_metrics;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_strategy_date_metrics(IN _strategy_id integer, IN _version text, IN _start_date date, IN _currency_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare delete_query text;
   			insert_query text;
begin
	delete_query = FORMAT('delete from price_markdown.tb_strategy_date_metrics_%1$s_%4$s_%2$s
					where recommendation_date >= %3$L;', _version, _strategy_id, _start_date, _currency_type);

	execute delete_query;
	raise notice 'deleted data from strategy date metrics % table', _version;
	raise notice 'delete_query : %', delete_query;

	insert_query = FORMAT('
							insert into price_markdown.tb_strategy_date_metrics_%2$s_%4$s_%1$s (strategy_id, currency_id, pcd_id, recommendation_date, sku_count, store_count, is_approved,
							clearance_discount, margin, sales_units, revenue, inventory, inventory_cost, inventory_retail, spend,
							margin_with_vat, revenue_with_vat, inventory_retail_with_vat, spend_with_vat)
							(
							with approval_status as
							(
							select strategy_id, currency_id, pcd_id, product_level_id, store_level_id,
							case when approval_status = ''Not Approved'' then 0 else 1 end as is_approved
							from price_markdown.tb_strategy_discount_%4$s_%1$s
							),
							pcd_dates as
							(
							select pcd_id, date as recommendation_date from price_markdown.tb_strategy_pcd a
							join global.tb_fiscal_date_mapping b
							on b.date between pcd_start_date and pcd_end_date
							and a.strategy_id = %1$s
							)
							select 
								strategy_id, aps.currency_id, pcd_id, recommendation_date, sku_count, store_count, is_approved,
								avg(recommended_offer_percentage) as clearance_discount, sum(coalesce(margin,0)) as margin, 
								sum(coalesce(sales_units,0)) as sales_units,
								sum(coalesce(revenue,0)) as revenue, sum(coalesce(rem_inv+sales_units,0)) as inventory,
								sum(coalesce(inventory_cost,0)) as inventory_cost,
								sum(coalesce(((rem_inv+sales_units)*effective_price_point),0)) as inventory_retail,
								sum(coalesce(spend)) as spend,
								sum(coalesce(margin_with_vat)) as margin_with_vat,
								sum(coalesce(revenue_with_vat)) as revenue_with_vat,
								sum(coalesce((rem_inv+sales_units)*effective_price_point_with_vat)) as inventory_retail_with_vat,
								sum(coalesce(spend_with_vat)) as spend_with_vat
							from approval_status aps
							join pcd_dates
							using(pcd_id)
							left join price_markdown.tb_strategy_sku_store_count
							using(strategy_id)
							left join price_markdown.tb_agg_%2$s_%4$s_%1$s tai
							using(strategy_id, pcd_id, product_level_id, store_level_id, recommendation_date)
							left join (
								select strategy_id, currency_id, pcd_id, product_level_id, store_level_id, recommendation_date,
								sum((rem_inv+sales_units)*cost) as inventory_cost
								from price_markdown.tb_ssd_%2$s_%4$s_%1$s tsi
								join price_markdown.product_master pm
								using(product_id, currency_id)
								where recommendation_date >= %3$L
								group by 1,2,3,4,5,6
								) inv_cost
							using(strategy_id, pcd_id, product_level_id, store_level_id,recommendation_date)
							where strategy_id = %1$s
							and recommendation_date >= %3$L
							group by 1,2,3,4,5,6,7);', _strategy_id, _version, _start_date, _currency_type);

					raise notice 'inserting data into tb strategy date metrics % ', _version;
				raise notice 'insert_query : %', insert_query;
			execute insert_query;

end;
$procedure$
;
