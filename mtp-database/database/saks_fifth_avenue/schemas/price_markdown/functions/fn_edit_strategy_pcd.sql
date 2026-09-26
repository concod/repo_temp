--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_edit_strategy_pcd runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_edit_strategy_pcd
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_edit_strategy_pcd;
CREATE OR REPLACE FUNCTION price_markdown.fn_edit_strategy_pcd(p_strategy_id integer, p_start_date date, p_end_date date, p_calendar_config_id integer, p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	begin
		delete from price_markdown.tb_strategy_pcd where strategy_id = p_strategy_id;

        insert into price_markdown.tb_strategy_pcd
        (strategy_id,pcd_start_date,pcd_end_date,created_by)
        select p_strategy_id,pcd_start_date_,pcd_end_date_,p_user_id
        from price_markdown.fn_calculate_pcds(p_calendar_config_id,p_start_date,p_end_date);

        return p_strategy_id;
	END;
$function$
;
