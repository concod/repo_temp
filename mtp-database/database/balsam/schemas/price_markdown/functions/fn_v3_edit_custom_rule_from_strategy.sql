--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_edit_custom_rule_from_strategy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: instead of updates, performed delete and insert price_markdown.fn_v3_edit_custom_rule_from_strategy

DROP FUNCTION if exists price_markdown.fn_v3_edit_custom_rule_from_strategy;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_edit_custom_rule_from_strategy(p_strategy_id integer, p_rule_id integer, p_user_id integer, p_rule_product_level integer, p_rule_store_level integer, p_updated_rows_flag boolean, p_no_updates_on_table_data boolean, p_updated_rows json, p_rule_values json)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
    declare
        rule_object price_markdown.tb_rule_master%ROWTYPE;
        _new_rule_id int := p_rule_id;
       	_new_rule_name varchar;
        _new_strategy_id int;
        _strategies_count int;
       _rule_name varchar;
	begin
        select * into rule_object from price_markdown.tb_rule_master
            where rule_id = p_rule_id;

        if price_markdown.fn_check_is_active_strategy(p_strategy_id) THEN
            _new_strategy_id = price_markdown.fn_v3_copy_strategy(p_strategy_id,p_user_id,null::date,null::date);
            _new_rule_name = price_markdown.fn_get_new_rule_version(rule_object.rule_name);
            _new_rule_id = price_markdown.fn_copy_rule(
                p_rule_id,
                p_user_id,
                _rule_name
            );
           	raise notice 'new rule_id : %',_new_rule_id;
            update price_markdown.tb_strategy_rule
           	set constraint_id = _new_rule_id
           	where strategy_id = _new_strategy_id and constraint_id = p_rule_id and constraint_type=0;
           	return price_markdown.fn_v3_edit_custom_rule_from_strategy(
           			_new_strategy_id,
           			_new_rule_id,
           			p_user_id,
           			p_rule_product_level,
           			p_rule_store_level,
           			p_updated_rows_flag,
           			p_no_updates_on_table_data,
           			p_updated_rows,
           			p_rule_values
           		);

        end if;


        select count(strategy_id) into _strategies_count from price_markdown.tb_strategy_rule where constraint_id = p_rule_id and constraint_type = 0;

       raise notice 'strategies_count : %',_strategies_count;

        if _strategies_count > 1 then
	        _new_rule_name = rule_object.rule_name || '_' || (select strategy_name from price_markdown.tb_strategy_master where strategy_id = p_strategy_id);
            _new_rule_id = price_markdown.fn_copy_rule(
                    p_rule_id,
                    p_user_id,
                    _rule_name
                );
            update price_markdown.tb_strategy_rule
            set constraint_id = _new_rule_id
            where strategy_id = p_strategy_id and constraint_id = p_rule_id;
            return price_markdown.fn_v3_edit_custom_rule_from_strategy(
           			p_strategy_id,
           			_new_rule_id,
           			p_user_id,
           			p_rule_product_level,
           			p_rule_store_level,
           			p_updated_rows_flag,
           			p_no_updates_on_table_data,
           			p_updated_rows,
           			p_rule_values
           		);

        end if;

        call price_markdown.pc_clear_strategy_metrics(p_strategy_id);

        perform price_markdown.fn_edit_custom_rule(
                   p_rule_id,
                   coalesce(_rule_name,rule_object.rule_name),
                   rule_object.rule_description,
                   rule_object.rule_flexibility_type_id,
                   array(select distinct product_group_id from price_markdown.tb_rule_product_groups where rule_id = p_rule_id)::integer[],
                   array(select distinct product_h5_id from price_markdown.tb_rule_sku_store_mapping where rule_id = p_rule_id)::int8[],
                   p_rule_product_level,
                   array(select distinct store_group_id from price_markdown.tb_rule_store_groups where rule_id = p_rule_id)::integer[],
                   array(select distinct store_h6_id from price_markdown.tb_rule_sku_store_mapping where rule_id = p_rule_id)::int8[],
                   p_rule_store_level,
                   p_updated_rows_flag,
                   p_no_updates_on_table_data,
                   p_updated_rows::jsonb,
                   p_rule_values::jsonb,
                   p_user_id
               );

        update price_markdown.tb_strategy_master
        set step_count = 2,
            status=0,
            final_data_prepared = false,
            updated_by = p_user_id
        where strategy_id = p_strategy_id;

        return jsonb_build_object(
            'rule_id',p_rule_id,
            'strategy_id', p_strategy_id
        );


	END;
$function$
;
