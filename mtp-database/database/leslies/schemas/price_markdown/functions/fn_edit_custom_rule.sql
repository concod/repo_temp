--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_edit_custom_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_edit_custom_rule
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_edit_custom_rule;
CREATE OR REPLACE FUNCTION price_markdown.fn_edit_custom_rule(_rule_id integer, _rule_name text, _rule_description text, _rule_flexibility_type_id integer, _product_group integer[], _product_selection bigint[], _rule_product_level integer, _store_group integer[], _store_selection bigint[], _rule_store_level integer, _updated_rows_flag boolean, _no_updates_on_table_data boolean, _updated_rows jsonb, _rule_values jsonb, _user_id integer)
 RETURNS integer
	LANGUAGE plpgsql
AS $function$
DECLARE
	current_rule_details price_markdown.tb_rule_master%ROWTYPE;
	update_values_arr text[];
	update_str text;
	pg_change bool := false;
	product_change bool := false;
	to_be_deleted_product_groups_arr int4[];
	new_product_groups_arr int4[];
	query text;
	to_be_deleted_products_arr int4[];
	new_products_arr int4[];
	final_query text;
	_new_rule_id int;
	to_be_deleted_store_groups_arr int4[];
	new_store_groups_arr int4[];
	_active_strategies int[];

	new_products bigint[];
	deleted_products bigint[];
	new_stores bigint[];
	deleted_stores bigint[];
	union1_query text:= '';
	union2_query text:= '';
	sku_store_insert_flag bool:= false;
	is_sku_store_reco_level_same bool;
	sku_store_combo_delete_cte text:= '';
	_products_count int;
	_stores_count int;
