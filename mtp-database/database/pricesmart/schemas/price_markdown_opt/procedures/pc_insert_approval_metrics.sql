--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_insert_approval_metrics_v101024 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_approval_metrics

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_approval_metrics(int4, _int4);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_approval_metrics(IN _strategy_id integer, IN _product_level_id integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    declare _is_there integer;
   			delete_query text;
   			inv_table text;
   			products_base_table text;
   			inv_base_table text;
   			temp_table_1 text;
   			ia_temp_table text;
   			fin_temp_table text;
   			base_temp_table text;
   			final_temp_table text;
   			temp_table_1_idx text;
   			ia_temp_table_idx text;
   			fin_temp_table_idx text;
   			base_temp_table_idx text;
   			insert_query text;
   			_start_time text;
   			formatted_ids text;
begin
	if _product_level_id is null then
		delete_query = 'delete from price_markdown.tb_approval_metrics
						where strategy_id = $1';
		execute delete_query using _strategy_id;
		raise notice 'Deleted the data from tb_approval_metrics';
		_start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');
		raise notice 'start_time : %', _start_time;

		temp_table_1 = FORMAT('create unlogged table price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
						as
						(
						select sd.strategy_id, sd.product_level_id, sd.store_level_id, sd.pcd_id, pcd_start_date, pcd_end_date, sd.channel_info,
						approval_status as status, sd.markdown_type as fin_markdown_type, sd.average_retail_price, sdi.markdown_type as ia_markdown_type, action_status,
						sd.markdown_percentage as fin_discount, sdi.markdown_percentage as ia_discount, pcd_number,
						coalesce(lag(sdi.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as ia_previous_markdown_type,
						coalesce(lag(sd.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as fin_previous_markdown_type
						from price_markdown.tb_strategy_discount_%1$s sd
						left join price_markdown.tb_strategy_discount_ia_%1$s sdi
						using(product_level_id, store_level_id, pcd_id)
						join (select pcd_id, pcd_start_date, pcd_end_date, dense_rank() over (partition by strategy_id order by pcd_start_date) pcd_number
						from price_markdown.tb_strategy_pcd
						where strategy_id = %1$s) sp
						using(pcd_id)
						)', _strategy_id, _start_time);
		raise notice 'temp_table_1 query : %', temp_table_1;
		execute temp_table_1;
		temp_table_1_idx = FORMAT('
        CREATE INDEX idx_stg_pcd_temp_%1$s_%2$s
		ON price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, channel_info);', _strategy_id, _start_time);
		raise notice 'temp_table_1_idx : %', temp_table_1_idx;
		execute temp_table_1_idx;

		inv_table = FORMAT('Create unlogged table price_markdown_opt_temp.inv_temp_%1$s_%2$s
							as
							(select product_level_id, store_level_id, channel_info,
							count(distinct tli.store_id) as stores_with_inventory, sum(total_inventory) as inv,
							CASE WHEN SUM(total_inventory) > 0 THEN (SUM(tsssm.price * total_inventory) / SUM(total_inventory))
							                                       ELSE AVG(tsssm.price) END as retail_price
								from global.tb_latest_inventory tli
								join price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
								on tli.product_id = tsssm.product_id
								and tli.store_id = tsssm.store_id
								group by 1,2,3)', _strategy_id, _start_time);
		raise notice 'inv table : %', inv_table;
		execute inv_table;

		products_base_table = FORMAT('Create unlogged table price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
							as
							(select strategy_id, product_level_id, channel_info,
							array_agg(distinct l2_cuq) as dept,
        					array_agg(distinct brand) as mfg,
        					array_agg(distinct l3_cuq) as class,
							array_agg(distinct org_brand) as brand,
							round(avg(tsssm.price::numeric),2) as base_price, avg(pm.cost) as cost,
							case when channel_info = ''Omni'' then avg(max_age)
									when channel_info = ''Store'' then avg(store_age)
									else avg(ecom_age) end as age
								from price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
								join (select product_id, l2_cuq, brand, l3_cuq, org_brand, cost, coalesce(store_age, 0) store_age, coalesce(ecom_age, 0) ecom_age,
										coalesce(max_age, 0) as max_age from price_markdown.product_master) pm
								on tsssm.product_id = pm.product_id
								group by 1,2,3)', _strategy_id, _start_time);
		raise notice 'products_base_table : %', products_base_table;
		execute products_base_table;

	else
		formatted_ids = array_to_string(_product_level_id, ', ');
		delete_query = 'delete from price_markdown.tb_approval_metrics
						where strategy_id = $1
						and product_level_id = any($2)';
		raise notice 'Deleted the data from tb_approval_metrics';
		execute delete_query using _strategy_id, _product_level_id;

		_start_time = to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSMS');

		temp_table_1 = FORMAT('create unlogged table price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
						as
						(
						select sd.strategy_id, sd.product_level_id, sd.store_level_id, sd.pcd_id, pcd_start_date, pcd_end_date, sd.channel_info,
						approval_status as status, sd.markdown_type as fin_markdown_type, sd.average_retail_price, sdi.markdown_type as ia_markdown_type, action_status,
						sd.markdown_percentage as fin_discount, sdi.markdown_percentage as ia_discount, pcd_number,
						coalesce(lag(sdi.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as ia_previous_markdown_type,
						coalesce(lag(sd.markdown_type) over (partition by product_level_id, sd.store_level_id order by pcd_start_date), ''REGULAR PRICE'') as fin_previous_markdown_type
						from price_markdown.tb_strategy_discount_%1$s sd
						left join price_markdown.tb_strategy_discount_ia_%1$s sdi
						using(product_level_id, store_level_id, pcd_id)
						join (select pcd_id, pcd_start_date, pcd_end_date, dense_rank() over (partition by strategy_id order by pcd_start_date) pcd_number
						from price_markdown.tb_strategy_pcd
						where strategy_id = %1$s) sp
						using(pcd_id)
						where product_level_id = any(array[%3$s]::integer[])
						)', _strategy_id, _start_time, formatted_ids);
		raise notice 'temp_table_1 query : %', temp_table_1;
		execute temp_table_1;
		temp_table_1_idx = FORMAT('
        CREATE INDEX idx_stg_pcd_temp_%1$s_%2$s
		ON price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, channel_info);', _strategy_id, _start_time);
		raise notice 'temp_table_1_idx : %', temp_table_1_idx;
		execute temp_table_1_idx;

		inv_table = FORMAT('Create unlogged table price_markdown_opt_temp.inv_temp_%1$s_%2$s
							as
							(select product_level_id, store_level_id, channel_info,
							count(distinct tli.store_id) as stores_with_inventory, sum(total_inventory) as inv,
							CASE WHEN SUM(total_inventory) > 0 THEN (SUM(tsssm.price * total_inventory) / SUM(total_inventory))
							                                       ELSE AVG(tsssm.price) END as retail_price
								from global.tb_latest_inventory tli
								join price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
								on tli.product_id = tsssm.product_id
								and tli.store_id = tsssm.store_id
								where product_level_id = any(array[%3$s]::integer[])
								group by 1,2,3)', _strategy_id, _start_time, formatted_ids);
		raise notice 'inv table : %', inv_table;
		execute inv_table;

		products_base_table = FORMAT('Create unlogged table price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
							as
							(select strategy_id, product_level_id, channel_info,
							array_agg(distinct l2_cuq) as dept,
        					array_agg(distinct brand) as mfg,
        					array_agg(distinct l3_cuq) as class,
							array_agg(distinct org_brand) as brand,
							round(avg(tsssm.price::numeric),2) as base_price, avg(pm.cost) as cost,
							case when channel_info = ''Omni'' then avg(max_age)
									when channel_info = ''Store'' then avg(store_age)
									else avg(ecom_age) end as age
								from price_markdown.tb_strategy_sku_store_mapping_%1$s tsssm
								join (select product_id, l2_cuq, brand, l3_cuq, org_brand, cost, coalesce(store_age, 0) store_age, coalesce(ecom_age, 0) ecom_age,
										coalesce(max_age, 0) as max_age from price_markdown.product_master) pm
								on tsssm.product_id = pm.product_id
								where product_level_id = any(array[%3$s]::integer[])
								group by 1,2,3)', _strategy_id, _start_time, formatted_ids);
		raise notice 'products_base_table : %', products_base_table;
		execute products_base_table;
	end if;

	inv_base_table = FORMAT('create unlogged table price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
							as
							(select product_level_id, pcd_id, spt.channel_info, sum(coalesce(ia.inv,0)) as ia_inv, sum(coalesce(fin.inv,0)) as fin_inv
							from
							price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s spt
							left join
							(select product_level_id, store_level_id, pcd_id, channel_info, coalesce(min(rem_inv) + sum(sales_units),0) as inv
							from price_markdown.tb_agg_ia_%1$s group by 1,2,3,4) ia
							using(product_level_id, store_level_id, pcd_id)
							left join
							(select product_level_id, store_level_id, pcd_id, channel_info, coalesce(min(rem_inv) + sum(sales_units),0) as inv
							from price_markdown.tb_agg_fin_%1$s group by 1,2,3,4) fin
							using(product_level_id, store_level_id, pcd_id)
							group by 1,2,3)', _strategy_id, _start_time);
		raise notice 'inv_base_table : %', inv_base_table;
		execute inv_base_table;

	ia_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s
							as
							select *,
							coalesce(lag(ia_discount) over (partition by product_level_id, channel_info order by pcd_start_date),0) as ia_previous_discount,
							coalesce(lag(ia_pcd_price) over (partition by product_level_id, channel_info order by pcd_start_date), retail_price) as ia_previous_pcd_price
							from
							(select sp.strategy_id, sp.product_level_id, sp.pcd_id, sp.channel_info, sp.pcd_start_date,
							avg(retail_price) as retail_price,
							coalesce(CASE WHEN SUM(inv) > 0 THEN (SUM(effective_price_point * inv) / SUM(inv))
							                                       ELSE AVG(effective_price_point) END,
																   AVG(average_retail_price*(100-ia_discount)/100)) as ia_pcd_price,
							coalesce(sum(sales_units),0) as ia_units,
							coalesce(sum(revenue),0) as ia_revenue,
							coalesce(sum(margin),0) as ia_margin,
							coalesce(sum(spend),0) as ia_markdown_spend,
							coalesce(min(rem_inv) + sum(sales_units),0) as ia_inventory,
							array_agg(distinct ia_markdown_type) ia_markdown_type,
							array_agg(distinct ia_previous_markdown_type) ia_previous_markdown_type,
							case when sum(inv) > 0 then sum(ia_discount*inv)/sum(inv)
									else avg(ia_discount) end as ia_discount
							from (select strategy_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, ia_discount,
							ia_markdown_type, ia_previous_markdown_type, average_retail_price from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
							left join price_markdown.tb_agg_ia_%1$s
							using(product_level_id, store_level_id, pcd_id)
							left join price_markdown_opt_temp.inv_temp_%1$s_%2$s i
							on sp.product_level_id = i.product_level_id
							and sp.store_level_id = i.store_level_id
							group by 1,2,3,4,5) ia_m', _strategy_id, _start_time);
	raise notice 'ia_temp_table created : %', ia_temp_table;
	execute ia_temp_table;
	ia_temp_table_idx = FORMAT('
        CREATE INDEX idx_ia_metrics_temp_%1$s_%2$s
		ON price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, channel_info);', _strategy_id, _start_time);
	raise notice 'ia_temp_table_idx : %', ia_temp_table_idx;
	execute ia_temp_table_idx;

	fin_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s
							as
							select *,
							coalesce(lag(fin_discount) over (partition by product_level_id, channel_info order by pcd_start_date),0) as fin_previous_discount,
							coalesce(lag(fin_pcd_price) over (partition by product_level_id, channel_info order by pcd_start_date), retail_price) as fin_previous_pcd_price
							from
							(select sp.strategy_id, sp.product_level_id, sp.pcd_id, sp.channel_info, sp.pcd_start_date,
							avg(retail_price) as retail_price,
							coalesce(CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
							                                       ELSE AVG(effective_price_point) END,
																   AVG(average_retail_price*(100-fin_discount)/100)) as fin_pcd_price,
							coalesce(sum(sales_units),0) as fin_units,
							coalesce(sum(revenue),0) as fin_revenue,
							coalesce(sum(margin),0) as fin_margin,
							coalesce(sum(spend),0) as fin_markdown_spend,
							coalesce(min(rem_inv) + sum(sales_units),0) as fin_inventory,
							 array_agg(distinct fin_markdown_type) fin_markdown_type,
							 array_agg(distinct fin_previous_markdown_type) fin_previous_markdown_type,
							case when sum(inv) > 0 then sum(fin_discount*inv)/sum(inv)
								else avg(fin_discount) end as fin_discount
							from (select strategy_id, channel_info, product_level_id, store_level_id, pcd_id, pcd_start_date, fin_discount,
							fin_markdown_type, fin_previous_markdown_type, average_retail_price from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s) sp
							left join price_markdown.tb_agg_fin_%1$s
							using(product_level_id, store_level_id, pcd_id)
							left join price_markdown_opt_temp.inv_temp_%1$s_%2$s i
							on sp.product_level_id = i.product_level_id
							and sp.store_level_id = i.store_level_id
							group by 1,2,3,4,5) fin_m', _strategy_id, _start_time);
	raise notice 'fin_temp_table created : %', fin_temp_table;
	execute fin_temp_table;
	fin_temp_table_idx = FORMAT('
        CREATE INDEX idx_fin_metrics_temp_%1$s_%2$s
		ON price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, channel_info);', _strategy_id, _start_time);
	raise notice 'fin_temp_table_idx : %', fin_temp_table_idx;
	execute fin_temp_table_idx;

	base_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.base_temp_%1$s_%2$s
							as
								(select strategy_id, product_level_id, pcd_id, a.pcd_start_date, pcd_end_date, channel_info, pcd_number,
								status, action_status, stores_with_inventory,
								ia.ia_markdown_type,
								fin.fin_markdown_type,
								ia.ia_discount,
								fin.fin_discount,
								ia.ia_pcd_price,
								fin.fin_pcd_price,
								ia_units,
								fin_units,
								ia_revenue,
								fin_revenue,
								ia_margin,
								fin_margin,
								ia_markdown_spend,
								fin_markdown_spend,
								ia_inventory,
								fin_inventory,
								ia_previous_discount, fin_previous_discount,
								ia_previous_markdown_type,
								fin_previous_markdown_type,
								ia_previous_pcd_price, fin_previous_pcd_price
								from (select distinct strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, pcd_number,
								status, action_status from price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s
								where status != ''Not Approved'') a
								join price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s fin
								using(strategy_id, product_level_id, pcd_id, channel_info)
								left join price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s ia
								using(strategy_id, product_level_id, pcd_id, channel_info)
								left join (select product_level_id, channel_info, sum(stores_with_inventory) stores_with_inventory
											from price_markdown_opt_temp.inv_temp_%1$s_%2$s group by 1,2) i
								using(product_level_id, channel_info)
								)', _strategy_id, _start_time);
	raise notice 'base_temp_table : %', base_temp_table;
	execute base_temp_table;
	raise notice 'base temp table created';
	base_temp_table_idx = FORMAT('
        CREATE INDEX idx_base_temp_%1$s_%2$s
		ON price_markdown_opt_temp.base_temp_%1$s_%2$s (strategy_id, product_level_id, pcd_id, channel_info);', _strategy_id, _start_time);
	raise notice 'base_temp_table_idx : %', base_temp_table_idx;
	execute base_temp_table_idx;

	final_temp_table = FORMAT('create unlogged table price_markdown_opt_temp.approval_final_temp_%1$s_%2$s
							as
								(select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date, channel_info, pcd_number,
								status, action_status, stores_with_inventory,
								ia_markdown_type,
								fin_markdown_type,
								ia_discount,
								fin_discount,
								ia_pcd_price,
								fin_pcd_price,
								ia_units,
								fin_units,
								ia_revenue,
								fin_revenue,
								ia_margin,
								fin_margin,
								ia_markdown_spend,
								fin_markdown_spend,
								ia_inv as ia_inventory,
								fin_inv as fin_inventory,
								ia_previous_discount, fin_previous_discount,
								ia_previous_markdown_type,
								fin_previous_markdown_type,
								ia_previous_pcd_price, fin_previous_pcd_price,
								dept, class, brand, mfg, base_price, (ia_inventory*cost) as ia_inventory_cost, (fin_inventory*cost) as fin_inventory_cost,
								round(age) as age
								from price_markdown_opt_temp.base_temp_%1$s_%2$s
								join price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s
								using(strategy_id, product_level_id, channel_info)
								join price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s
								using(product_level_id, pcd_id, channel_info)
								)', _strategy_id, _start_time);
	raise notice 'base_temp_table : %', final_temp_table;
	execute final_temp_table;
	insert_query = FORMAT(' insert into price_markdown.tb_approval_metrics_%1$s
							(select strategy_id, product_level_id, pcd_id, pcd_start_date, pcd_end_date,
							channel_info, ia_markdown_type, fin_markdown_type, stores_with_inventory,
							status, ia_discount, fin_discount, ia_previous_discount, fin_previous_discount,
							ia_pcd_price, fin_pcd_price,
							(ia_discount-ia_previous_discount)*100/(100-ia_previous_discount) as ia_incremental_discount,
							(fin_discount-fin_previous_discount)*100/(100-fin_previous_discount) as fin_incremental_discount,
							ia_previous_pcd_price, fin_previous_pcd_price,
							ia_units, fin_units, ia_revenue, fin_revenue, ia_margin, fin_margin,
							coalesce(ia_margin/nullif(ia_revenue,0),0)*100 as ia_gm_percent,
							coalesce(fin_margin/nullif(fin_revenue,0),0)*100 as fin_gm_percent,
							coalesce(ia_units/nullif(ia_inventory,0),0)*100 as ia_sellthrough,
							coalesce(fin_units/nullif(fin_inventory,0),0)*100 as fin_sellthrough,
							coalesce(ia_margin/nullif(ia_units,0),0) as ia_aum,
							coalesce(fin_margin/nullif(fin_units,0),0) as fin_aum,
							ia_markdown_spend, fin_markdown_spend, ia_inventory, fin_inventory, action_status, ia_previous_markdown_type,
							fin_previous_markdown_type, pcd_number,
							dept, class, brand, mfg, base_price, ia_inventory_cost, fin_inventory_cost, current_timestamp as updated_at, age
							from price_markdown_opt_temp.approval_final_temp_%1$s_%2$s)', _strategy_id, _start_time);
	raise notice 'inserted into approval metrics : %', insert_query;
	execute insert_query;

	execute FORMAT('drop table if exists price_markdown_opt_temp.stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.approval_prod_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.approval_inv_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.base_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.inv_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop index if exists price_markdown_opt_temp.idx_stg_pcd_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop index if exists price_markdown_opt_temp.idx_ia_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop index if exists price_markdown_opt_temp.idx_fin_metrics_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop index if exists price_markdown_opt_temp.idx_base_temp_%1$s_%2$s', _strategy_id, _start_time);
	execute FORMAT('drop table if exists price_markdown_opt_temp.approval_final_temp_%1$s_%2$s', _strategy_id, _start_time);

	raise notice 'Dropped all temp tables';

end;
$procedure$
;
