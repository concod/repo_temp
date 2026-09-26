--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_custom_rule_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_custom_rule_data
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_custom_rule_data;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_custom_rule_data(_rule_id integer)
 RETURNS json
	LANGUAGE plpgsql
AS $function$
	declare
		 _rule_type integer;
		 _product_selection integer[];
		 _product_groups integer[];
		 _store_selection integer[];
		 _store_groups integer[];

		query text:= '';
		enable_applicable_count integer;
		discount_selection text;
		temp_query text;
		final_query text;
		rc record;
		final_response json;
		product_groups_json text;
		store_groups_json text;
		product_selection_json text;
		store_selection_json text;
		column_headers text;
	BEGIN
		-- Fetch Rule Type.
		temp_query = 'select rule_type from price_markdown.tb_rule_master trm where trm.rule_id = ' || _rule_id::text;
   		execute temp_query into rc;
   		_rule_type = rc.rule_type;

		-- Find that the rule have enable_applicable_value, in else case min/max values get applicabled.
	   	temp_query = format('select count(*) from price_markdown.tb_rule_config trc where trc.rule_type_id = %1$s and trc.enable_applicable_value = 1', _rule_type);
	   	execute temp_query into enable_applicable_count;
	   	if enable_applicable_count > 0 then
	   		discount_selection = '''applicable_value'', applicable_value';
	   	else
	   		discount_selection = '''min_value'', min_value, ''max_value'', max_value';
	   	end if;

	   	-- Fetch column headers
	    temp_query = format('select * from price_markdown.fn_get_custom_rule_step2_column_headers(%1$s::integer, null::text, null::integer, null::integer)', _rule_id::text);
	    --execute temp_query into column_headers;
	   	column_headers = temp_query;

   		-- Product groups fetch
   		execute 'select array_agg(product_group_id) from price_markdown.tb_rule_product_groups trpg where trpg.rule_id = '|| _rule_id::text ||'' into _product_groups;
   		if array_length(_product_groups, 1) > 0 then
   			temp_query = format('
								with product_group_data_cte as (
									select
										tb_product_group.pg_id as product_group_id,
										tb_product_group.pg_name as product_group_name,
										tb_product_group.description as product_group_description,
										users.name as created_by_user,
										tb_product_group.created_at,
										user_updated_by_table.name as modified_by_user,
										case
											when tb_product_group.created_at <> tb_product_group.updated_at then tb_product_group.updated_at
											else null
										end as modified_at,
										ARRAY_AGG( distinct product_h1_name ) as product_h1,
										ARRAY_AGG( distinct product_h2_name ) as product_h2,
										ARRAY_AGG( distinct product_h3_name ) as product_h3,
										ARRAY_AGG( distinct product_h4_name ) as product_h4,
										ARRAY_AGG( distinct brand ) as brand,
										COUNT(tb_pg_product.product_h5_id) as products_count
									from
										price_markdown.tb_product_group
									join price_markdown.tb_pg_product on
										tb_product_group.pg_id = tb_pg_product.pg_id
									join pricesmart.product_master on
										product_master.product_h5_id=tb_pg_product.product_h5_id
									left join um.users on
										users.id = tb_product_group.created_by
									left join um.users user_updated_by_table on
										user_updated_by_table.id = tb_product_group.updated_by
									where
										tb_product_group.is_deleted <> 1
										and tb_product_group.pg_id in (%1$s)
									group by
										product_group_id,
										product_group_name,
										product_group_description,
										created_by_user,
										tb_product_group.created_at,
										modified_by_user,
										modified_at
								)
								select
									jsonb_agg( json_build_object(
										''product_group_id'', product_group_id,
										''product_group_name'', product_group_name,
										''product_group_description'', product_group_description,
										''created_by_user'', created_by_user,
										''created_at'', created_at,
										''modified_by_user'', modified_by_user,
										''modified_at'', modified_at,
										''product_h1'', product_h1,
										''product_h2'', product_h2,
										''product_h3'', product_h3,
										''product_h4'', product_h4,
										''brand'', brand,
										''products_count'', products_count
									)) as product_groups
								from
									product_group_data_cte
								', array_to_string(_product_groups,','));

   			--execute temp_query into product_groups_json;
			product_groups_json = temp_query;
   			product_selection_json = 'null';
   		else
   			product_groups_json = 'null';
   			execute 'select array_agg(distinct product_h5_id) from price_markdown.tb_rule_sku_store_mapping trssm where trssm.rule_id = '|| _rule_id::text ||'' into _product_selection;

   			temp_query = format('
								with inventory_data as (
        								select
								            item_id, SUM(total_qty) AS inventory
								        FROM
								            price_markdown.tb_inventory_oh_latest_mkd
								        WHERE item_id in (%1$s)
								        group by item_id
								)
								select
									jsonb_agg(json_build_object(
										''product_h5_id'', pm.product_h5_id,
										''product_h5_name'', pm.product_h5_name,
									    ''product_h1'', pm.product_h1_name,
									    ''product_h2'', pm.product_h2_name,
									    ''product_h3'', pm.product_h3_name,
									    ''product_h4'', pm.product_h4_name,
									    ''price'', pm.price,
									    ''comp_value'', pm.comp_value,
									    ''is_active'', pm.is_active,
									    ''web_designation_cd'', pm.web_designation_cd,
									    ''store_pickup_eligible_ind'', pm.store_pickup_eligible_ind,
									    ''available_on_line_ind'', pm.available_on_line_ind,
									    ''image_exists'', pm.image_exists,
									    ''inventory'', inventory
									)) as products
								from
									pricesmart.product_master pm
								left join
									inventory_data id on pm.product_h5_id = id.item_id
								where
									pm.product_h5_id in (%1$s)
								',array_to_string(_product_selection,','));
   			--execute temp_query into product_selection_json;
			product_selection_json = temp_query;
   		end if;


   		-- Store groups fetch
   		execute 'select array_agg(store_group_id) from price_markdown.tb_rule_store_groups trsg where trsg.rule_id = '|| _rule_id::text || '' into _store_groups;
   		if array_length(_store_groups, 1) > 0 then
   			temp_query = format('
								 with store_group_data_cte as (
									select
										tb_store_group.sg_id as store_group_id,
										tb_store_group.sg_name as store_group_name,
										tb_store_group.description as store_group_description,
										users.name as created_by_user,
										tb_store_group.created_at,
										user_updated_by_table.name as modified_by_user,
										case
											when tb_store_group.created_at <> tb_store_group.updated_at then tb_store_group.updated_at
											else null
										end modified_at,
										COUNT(tb_sg_store.store_h6_id) stores_count
									from
										price_markdown.tb_store_group
									join price_markdown.tb_sg_store on
										tb_sg_store.sg_id = tb_store_group.sg_id
									join public.store_master on
										store_master.store_h6_id = tb_sg_store.store_h6_id
									left join um.users on
										users.id = tb_store_group.created_by
									left join um.users user_updated_by_table on
										user_updated_by_table.id = tb_store_group.updated_by
									where
										tb_store_group.is_deleted <> 1
										and tb_store_group.sg_id in (%1$s)
									group by
										store_group_id,
										store_group_name,
										store_group_description,
										created_by_user,
										tb_store_group.created_at,
										modified_by_user,
										modified_at
								)
								select
									json_agg(json_build_object(
										''store_group_id'', store_group_id,
										''store_group_name'', store_group_name,
										''store_group_description'', store_group_description,
										''created_by_user'', created_by_user,
										''created_at'', created_at,
										''modified_by_user'', modified_by_user,
										''modified_at'', modified_at,
										''stores_count'', stores_count
									)) as store_groups
								from
									store_group_data_cte
								', array_to_string(_store_groups,','));
			--execute temp_query into store_groups_json;
			store_groups_json = temp_query;
   			store_selection_json = 'null';
   		else
   			store_groups_json = 'null';
   			execute 'select array_agg(distinct store_h6_id) from price_markdown.tb_rule_sku_store_mapping trssm where trssm.rule_id = '|| _rule_id::text || '' into _store_selection;

   			temp_query = format('
								select
									jsonb_agg(json_build_object(
								    ''store_h6_id'', store_h6_id,
								    ''store_h6_name'', store_h6_name,
								    ''store_h1'', store_h1_name,
								    ''store_h2'', store_h2_name,
								    ''store_h3'', store_h3_name,
								    ''store_h4'', store_h4_name,
								    ''store_h5'', store_h5_name
								    )) as stores
								from
								    public.store_master sm
								where
								    sm.store_h6_id in (%1$s)
								    and sm.is_active = 1
								', array_to_string(_store_selection,','));
			store_selection_json = temp_query;
   			--execute temp_query into store_selection_json;
   		end if;


   		final_query = format('
								with rule_basic_info_cte as(
									select
										trm.rule_id ,
										trm.rule_name,
										trm.rule_description,
										tasm.name as rule_type,
										trm.rule_flexibility_type_id as rule_flexibility_type,
										trm.rule_product_level,
										trm.rule_store_level,
										trm.products_count,
										trm.stores_count
									from
										price_markdown.tb_rule_master trm
									inner join
										metaschema.tb_app_sub_master tasm on tasm.id = trm.rule_type
									where
										trm.rule_id = %1$s
								),
								final_data_cte as(
									select
										trm.*,
										jsonb_agg(jsonb_build_object(	''row_id'', row_id,
   																		''product_level_id'', product_level_id,
																		''product_level_value'', product_level_value,
																		''store_level_id'', store_level_id,
																		''store_level_value'', store_level_value,
																		%2$s)) as table_data
									from
										rule_basic_info_cte trm
									inner join
										(select row_number() over() as row_id,* from price_markdown.tb_rule_discount where rule_id = %1$s) trd using(rule_id)
									where
										trd.rule_id = %1$s
									group by
										trm.rule_id,
										trm.rule_name,
										trm.rule_description,
										trm.rule_type,
										trm.rule_flexibility_type,
										trm.rule_product_level,
										trm.rule_store_level,
										trm.products_count,
										trm.stores_count
								)
								select
									jsonb_build_object(
											''rule_id'', rule_id,
											''rule_name'', rule_name,
											''rule_description'', rule_description,
											''rule_type'', rule_type,
											''rule_flexibility_type_id'', rule_flexibility_type,
											''rule_product_level'', rule_product_level,
											''rule_store_level'', rule_store_level,
											''products_count'', products_count,
											''stores_count'', stores_count,
											''product_groups'', (%3$s),
											''product_selection'', (%4$s),
											''store_groups'', (%5$s),
											''store_selection'', (%6$s),
											''column_headers'', (%7$s),
											''table_data'', table_data
									)
								from
									final_data_cte
							 ',_rule_id, discount_selection, product_groups_json, product_selection_json, store_groups_json, store_selection_json, column_headers);

		raise notice 'Final Query: %', final_query;
	   	execute final_query into final_response;
	   	return final_response;
  	END;
$function$
;