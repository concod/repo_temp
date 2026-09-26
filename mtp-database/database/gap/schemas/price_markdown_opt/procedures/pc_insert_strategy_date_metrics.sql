--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_insert_strategy_date_metrics_30122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_strategy_date_metrics

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_strategy_date_metrics(int4, text, date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_strategy_date_metrics(IN _strategy_id integer, IN _version text, IN _start_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare delete_query text;
   			insert_query text;
begin
	delete_query = FORMAT('delete from price_markdown.tb_strategy_date_metrics_%2$s_%1$s
					where recommendation_date >= %3$L;', _strategy_id, _version, _start_date);

	execute delete_query;
	raise notice 'deleted data from strategy date metrics % table', _version;
	raise notice 'delete_query : %', delete_query;


	insert_query = FORMAT('
			insert into price_markdown.tb_strategy_date_metrics_%2$s_%1$s (
                strategy_id, currency_id, pcd_id, recommendation_date, sku_count, store_count, is_approved,
                clearance_discount, margin, sales_units, revenue, inventory, inventory_cost, inventory_retail, spend,
                margin_with_vat, revenue_with_vat, inventory_retail_with_vat, spend_with_vat
            )
            with approval_status as (
                select strategy_id, currency_id, pcd_id, product_level_id, store_level_id,
                case when approval_status = ''Not Approved'' then 0 else 1 end as is_approved
                from price_markdown.tb_strategy_discount_%1$s
            ),
            pcd_dates as (
                select pcd_id, date as recommendation_date 
                from price_markdown.tb_strategy_pcd a
                join global.tb_fiscal_date_mapping b
                  on b.date between pcd_start_date and pcd_end_date
                where a.strategy_id = %1$s
            ),
            agg_stg as (
                select product_level_id, store_level_id, strategy_id, recommendation_date,
                    avg(recommended_offer_percentage) as clearance_discount, 
                    sum(coalesce(margin,0)) as margin, 
                    sum(coalesce(sales_units,0)) as sales_units,
                    sum(coalesce(revenue,0)) as revenue, 
                    sum(coalesce(rem_inv+sales_units,0)) as inventory,
                    sum(coalesce(((rem_inv+sales_units)*effective_price_point),0)) as inventory_retail,
                    sum(coalesce(spend,0)) as spend,
                    sum(coalesce(margin_with_vat,0)) as margin_with_vat,
                    sum(coalesce(revenue_with_vat,0)) as revenue_with_vat,
                    sum(coalesce(((rem_inv+sales_units)*effective_price_point_with_vat),0)) as inventory_retail_with_vat,
                    sum(coalesce(spend_with_vat,0)) as spend_with_vat
                from price_markdown.tb_agg_%2$s_%1$s
                where recommendation_date >= %3$L
                group by 1,2,3,4
            ),
            ssd_stg as (
                select strategy_id, recommendation_date, product_level_id, store_level_id,
                    sum((rem_inv+sales_units)*cost) as inventory_cost
                from price_markdown.tb_ssd_%2$s_%1$s tsi
                join price_markdown.product_master pm
                using(product_id, currency_id)
                where recommendation_date >= %3$L
                group by 1,2,3,4
            ),
            joins_all as (
                select 
                    aps.*, pd.recommendation_date, sc.sku_count, sc.store_count,
                    agg.clearance_discount, agg.margin, agg.sales_units, agg.revenue, agg.inventory,
                    agg.inventory_retail, agg.spend, agg.margin_with_vat, agg.revenue_with_vat,
                    agg.inventory_retail_with_vat, agg.spend_with_vat, ssd.inventory_cost
                from approval_status aps
                join pcd_dates pd using(pcd_id)
                left join price_markdown.tb_strategy_sku_store_count sc using(strategy_id)
                left join agg_stg agg using(strategy_id, recommendation_date, product_level_id, store_level_id)
                left join ssd_stg ssd using(strategy_id, recommendation_date, product_level_id, store_level_id)
            )
            select 
                strategy_id, currency_id, pcd_id, recommendation_date, sku_count, store_count, is_approved,
                avg(clearance_discount), sum(margin), sum(sales_units), sum(revenue), sum(inventory),
                sum(inventory_cost), sum(inventory_retail), sum(spend),
                sum(margin_with_vat), sum(revenue_with_vat), sum(inventory_retail_with_vat), sum(spend_with_vat)
            from joins_all
            group by 1,2,3,4,5,6,7;', _strategy_id, _version, _start_date);

	raise notice 'inserting data into tb strategy date metrics % ', _version;
	raise notice 'insert_query : %', insert_query;

	execute insert_query;

end;
$procedure$
;
