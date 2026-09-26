--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_update_strategy_calendar_pcd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_update_strategy_calendar_pcd
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_update_strategy_calendar_pcd;
CREATE OR REPLACE FUNCTION price_markdown.fn_update_strategy_calendar_pcd(p_strategy_id integer, calendar_config_id integer, p_start_date date)
 RETURNS void
	LANGUAGE plpgsql
AS $function$
	DECLARE
        p_pcd_details jsonb;
        strategy_object price_markdown.tb_strategy_master%ROWTYPE;
        parent_strategy_object price_markdown.tb_strategy_master%ROWTYPE;
	begin

        select * into strategy_object from price_markdown.tb_strategy_master where strategy_id = p_strategy_id;
        select * into parent_strategy_object from price_markdown.tb_strategy_master where strategy_id = strategy_object.parent_strategy;

        if parent_strategy_object.customise_by = 'weekly'::price_markdown.customise_by THEN

            update price_markdown.tb_strategy_master
            set calendar_config_json = null,
                customise_by = 'weekly'::price_markdown.customise_by
            where strategy_id = p_strategy_id;

        elsif parent_strategy_object.customise_by = 'full_custom'::price_markdown.customise_by THEN

            update price_markdown.tb_strategy_master
                set calendar_config_json = price_markdown.fn_copy_calendar_config_json(
                                                parent_strategy_object.calendar_config_json,
                                                strategy_object.start_date,
                                                strategy_object.end_date
                                            )
                where strategy_id = p_strategy_id;

        elsif parent_strategy_object.customise_by = 'config_object'::price_markdown.customise_by THEN

            update price_markdown.tb_strategy_master
                set calendar_config_json = price_markdown.fn_create_pcd_config_json(
                        parent_strategy_object.calendar_config_id,
                        strategy_object.start_date
                    ),
                    customise_by = 'full_custom'::price_markdown.customise_by
            where strategy_id = p_strategy_id;

        end if;

    end;
$function$
;