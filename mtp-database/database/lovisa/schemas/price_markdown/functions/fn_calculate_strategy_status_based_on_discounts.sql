--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_calculate_strategy_status_based_on_discounts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_calculate_strategy_status_based_on_discounts

drop function if exists price_markdown.fn_calculate_strategy_status_based_on_discounts;
CREATE OR REPLACE FUNCTION price_markdown.fn_calculate_strategy_status_based_on_discounts(p_strategy_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
		_new_status int;
		_strategy_max_discount_approval_status price_markdown.strategy_approval_status_enum;
	begin
		
		select 
			max(approval_status) into _strategy_max_discount_approval_status
		from 
			price_markdown.tb_strategy_discount
		where strategy_id = p_strategy_id;

        _new_status = CASE
            when _strategy_max_discount_approval_status = 'Not Approved'
                then 7
            
            when _strategy_max_discount_approval_status = 'Initially Approved'
                then 1

            when _strategy_max_discount_approval_status = 'Finally Approved'
                then 2 
            else 
                0
            end;

		return _new_status;
		
	end;
$function$
;