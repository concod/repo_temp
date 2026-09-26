--liquibase formatted sql
--changeset liquibase:fn_check_strategy_exist runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_check_strategy_exist

DROP FUNCTION IF EXISTS price_markdown_opt.fn_check_strategy_exist(int4, varchar, varchar);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_check_strategy_exist(_strategy_id integer, _tb_schema character varying, _tb_name character varying)
 RETURNS TABLE(is_there bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
	 	return query execute format('select count(*) as is_there
	    from %1$s.%2$s
	    where strategy_id = %3$s;', _tb_schema, _tb_name, _strategy_id);
	    end
	$function$
;