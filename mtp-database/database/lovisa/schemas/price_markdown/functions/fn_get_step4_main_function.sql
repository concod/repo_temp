--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_step4_main_function runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_step4_main_function
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_step4_main_function;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_step4_main_function(in_strategy_id integer, _product_level_id integer DEFAULT NULL::integer, _store_level_id integer DEFAULT NULL::integer, _pcd_id integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(product_level_value character varying, store_level_value character varying, pcd_start_date date, pcd_end_date date, "IA Recommended Discount" numeric, "BL Override Discount" numeric, "Draft Price Discount" numeric, "IA Recommended Price Point" numeric, "BL Override Price Point" numeric, "Draft Price Point" numeric, "IA Recommended Units" numeric, "BL Override Units" numeric, "Draft Units" numeric, "IA Recommended Revenue" numeric, "BL Override Revenue" numeric, "Draft Revenue" numeric, "IA Recommended Margin" numeric, "BL Override Margin" numeric, "Draft Margin" numeric, "IA Recommended Markdown $" numeric, "BL Override Markdown $" numeric, "Draft Markdown $" numeric, "IA Recommended Inventory" numeric, "BL Override Inventory" numeric, "Draft Inventory" numeric)
	LANGUAGE plpgsql
AS $function$
DECLARE
    _prod_reco integer;
    _store_reco integer;
    query text;
begin
    select m1.product_recommendation_level, m1.store_recommendation_level from price_markdown.tb_strategy_master m1 where m1.strategy_id = in_strategy_id into _prod_reco, _store_reco;

    if _prod_reco = _product_level_id and _store_reco = _store_level_id then
        query :=  format('SELECT * from price_markdown.fn_workbench_get_step_4_download(%1$s);',in_strategy_id);
        raise notice 'Default step4 function: --%' , query;
        return query execute query;
    elsif _prod_reco != _product_level_id or _store_reco != _store_level_id then
        query :=  format('SELECT * from price_markdown.fn_get_step4_other_level(%1$s, %2$s, %3$s, $1);',in_strategy_id, _product_level_id, _store_level_id);
        raise notice 'other level step4 function: --%' , query;
        return query execute query using _pcd_id;
    END IF;
END;
$function$
;