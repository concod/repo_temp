--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_check_metric_table_data_exists_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated table to strategy_discount_ia instead of ssd_ia for ia_value_exists flag
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_check_metric_table_data_exists;
CREATE OR REPLACE FUNCTION price_markdown.fn_check_metric_table_data_exists(strategy_id integer)
 RETURNS TABLE(ia_value_exists boolean, bl_value_exists boolean, fin_value_exists boolean)
 LANGUAGE plpgsql
AS $function$
	DECLARE
    ia_table_exists boolean;
   	ia_value_exists boolean;
   	fin_table_exists boolean;
    fin_value_exists boolean;
	BEGIN
  		SELECT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_ssd_ia_' || strategy_id and table_schema='price_markdown'
        ) INTO ia_table_exists;
	    SELECT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_ssd_fin_' || strategy_id and table_schema='price_markdown'
        ) into fin_table_exists;
  		IF ia_table_exists THEN
			EXECUTE 'SELECT EXISTS (SELECT 1 FROM price_markdown.tb_strategy_discount_ia_' || strategy_id || ' LIMIT 1)' INTO ia_value_exists;
  		ELSE
    		ia_value_exists := false;
		END IF;
		IF fin_table_exists THEN
			EXECUTE 'SELECT EXISTS (SELECT 1 FROM  price_markdown.tb_ssd_fin_' || strategy_id || ' LIMIT 1)' INTO fin_value_exists;
  		ELSE
    		fin_value_exists := false;
		END IF;
	RETURN query select ia_value_exists, false, fin_value_exists;
	end;
$function$
;
