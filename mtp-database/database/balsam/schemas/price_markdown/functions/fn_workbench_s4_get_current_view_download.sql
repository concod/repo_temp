--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_workbench_s4_get_current_view_download_v3_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_workbench_s4_get_current_view_download_v3_2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS price_markdown.fn_workbench_s4_get_current_view_download;

CREATE OR REPLACE FUNCTION price_markdown.fn_workbench_s4_get_current_view_download(_sid integer, _product_level_id integer, _store_level_id integer)
 RETURNS TABLE("BrandSKU" text, "Product Name" text[], product_level_value text, store_level_value text, pcd_start_date date, pcd_end_date date, approval_status character varying, "IA Reco Discount" numeric, "Fin Discount" numeric, "IA Reco Price Point" numeric, "Fin Price Point" numeric, "IA Reco Units" numeric, "Fin Units" numeric, "IA Reco Revenue" numeric, "Fin Revenue" numeric, "IA Reco Margin" numeric, "Fin Margin" numeric, "IA Reco Markdown" numeric, "Fin Markdown" numeric, "IA Reco Inventory" numeric, "Fin Inventory" numeric, "IA Reco Price Point Secondary" numeric, "Fin Price Point Secondary" numeric, "IA Reco Revenue Secondary" numeric, "Fin Revenue Secondary" numeric, "IA Reco Margin Secondary" numeric, "Fin Margin Secondary" numeric, "IA Reco Markdown Secondary" numeric, "Fin Markdown Secondary" numeric, primary_currency_symbol text, secondary_currency_symbol text, product_recommendation_level integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _prod_reco integer;
    _store_reco integer;
    query text;
begin
    select m1.product_recommendation_level, m1.store_recommendation_level
    from price_markdown.tb_strategy_master m1 where m1.strategy_id = _sid into _prod_reco, _store_reco;

    if _prod_reco = _product_level_id and _store_reco = _store_level_id then
        query :=  format('SELECT * from price_markdown.fn_workbench_s4_get_current_view_original(%1$s, %2$s);',_sid, _prod_reco);
        raise notice 'Default step4 function: --%' , query;
        return query execute query;
    elsif _prod_reco != _product_level_id or _store_reco != _store_level_id then
        query :=  format('SELECT * from  price_markdown.fn_workbench_s4_get_current_view_ol(%1$s, %2$s, %3$s);',_sid, _product_level_id, _store_level_id);
        raise notice 'other level step4 function: --%' , query;
        return query execute query;
    END IF;
END;
$function$
;
