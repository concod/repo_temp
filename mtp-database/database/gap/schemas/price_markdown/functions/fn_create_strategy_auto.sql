--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_strategy_auto-4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated function to create auto strategies for clearance

DROP FUNCTION if exists price_markdown.fn_create_strategy_auto;

CREATE OR REPLACE FUNCTION price_markdown.fn_create_strategy_auto()
 RETURNS TABLE(strategy_id_1 integer, strategy_name_1 text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	r record;
    vl_test_query text :=  '';
    product_ids integer[];
    store_ids integer[];
	_query_combine text := '';
    _strategy_master_record price_markdown.tb_strategy_master%ROWTYPE;


begin
	-- call function to identify all products for which strategies need to be created
	CALL price_markdown_opt.pc_auto_clearance_all_procedures_in_sequence();

	drop table if exists tb_temp_config_opt;
	create temp table tb_temp_config_opt as (
	select
		strategy_name,
		min(strategy_start_date) as strategy_start_date,
		min(strategy_end_date) as strategy_end_date,
		min(calendar_config_id) as calendar_config_id,
		min(trigger_id) as trigger_config_id,
		array_agg( distinct product_id) as product_ids,
		array_agg( distinct store_id) as store_ids,
		jsonb_agg(json_build_object('product_id', product_id, 'store_id', store_id)) as selected_sku_store_ids
	from price_markdown_opt.tb_auto_clearance_final_eligible_products_stores
	where todays_date  = date(timezone(
							(select
								remarks
							from
								metaschema.tb_app_sub_master
							where
								name = 'client_timezone'),
							now()))
	and is_active = true
	group by 1);

	-- insert into tb_strategy_master and return newly created strategies
	drop table if exists tb_temp_master;
	create temp table tb_temp_master as(
	with new_data as (
	INSERT INTO price_markdown.tb_strategy_master (
		strategy_name, strategy_comment,
		start_date, end_date,
		product_recommendation_level, store_recommendation_level,
		created_by, updated_by,
		calendar_config_id, is_automated,
		step_count, status, is_optimisation_running,allow_only_with_inv)
	select
		el.strategy_name, 'Auto created strategy',
		el.strategy_start_date, el.strategy_end_date,
		config.product_recommendation_level, config.store_recommendation_level,
		-1, null,
		el.calendar_config_id, true,
		3, 5, true, true
	from tb_temp_config_opt as el
	join price_markdown.tb_strategy_config as config
	on el.trigger_config_id = config.trigger_config_id
	RETURNING
	strategy_id, strategy_name
	)
	select
		new_data.strategy_id,
		co.*
	from new_data
	join tb_temp_config_opt co
	using(strategy_name)
	);


	FOR r IN SELECT * FROM tb_temp_master
	loop
        select * into _strategy_master_record from
        price_markdown.tb_strategy_master
        where strategy_id = r.strategy_id;

		--- insert into tb_strategy_pcd
        perform price_markdown.fn_v1_edit_strategy_step_1(
            _strategy_master_record.strategy_id,
            _strategy_master_record.strategy_name,
            _strategy_master_record.strategy_comment,
            _strategy_master_record.start_date,
            _strategy_master_record.end_date,
            r.product_ids,
            r.store_ids,
            false,
            r.selected_sku_store_ids::jsonb,
            null::jsonb,
            _strategy_master_record.calendar_config_id,
            -1,
            false,
            array[]::int[],
            array[]::int[],
            _strategy_master_record.allow_only_with_inv
        );
		PERFORM price_markdown.fn_edit_strategy_pcd(
			r.strategy_id,
			r.strategy_start_date::date,
			r.strategy_end_date::date,
			r.calendar_config_id,
			-1
			);
		--- create partitions for tb_strategy_discount and tb_strategy_discount_ia
		PERFORM price_markdown.fn_create_strategy_discount_partition_with_index(r.strategy_id,'tb_strategy_discount');
		PERFORM price_markdown.fn_create_strategy_discount_partition_with_index(r.strategy_id,'tb_strategy_discount_ia');

		update price_markdown.tb_strategy_master
        set step_count = 3
        where strategy_id = r.strategy_id;
	end loop;

	--- insert into tb_strategy_objective
	INSERT INTO price_markdown.tb_strategy_objective (
	strategy_id, objective_type_id, objective_value,
	created_by
	)
	select
		tm.strategy_id, config_obj.objective_type_id, config_obj.objective_value,
		-1
	from tb_temp_master as tm
	join price_markdown.tb_strategy_config_objective as config_obj
	on tm.trigger_config_id = config_obj.trigger_config_id;

	--- insert into tb_strategy_rule
	INSERT INTO price_markdown.tb_strategy_rule (
	strategy_id, constraint_type, constraint_id,
	min_value, max_value, applicable_value, rule_flexibility_type_id,
	priority, status, created_by)
	select
		tm.strategy_id, config_rule.constraint_type, coalesce(stg_obj.strategy_objective_id, config_rule.constraint_id),
		config_rule.min_value, config_rule.max_value, config_rule.applicable_value, config_rule.rule_flexibility_type_id,
		config_rule.priority, config_rule.status, -1
	from tb_temp_master as tm
	join price_markdown.tb_strategy_config_rule as config_rule
	on tm.trigger_config_id = config_rule.trigger_config_id
	left join price_markdown.tb_strategy_config_objective as config_obj
	on config_rule.constraint_type = 1 and config_rule.constraint_id = config_obj.strategy_config_objective_id
	left join price_markdown.tb_strategy_objective as stg_obj
	on config_obj.objective_type_id  = stg_obj.objective_type_id and stg_obj.strategy_id = tm.strategy_id;

	_query_combine := 'select
	strategy_id, strategy_name
	from tb_temp_master';
	return query execute _query_combine;

END;
$function$
;
