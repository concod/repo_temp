--liquibase formatted sql
--changeset liquibase:fn_opt_qc_strategy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_opt_qc_strategy

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_qc_strategy(_strategy_id integer);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_qc_strategy(_strategy_id integer)
 RETURNS TABLE(qc_date date, strategy_id integer, ia_duplicate_dates integer, ia_duplicate_promo integer, ia_no_of_dates integer, ia_missing_sku_store integer, fin_duplicate_dates integer, fin_duplicate_promo integer, fin_no_of_dates integer, actual_duplicate_dates integer, actual_duplicate_promo integer)
 LANGUAGE plpgsql
AS $function$
declare
    qc_date date;
    strategy_id integer;
    ia_table_exists integer;
    ia_duplicate_dates integer;
    ia_duplicate_promo integer;
    ia_missing_sku_store integer;
    ia_no_of_dates integer;
    fin_table_exists integer;
    fin_duplicate_dates integer;
    fin_duplicate_promo integer;
    fin_no_of_dates integer;
    actual_table_exists integer;
    actual_duplicate_dates integer;
    actual_duplicate_promo integer;
   _ia_query text;
 	_fin_query text;
 	_act_query text;

BEGIN
    execute format('SELECT count(*) from price_markdown.tb_ssd_ia_%1$s;', _strategy_id) into ia_table_exists;
    execute('SELECT count(*) from price_markdown.tb_ssd_fin_' || _strategy_id ) INTO fin_table_exists;
	execute('SELECT count(*) from price_markdown.tb_ssd_actual_' || _strategy_id ) INTO actual_table_exists;

    IF ia_table_exists > 0 THEN
      _ia_query = FORMAT('with base as (
				select recommendation_date, pcd_id, product_id, store_id, recommended_offer_percentage
				from price_markdown.tb_ssd_ia_%1$s
				),

				row_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_dates
				FROM (SELECT recommendation_date, product_id, store_id, COUNT(recommendation_date) cnt_dates
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_dates > 1),

				promo_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_promo
				FROM (SELECT pcd_id, product_id, store_id, COUNT(distinct recommended_offer_percentage) cnt_promo
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_promo > 1
				),

				no_of_dates as (
				select id, case when no_of_days = no_of_days_master
				                then 0 else 1
				           end as no_of_days
				from (
					select v1.id, v1.no_of_days, v2.no_of_days_master
					from (select 1 as id, count(distinct recommendation_date) as no_of_days from base ) v1
					inner join (
							select 1 as id, (end_date - start_date)+1 as no_of_days_master
							from price_markdown.tb_strategy_master
							where strategy_id = %1$s) v2
					using(id)) tab
				),

				missing_sku_store_check as
				(
					select 1 as id, case when count(*) > 0 then 1 else 0 end as missing_sku_store
					from
					price_markdown.tb_strategy_sku_store_mapping_%1$s ssm
					join (select distinct product_id, store_id from pricesmart.tb_latest_inventory ) inv
					on ssm.product_id = inv.product_id
					and ssm.store_id = inv.store_id
					left join (select distinct product_id, store_id from price_markdown.tb_ssd_ia_%1$s) ssd
					on ssm.product_id = ssd.product_id
					and ssm.store_id = ssm.store_id
					where ssd.product_id is null
				)

				select t1.no_of_duplicate_dates, t2.no_of_duplicate_promo, t3.no_of_days, t4.missing_sku_store
				from row_check t1
				inner join promo_check t2
				using(id)
				inner join no_of_dates t3
				using(id)
				inner join missing_sku_store_check t4
				using(id);', _strategy_id);
			raise notice '_ia_query : %', _ia_query;
			execute _ia_query INTO ia_duplicate_dates, ia_duplicate_promo, ia_no_of_dates, ia_missing_sku_store;
    ELSE
        ia_duplicate_dates := 0;
        ia_duplicate_promo := 0;
        ia_no_of_dates := 0;
        ia_missing_sku_store := 0;
    END IF;


    IF fin_table_exists > 0 THEN
        _fin_query = FORMAT('with base as (
				select recommendation_date, pcd_id, product_id, store_id, recommended_offer_percentage
				from price_markdown.tb_ssd_fin_%1$s
				),

				row_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_dates
				FROM (SELECT recommendation_date, product_id, store_id, COUNT(recommendation_date) cnt_dates
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_dates > 1),

				promo_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_promo
				FROM (SELECT pcd_id, product_id, store_id, COUNT(distinct recommended_offer_percentage) cnt_promo
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_promo > 1
				),
				no_of_dates as (
				select id, case when no_of_days = no_of_days_master
				                then 0 else 1
				           end as no_of_days
				from (
					select v1.id, v1.no_of_days, v2.no_of_days_master
					from (select 1 as id, count(distinct recommendation_date) as no_of_days from base ) v1
					inner join (
							select 1 as id, (end_date - start_date)+1 as no_of_days_master
							from price_markdown.tb_strategy_master
							where strategy_id = %1$s) v2
					using(id)) tab
				)

				select t1.no_of_duplicate_dates, t2.no_of_duplicate_promo, t3.no_of_days, %1$s as strategy_id,
				current_date as qc_date
				from row_check t1
				inner join promo_check t2
				using(id)
				inner join no_of_dates t3
				using(id);', _strategy_id);
			raise notice '_fin_query : %', _fin_query;
			execute _fin_query INTO fin_duplicate_dates, fin_duplicate_promo, fin_no_of_dates, strategy_id, qc_date;
    ELSE
        fin_duplicate_dates := 0;
        fin_duplicate_promo := 0;
        fin_no_of_dates := 0;
    END IF;

    IF actual_table_exists > 0 THEN
        _act_query = FORMAT('with base as (
				select recommendation_date, pcd_id, product_id, store_id, recommended_offer_percentage
				from price_markdown.tb_ssd_actual_%1$s
				),

				row_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_dates
				FROM (SELECT recommendation_date, product_id, store_id, COUNT(recommendation_date) cnt_dates
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_dates > 1),

				promo_check as (
				SELECT 1 as id, COUNT(*) AS no_of_duplicate_promo
				FROM (SELECT pcd_id, product_id, store_id, COUNT(distinct recommended_offer_percentage) cnt_promo
					   FROM base
					   GROUP BY 1,2,3) tab
				WHERE cnt_promo > 1
				)

				select current_date as qc_date, %1$s as strategy_id,
                       t1.no_of_duplicate_dates, t2.no_of_duplicate_promo
				from row_check t1
				inner join promo_check t2
				using(id);', _strategy_id);
			raise notice '_act_query : %', _act_query;
			execute _act_query INTO qc_date, strategy_id, actual_duplicate_dates, actual_duplicate_promo;
    ELSE
        actual_duplicate_dates := 0;
        actual_duplicate_promo := 0;
    END IF;

    RETURN QUERY SELECT qc_date, strategy_id,
    					ia_duplicate_dates, ia_duplicate_promo, ia_no_of_dates, ia_missing_sku_store,
                        fin_duplicate_dates, fin_duplicate_promo, fin_no_of_dates,
                        actual_duplicate_dates, actual_duplicate_promo;
END;
$function$
;