begin
	-- Return if rule_id is null.
	if _rule_id is null then
		raise notice 'Rule ID not provided';
		return null::integer;
	end if;

	-- Fetch rule info.
	select * from price_markdown.tb_rule_master where rule_id = _rule_id into current_rule_details;

	select array_agg(strategy_id) into _active_strategies
		from price_markdown.tb_strategy_rule
		where constraint_id = _rule_id
			and constraint_type = 0
			and price_markdown.fn_check_is_active_strategy(strategy_id);

	if (
		_active_strategies is not null
		) then
		_new_rule_id = price_markdown.fn_copy_rule(_rule_id,_user_id,price_markdown.fn_get_rule_old_version(current_rule_details.rule_name));
		update price_markdown.tb_strategy_rule
			set constraint_id = _new_rule_id
			where constraint_id = _rule_id
				and constraint_type = 0
				and strategy_id = any(_active_strategies);
	end if;




	-- Updation of rule name.
	if current_rule_details.rule_name <> _rule_name then
		raise notice 'Rule name changed';
		update_values_arr := array_append(update_values_arr, 'rule_name = ''' || _rule_name || ''' ');
	end if;

	-- Updation of rule description.
	if _rule_description is not null and current_rule_details.rule_description <> _rule_description then
		raise notice 'Rule desc changed';
		raise notice 'current - % ___  new - %',current_rule_details.rule_description, _rule_description;
		update_values_arr := array_append(update_values_arr, 'rule_description = ''' || _rule_description || ''' ');
	end if;

	-- Updation of rule flexibility_type.
	if _rule_flexibility_type_id is not null and current_rule_details.rule_flexibility_type_id <> _rule_flexibility_type_id then
		raise notice 'Rule flexibility changed';
		raise notice 'current - % ___  new - %',current_rule_details.rule_flexibility_type_id, _rule_flexibility_type_id;
		update_values_arr := array_append(update_values_arr, 'rule_flexibility_type_id = ' || _rule_flexibility_type_id);
	end if;

	-- Updation of rule product_level.
	if _rule_product_level is not null and current_rule_details.rule_product_level <> _rule_product_level then
		raise notice 'Rule product level changed';
		update_values_arr := array_append(update_values_arr, 'rule_product_level = ' || _rule_product_level);
	end if;

	-- Updation of rule store_level.
	if _rule_store_level is not null and current_rule_details.rule_store_level <> _rule_store_level then
		raise notice 'Rule store level changed';
		update_values_arr := array_append(update_values_arr, 'rule_store_level = ' || _rule_store_level);
	end if;

	-- Updation of rule products count.
	_products_count = array_length(_product_selection, 1);
	if _products_count is not null and  current_rule_details.products_count <> _products_count then
		raise notice 'Rule products count changed';
		update_values_arr := array_append(update_values_arr, 'products_count = ' || _products_count);
	end if;

	-- Updation of rule stores count.
	_stores_count = array_length(_product_selection, 1);
	if _stores_count is not null and  current_rule_details.stores_count <> _stores_count then
		raise notice 'Rule stores count changed';
		update_values_arr := array_append(update_values_arr, 'stores_count = ' || _stores_count);
	end if;

	-- Updation of rule info in price_markdown.tb_rule_master.
	if array_length(update_values_arr, 1) > 0 then
		update_values_arr := array_append(update_values_arr, 'updated_by = ' || _user_id);
		update_str := 'update price_markdown.tb_rule_master set '|| array_to_string(update_values_arr, ', ', '') || ' where rule_id = ' || _rule_id || ';';
		raise notice ' final query - %',update_str;
		execute update_str;
	end if;

	-- if there is no change which will effect the step 2 data, then _no_updates_on_table_data is true.
	if _no_updates_on_table_data = false then
		raise notice 'performing discounts/applicable_value update';
		-- if only discounts got updated, no changes on table schema level, then _updated_rows_flag is true.
		if _updated_rows_flag = true then
			final_query = format('	update
										price_markdown.tb_rule_discount trd
									set
										min_value = new_rule.min_value,
										max_value = new_rule.max_value,
										applicable_value = new_rule.applicable_value
									from (
											select
												%1$s as rule_id,
												*
											from
												jsonb_to_recordset(''%2$s'') as rules_data(product_level_id int4, store_level_id int4, product_level_value text, store_level_value text,  min_value float4, max_value float4, applicable_value _float4)
									) new_rule
									where trd.rule_id = new_rule.rule_id and trd.product_level_id = new_rule.product_level_id and trd.store_level_id = new_rule.store_level_id
									',_rule_id::text, _updated_rows::text);
			raise notice 'final_query  %', final_query;
			execute final_query;
		else
			raise notice 'performing, delete and insert.';
			-- in another case performing, delete and insert.
			final_query = format('	with new_rule_data_cte as (
										select
											*
										from
											(
												select
													%1$s as rule_id,
													*
												from
													jsonb_to_recordset(''%2$s'') as rules_data(product_level_id int4, store_level_id int4, product_level_value text, store_level_value text,  min_value float4, max_value float4, applicable_value _float4)
											)new_rule_data
									),
									delete_old_rule_data as(
										delete from price_markdown.tb_rule_discount trd where trd.rule_id = %1$s
									)
									insert into price_markdown.tb_rule_discount (rule_id, product_level_id, store_level_id, product_level_value, store_level_value, min_value, max_value, applicable_value)
									select
										nrd.rule_id,
										nrd.product_level_id,
										nrd.store_level_id,
										nrd.product_level_value,
										nrd.store_level_value,
										nrd.min_value,
										nrd.max_value,
										nrd.applicable_value
									from
										new_rule_data_cte nrd
									',_rule_id::text, _rule_values::text);
			raise notice 'final_query  %', final_query;
			execute final_query;

			-- Handling delete or insert prodct groups.
			if array_length(_product_group, 1) > 0 then
				-- Finding deleted product groups.
				query:= 'select array_agg(product_group_id) from price_markdown.tb_rule_product_groups trpg where rule_id = '|| _rule_id ||' and product_group_id not in (' || array_to_string( _product_group, ',') || ');' ;
				execute query INTO to_be_deleted_product_groups_arr;
				raise notice 'PG to be deleted %', array_to_string(to_be_deleted_product_groups_arr, ', ');
				-- Finding newly added product groups.
				query := 'select array_agg(inp_pgs) from (select unnest(array['|| array_to_string(_product_group, ',') ||']::integer[]) as inp_pgs except select product_group_id from price_markdown.tb_rule_product_groups trpg where rule_id = ' || _rule_id || ') dd;';
				execute query into new_product_groups_arr;
				raise notice 'PG to be inserted %', array_to_string(new_product_groups_arr, ', ');
				-- Performing delete on tb_rule_product_groups
				if array_length(to_be_deleted_product_groups_arr, 1) >= 1 then
					query := 'delete from price_markdown.tb_rule_product_groups where rule_id='||_rule_id||' and product_group_id in ('|| array_to_string(to_be_deleted_product_groups_arr, ', ') ||')';
					raise notice 'delete pgs query %', query;
					execute query;
				end if;
				---- Performing insert on tb_rule_product_groups.
				if array_length(new_product_groups_arr, 1) >= 1 then
					query := 'insert into price_markdown.tb_rule_product_groups select '||_rule_id||', product_group_id from unnest(array[' || array_to_string(new_product_groups_arr, ', ') || ']::integer[]) as product_group_id';
					raise notice 'insert pgs query %', query;
					execute query;
				end if;
			end if;

			-- Handling delete or insert store groups.
			if array_length(_store_group, 1) > 0 then
				-- Finding deleted store groups.
				query:= 'select array_agg(store_group_id) from price_markdown.tb_rule_store_groups where rule_id = '|| _rule_id ||' and store_group_id not in (' || array_to_string( _store_group, ',') || ');' ;
				execute query INTO to_be_deleted_store_groups_arr;
				raise notice 'SG to be deleted %', array_to_string(to_be_deleted_store_groups_arr, ', ');
				-- Finding newly added store groups.
				query := 'select array_agg(inp_sgs) from (select unnest(array['|| array_to_string(_store_group, ',') ||']::integer[]) as inp_sgs except select store_group_id from price_markdown.tb_rule_store_groups where rule_id = ' || _rule_id || ') dd;';
				execute query into new_store_groups_arr;
				raise notice 'SG to be inserted %', array_to_string(new_store_groups_arr, ', ');
				-- Performing delete on tb_rule_store_groups
				if array_length(to_be_deleted_store_groups_arr, 1) >= 1 then
					query := 'delete from price_markdown.tb_rule_store_groups where rule_id='||_rule_id||' and store_group_id in ('|| array_to_string(to_be_deleted_store_groups_arr, ', ') ||')';
					raise notice 'delete sgs query %', query;
					execute query;
				end if;
				---- Performing insert on tb_rule_store_groups.
				if array_length(new_store_groups_arr, 1) >= 1 then
					query := 'insert into price_markdown.tb_rule_store_groups select '||_rule_id||', store_group_id from unnest(array[' || array_to_string(new_store_groups_arr, ', ') || ']::integer[]) as store_group_id';
					raise notice 'insert sgs query %', query;
					execute query;
				end if;
			end if;


			is_sku_store_reco_level_same = (current_rule_details.rule_product_level = _rule_product_level and current_rule_details.rule_store_level = _rule_store_level);
			-- handling product and store combo delete/insertion.
			if array_length(_product_selection, 1) > 0 and array_length(_store_selection, 1) > 0 then
				-- Find newly added products.
				query:= 'select array_agg(distinct product_h5_id) from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' and product_h5_id not in (' || array_to_string( _product_selection, ',') || ');';
				execute query INTO deleted_products;
				raise notice 'products to be deleted %', array_to_string(deleted_products, ', ');

				-- Find removed products.
				query:= 'select array_agg(new_ids) from (select unnest(array[' || array_to_string( _product_selection, ',') || ']::integer[]) as new_ids except select distinct product_h5_id from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' )dd ;';
				execute query INTO new_products;
				raise notice 'products to be inserted %', array_to_string(new_products, ', ');

				-- Find newly added stores.
				query:= 'select array_agg(distinct store_h6_id) from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' and store_h6_id not in (' || array_to_string( _store_selection, ',') || ');';
				execute query INTO deleted_stores;
				raise notice 'stores to be deleted %', array_to_string(deleted_stores, ', ');

				-- Find removed stores.
				query:= 'select array_agg(new_ids) from (select unnest(array[' || array_to_string( _store_selection, ',') || ']::integer[]) as new_ids except select distinct store_h6_id from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' )dd ;';
				execute query INTO new_stores;
				raise notice 'stores to be inserted %', array_to_string(new_stores, ', ');

				-- Performing delete products on sku_store_map
				if is_sku_store_reco_level_same = true and array_length(deleted_products, 1) >= 1 then
					query := 'delete from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' and product_h5_id in(' || array_to_string(deleted_products, ',') || ')';
					raise notice 'deleted_products query %', query;
					execute query;
				end if;
				-- Performing delete products on sku_store_map
				if is_sku_store_reco_level_same = true and array_length(deleted_stores, 1) >= 1 then
					query := 'delete from price_markdown.tb_rule_sku_store_mapping where rule_id = '|| _rule_id::text ||' and store_h6_id in(' || array_to_string(deleted_stores, ',') || ')';
					raise notice 'deleted_stores query %', query;
					execute query;
				end if;


				-- if the reco level of store/product changes, performing delete and insert.
				if  is_sku_store_reco_level_same = false then
					union1_query = format('select product_h5_id, store_h6_id from (select unnest(array[%1$s]::integer[]) as product_h5_id)t1, (select unnest(array[%2$s]::integer[]) as store_h6_id)t2', array_to_string(_product_selection, ','), array_to_string(_store_selection, ','));
					sku_store_insert_flag = true;
					sku_store_combo_delete_cte = ',delete_old_sku_map_cte as(delete from price_markdown.tb_rule_sku_store_mapping where rule_id =  '|| _rule_id::text ||' )';
				else
					if array_length(new_products, 1) >= 1 and array_length(new_stores, 1) >= 1  then
						union1_query = format('select product_h5_id, store_h6_id from (select unnest(array[%1$s]::integer[]) as product_h5_id)t1, (select unnest(array[%2$s]::integer[]) as store_h6_id)t2', array_to_string(new_products, ','), array_to_string(_store_selection, ','));
						union2_query = format('union select product_h5_id, store_h6_id from (select unnest(array[%1$s]::integer[]) as product_h5_id)t1, (select unnest(array[%2$s]::integer[]) as store_h6_id)t2', array_to_string( _product_selection, ','), array_to_string(new_stores, ','));
						sku_store_insert_flag = true;
					elseif array_length(new_products, 1) >= 1 or array_length(new_stores, 1) >= 1  then
						if array_length(new_products, 1) >= 1 then
							union1_query = format('select product_h5_id, store_h6_id from (select unnest(array[%1$s]::integer[]) as product_h5_id)t1, (select unnest(array[%2$s]::integer[]) as store_h6_id)t2', array_to_string(new_products, ','), array_to_string(_store_selection, ','));
						end if;
						if array_length(new_stores, 1) >= 1 then
							union1_query = format('select product_h5_id, store_h6_id from (select unnest(array[%1$s]::integer[]) as product_h5_id)t1, (select unnest(array[%2$s]::integer[]) as store_h6_id)t2', array_to_string(_product_selection, ','), array_to_string(new_stores, ','));
						end if;
						sku_store_insert_flag = true;
					end if;
				end if;
			end if;

			if sku_store_insert_flag = true then
				raise notice 'performing sku store combo insertion';
				query = format('
								with sku_map_copy_cte as(
								    select
										*
									from
								    	(
										 	%2$s %3$s
										)t3
								),
								product_recommendation_level_cte as(
								    select
								        "name" as name
								    from
								        price_markdown.tb_view_by_config tvbc
								    where
								        tvbc.category = ''product_level''
								        and tvbc.value = %4$s
								),
								store_recommendation_level_cte as(
								    select
								        "name" as name
								    from
								        price_markdown.tb_view_by_config tvbc
								    where
								        tvbc.category = ''store_level''
								        and tvbc.value = %5$s
								),
								product_group_ids_cte as (
								    select
								        smc.product_h5_id,
								        max(tpp.pg_id) as pg_id
								    from
								        sku_map_copy_cte smc
								    left join
								    	(select pg_id, product_h5_id from price_markdown.tb_pg_product where pg_id in (select product_group_id from price_markdown.tb_rule_product_groups where rule_id = %1$s)) tpp
								        on smc.product_h5_id = tpp.product_h5_id
								    group by
								        smc.product_h5_id
								),
								product_group_data_cte as(
								    select
								        pgic.product_h5_id,
								        pgic.pg_id,
								        tpg.pg_name
								    from
								        product_group_ids_cte pgic
								    left
								        join price_markdown.tb_product_group tpg
								        on pgic.pg_id = tpg.pg_id
								),
								store_group_ids_cte as(
								    select
								        smc.store_h6_id,
								        max(tss.sg_id) as sg_id
								    from
								        sku_map_copy_cte smc
								    left join
								    	(select sg_id, store_h6_id from price_markdown.tb_sg_store where sg_id in ( select store_group_id from price_markdown.tb_rule_store_groups where rule_id = %1$s)) tss
								        on smc.store_h6_id = tss.store_h6_id
								    group by
								        smc.store_h6_id
								),
								store_group_data_cte as(
								    select
								        sgic.store_h6_id,
								        sgic.sg_id,
								        tsg.sg_name
								    from
								        store_group_ids_cte sgic
								    left
								        join price_markdown.tb_store_group tsg
								        on sgic.sg_id = tsg.sg_id
								),
								sku_map_with_recommendations_cte as(
									select
									    smcc.product_h5_id,
									    smcc.store_h6_id,
									    (case when prlc."name" = ''product_h5'' then pm.product_h5_id
									        when prlc."name" = ''product_h4'' then pm.product_h4_id
									        when prlc."name" = ''product_h3'' then pm.product_h3_id
									        when prlc."name" = ''product_h2'' then pm.product_h2_id
									        when prlc."name" = ''product_h1'' then pm.product_h1_id
									        when prlc."name" = ''-200'' 	  then -200
									        else pgdc.pg_id
									        end
									    ) as product_level_id,
									    (case when prlc."name" = ''product_h5'' then pm.product_h5_name
									        when prlc."name" = ''product_h4'' then pm.product_h4_name
									        when prlc."name" = ''product_h3'' then pm.product_h3_name
									        when prlc."name" = ''product_h2'' then pm.product_h2_name
									        when prlc."name" = ''product_h1'' then pm.product_h1_name
									        when prlc."name" = ''-200'' 		then ''Overall''
									        else pgdc.pg_name
									        end
									    ) as product_level_value,
									    (case when srlc."name" = ''store_h6'' then sm.store_h6_id
									        when srlc."name" = ''store_h5'' then sm.store_h5_id
									        when srlc."name" = ''store_h4'' then sm.store_h4_id
									        when srlc."name" = ''store_h3'' then sm.store_h3_id
									        when srlc."name" = ''store_h2'' then sm.store_h2_id
									        when srlc."name" = ''store_h1'' then sm.store_h1_id
									        when srlc."name" = ''-200'' 	then -200
									        else sgdc.sg_id
									        end
									    ) as store_level_id,
									    (case when srlc."name" = ''store_h6'' then sm.store_h6_name
									        when srlc."name" = ''store_h5'' then sm.store_h5_name
									        when srlc."name" = ''store_h4'' then sm.store_h4_name
									        when srlc."name" = ''store_h3'' then sm.store_h3_name
									        when srlc."name" = ''store_h2'' then sm.store_h2_name
									        when srlc."name" = ''store_h1'' then sm.store_h1_name
									        when srlc."name" = ''-200'' 	then ''Overall''
									            else sgdc.sg_name
									            end
									        ) as store_level_value
									    from
									        product_recommendation_level_cte prlc,
									        store_recommendation_level_cte srlc,
									        sku_map_copy_cte smcc
									    left
									        join public.product_master pm
									        on smcc.product_h5_id = pm.product_h5_id
									    left
									        join public.store_master sm
									        on smcc.store_h6_id = sm.store_h6_id
									    left
									        join product_group_data_cte pgdc
									        on smcc.product_h5_id = pgdc.product_h5_id
									    left
									        join store_group_data_cte sgdc
									        on smcc.store_h6_id = sgdc.store_h6_id
								)%6$s
								insert
								    into price_markdown.tb_rule_sku_store_mapping
								select
								   	%1$s,
									product_h5_id,
									store_h6_id,
									product_level_id,
									store_level_id,
									product_level_value,
									store_level_value
								from
								    sku_map_with_recommendations_cte
								',_rule_id::text, union1_query, union2_query, _rule_product_level::text, _rule_store_level::text, sku_store_combo_delete_cte);
				execute query;
			end if;

			-- insert/update sku and store hierarchy in tb_rule_hierarchy
			call price_markdown.pc_insert_rule_product_store_hierarchy(_rule_id::integer);
		end if;
	end if;
	return _rule_id;
end;
$function$
;