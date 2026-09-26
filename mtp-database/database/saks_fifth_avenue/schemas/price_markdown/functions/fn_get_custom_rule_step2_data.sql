--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_custom_rule_step2_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_custom_rule_step2_data
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_custom_rule_step2_data;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_custom_rule_step2_data(_rule_id integer, _rule_name text, _product_reco_lev integer, _product_selection integer[], _product_groups integer[], _store_reco_lev integer, _store_selection integer[], _store_groups integer[])
 RETURNS json
	LANGUAGE plpgsql
AS $function$
	DECLARE
		rule_type_id integer;
		enable_applicable_count integer;

		query text:= '';
		temp_query text;
		final_query text;

		get_rule_type_query text;
		get_prduct_reco_query text;
		get_store_reco_query text;
		validation_query text;
		columns_query text;
		discount_selection text;
		discount_selection_tmp text;
		rc record;

		product_reco_lev_ integer;
		store_reco_lev_ integer;
		rule_type_name text;
		final_response json;
		is_reco_levels_same bool:=true;
		is_sku_or_store_data_null bool:=false;
	BEGIN
		-- Fetch rule_type, and product_reco_lev
		if _rule_id is not null then
			temp_query = '	select
								trm.rule_type as rule_type_id,
								tasm.name as rule_type_name,
								trm.rule_product_level,
								trm.rule_store_level
							from
								price_markdown.tb_rule_master trm
							inner join
								metaschema.tb_app_sub_master tasm on tasm.id = trm.rule_type
							where trm.rule_id = ' || _rule_id::text;
	   		execute temp_query into rc;
	   		rule_type_id = rc.rule_type_id;
	   		rule_type_name = rc.rule_type_name;
	   		product_reco_lev_ = rc.rule_product_level;
	   		store_reco_lev_ = rc.rule_store_level;
	   		--raise notice 'rule_type_id: %, rule_type_name: %, product_reco_lev: %, store_reco_lev: %', rule_type_id, rule_type_name, product_reco_lev_, store_reco_lev_;
	   	else
	   		get_rule_type_query = format('select id as rule_type from metaschema.tb_app_sub_master where name = ''%1$s''', _rule_name);
		   	execute get_rule_type_query into rule_type_id;
	   	end if;

		-- Find that the rule have enable_applicable_value, in else case min/max values get applicabled.
	   	validation_query = format('select count(*) from price_markdown.tb_rule_config trc where trc.rule_type_id = %1$s and trc.enable_applicable_value = 1', rule_type_id);
	   	execute validation_query into enable_applicable_count;
	   	if enable_applicable_count > 0 then
	   		columns_query = format('select trm.applicable_value from price_markdown.tb_rule_master trm where trm.rule_type = %1$s and trm.is_default_rule = 1', rule_type_id);
	   		discount_selection = '''applicable_value'', applicable_value';
	   		discount_selection_tmp = '''applicable_value'', case when ord.applicable_value is not null then ord.applicable_value else nrd.applicable_value end';
	   	else
	   		columns_query = format('select trm.min_value, trm.max_value  from price_markdown.tb_rule_master trm where trm.rule_type = %1$s and trm.is_default_rule = 1', rule_type_id);
	   		discount_selection = '''min_value'', min_value, ''max_value'', max_value';
	   		discount_selection_tmp = '''min_value'', case when ord.min_value is not null then ord.min_value else nrd.min_value end,
									  ''max_value'', case when ord.max_value is not null then ord.max_value else nrd.max_value end';
	   	end if;


		-- If The rule_id is present.
	   	if _rule_id is not null then
	   		if _product_reco_lev is null then
	   			_product_reco_lev = product_reco_lev_;
	   		end if;
	   		if _store_reco_lev is null then
	   			_store_reco_lev = store_reco_lev_;
	   		end if;
	   		is_reco_levels_same = (_product_reco_lev = product_reco_lev_ and _store_reco_lev = store_reco_lev_);
	   		is_sku_or_store_data_null = (array_length(_product_groups, 1) is null and array_length(_store_groups, 1) is null and array_length(_product_selection, 1) is null and array_length(_store_selection, 1) is null);

	   		-- If the edit happen through strategy, no need to consider sku's/store's data, only reco changes can happen.
	   		if is_reco_levels_same = false and is_sku_or_store_data_null = true then
	   			final_response = price_markdown.fn_change_rule_recommendation_levels(
                        _rule_id,_product_reco_lev,_store_reco_lev
                    );
	   		else -- Edit through the rule screen, need to consider sku's/store's data.
		   		if array_length(_product_groups, 1) is null then
		   			query = 'select array_agg(product_group_id) from price_markdown.tb_rule_product_groups trpg where rule_id = '|| _rule_id ||'';
		   			execute query INTO _product_groups;
		   		end if;
		   		if array_length(_store_groups, 1) is null then
		   			query = 'select array_agg(store_group_id) from price_markdown.tb_rule_store_groups trsg where rule_id = '|| _rule_id ||'';
		   			execute query INTO _store_groups;
		   		end if;

		   		if array_length(_product_selection, 1) is null then
		   			query = 'select array_agg(distinct trssm.product_h5_id) from price_markdown.tb_rule_sku_store_mapping trssm  where trssm.rule_id = '|| _rule_id ||'';
		   			execute query INTO _product_selection;
		   		end if;

		   		if array_length(_store_selection, 1) is null then
		   			query = 'select array_agg(distinct trssm.store_h6_id) from price_markdown.tb_rule_sku_store_mapping trssm  where trssm.rule_id = '|| _rule_id ||'';
		   			execute query INTO _store_selection;
		   		end if;
				-- Fatch Step2 data with new sku/store data.
				temp_query = format('
									select
										*
									from
										price_markdown.fn_get_custom_rule_step2_data(null::integer, ''%1$s''::text, %2$s::integer, array[%3$s]::integer[], array[%4$s]::integer[], %5$s::integer, array[%6$s]::integer[], array[%7$s]::integer[])
								 ',rule_type_name, _product_reco_lev::text, array_to_string(_product_selection,','), array_to_string(_product_groups,','), _store_reco_lev::text, array_to_string(_store_selection,','), array_to_string(_store_groups,','));
				--raise notice 'new step2 data query: %', temp_query;
		   		if is_reco_levels_same = true then
		   			final_query = format('
											with old_rule_data_cte as(
												select
													product_level_id,
													store_level_id,
													product_level_value,
													store_level_value,
													min_value,
													max_value,
													applicable_value
												from
													price_markdown.tb_rule_discount where rule_id = %1$s
											),
											new_rule_data_cte as(
												select
													*
												from
													jsonb_to_recordset((%2$s)::jsonb)
													as rules_data(row_id int4, product_level_id int4, store_level_id int4, product_level_value text, store_level_value text,  min_value float4, max_value float4, applicable_value _float4)
											)
											select
												jsonb_agg(json_build_object(
													''row_id'', row_id,
													''product_level_id'', nrd.product_level_id,
													''store_level_id'', nrd.store_level_id,
													''product_level_value'', nrd.product_level_value,
													''store_level_value'', nrd.store_level_value,
													%3$s
												)) as final_response
											from
												new_rule_data_cte nrd
											left join
												old_rule_data_cte ord on nrd.product_level_id = ord.product_level_id and nrd.store_level_id = ord.store_level_id
										 ',_rule_id::text, temp_query, discount_selection_tmp);
					--raise notice 'final_query: %', final_query;
					execute final_query into final_response;
		   		else
		   			execute temp_query into final_response;
		   		end if;
		   	end if;
	   	else
   			-- Query to ftech product reco level name and id's.
   			if _product_reco_lev = -200 then
	   			get_prduct_reco_query = 'select ''Overall'' as product_reco_name, -200 as product_reco_id';
			elseif _product_reco_lev = -100 then
				get_prduct_reco_query = format('select pg_id as product_reco_id, pg_name as product_reco_name from price_markdown.tb_product_group where pg_id in(%1$s)', array_to_string(_product_groups,','));
			elseif array_length(_product_groups, 1) > 0 then
				get_prduct_reco_query = format('select pm.%1$s as product_reco_id, pm.%2$s as product_reco_name from public.product_master pm where pm.product_h5_id in(select product_h5_id from price_markdown.tb_pg_product tpp where pg_id in(%3$s)) group by pm.%1$s, pm.%2$s', 'product_h' || _product_reco_lev || '_id', 'product_h' || _product_reco_lev || '_name', array_to_string(_product_groups,','));
			else
				get_prduct_reco_query = format('select %1$s as product_reco_id, %2$s as product_reco_name from public.product_master pm where pm.product_h5_id in (%3$s) group by %1$s , %2$s ', 'product_h' || _product_reco_lev || '_id', 'product_h' || _product_reco_lev || '_name', array_to_string(_product_selection,','));
			end if;

			-- Query to ftech store reco level name and id's.
			if _store_reco_lev is null then
				_store_reco_lev = -200;
			end if;

   			if _store_reco_lev = -200 then
	   			get_store_reco_query = 'select -200 as store_reco_id, ''Overall'' as store_reco_name';
			elseif _store_reco_lev = -100 then
				get_store_reco_query = format('select sg_id as store_reco_id, sg_name as store_reco_name from price_markdown.tb_store_group where sg_id in(%1$s)', array_to_string(_store_groups,','));
			elseif array_length(_store_groups, 1) > 0 then
				get_store_reco_query = format('select sm.%1$s as store_reco_id, sm.%2$s as store_reco_name from public.store_master sm where sm.store_h6_id in(select store_h6_id from price_markdown.tb_sg_store tss where sg_id in(%3$s)) group by sm.%1$s, sm.%2$s', 'store_h' || _store_reco_lev || '_id', 'store_h' || _store_reco_lev || '_name', array_to_string(_store_groups,','));
			else
				get_store_reco_query = format('select %1$s as store_reco_id, %2$s as store_reco_name from public.store_master sm where sm.store_h6_id in (%3$s) group by %1$s , %2$s ', 'store_h' || _store_reco_lev || '_id', 'store_h' || _store_reco_lev || '_name', array_to_string(_store_selection,','));
			end if;


			final_query = format('	with rule_info_cte as(
										%1$s
									),
									store_info_cte as (
									    %2$s
									),
									products_info_cte as (
									    %3$s
									)
									select
										json_agg(jsonb_build_object(''row_id'', row_id,
																	''product_level_value'', product_reco_name,
																	''product_level_id'', product_reco_id,
																	''store_level_value'', store_reco_name,
																	''store_level_id'', store_reco_id,
																	%4$s)) as final_response
									from
										rule_info_cte,
										(select row_number() over() as row_id, * from products_info_cte, store_info_cte)dd', columns_query, get_store_reco_query, get_prduct_reco_query, discount_selection);

			--raise notice 'final query: %', final_query;
		   	execute final_query into final_response;
	   	end if;
	   	return final_response;
  	END;
$function$
;