--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_new_strategy_version_number-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changes in price_markdown.fn_get_new_strategy_version_number function




DROP FUNCTION iF EXISTS price_markdown.fn_get_new_strategy_version_number;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_new_strategy_version_number(
    p_strategy_id int
)
 RETURNS int
 LANGUAGE plpgsql
AS $function$
begin
        return (
            select
                max(version_number) + 1
            from
                price_markdown.tb_strategy_master
            where coalesce(root_strategy,strategy_id) = (
                select coalesce(root_strategy,p_strategy_id)
                from price_markdown.tb_strategy_master
                where strategy_id = p_strategy_id
            )
        );
END;
$function$
;