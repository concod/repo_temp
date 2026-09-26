--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_check_metric_table_data_exists_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_check_metric_table_data_exists

DROP FUNCTION IF EXISTS price_markdown_opt.fn_check_metric_table_data_exists;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_check_metric_table_data_exists(strategy_id integer, currency_type text)
 RETURNS TABLE(ia_value_exists boolean, fin_value_exists boolean)
 LANGUAGE plpgsql
AS $function$
	DECLARE
    ia_table_exists boolean;
   	ia_value_exists boolean;
   	fin_table_exists boolean;
    fin_value_exists boolean;
	BEGIN
  		SELECT EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema = 'price_markdown' AND table_name = format('tb_ssd_ia_%s_%s', currency_type, strategy_id)) INTO ia_table_exists;
  		SELECT EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_schema = 'price_markdown' AND table_name = format('tb_ssd_fin_%s_%s', currency_type, strategy_id)) INTO fin_table_exists;
  		IF ia_table_exists THEN
        	EXECUTE format('SELECT EXISTS (SELECT 1 FROM price_markdown.tb_ssd_ia_%s_%s LIMIT 1)', currency_type, strategy_id) INTO ia_value_exists;
  		ELSE
    		ia_value_exists := false;
		END IF;
		IF fin_table_exists THEN
        	EXECUTE format('SELECT EXISTS (SELECT 1 FROM price_markdown.tb_ssd_fin_%s_%s LIMIT 1)', currency_type, strategy_id) INTO fin_value_exists;
  		ELSE
    		fin_value_exists := false;
		END IF;
	RETURN query select ia_value_exists, fin_value_exists;
	end;
$function$
;