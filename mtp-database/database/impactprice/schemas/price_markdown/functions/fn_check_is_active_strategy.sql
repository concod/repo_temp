--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_check_is_active_strategy-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changes in price_markdown.fn_check_is_active_strategy


drop function if exists price_markdown.fn_check_is_active_strategy;
CREATE OR REPLACE FUNCTION price_markdown.fn_check_is_active_strategy(p_strategy_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
	begin
        return (
            select case when status = 3 
            then true else false 
            end 
            from price_markdown.tb_strategy_master 
            where strategy_id = p_strategy_id
        );
	end;
$function$
;
