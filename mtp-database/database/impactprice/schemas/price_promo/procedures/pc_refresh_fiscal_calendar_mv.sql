--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:pc_refresh_fiscal_calendar_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_refresh_fiscal_calendar_mv

DROP PROCEDURE IF EXISTS price_promo.pc_refresh_fiscal_calendar_mv;
CREATE OR REPLACE PROCEDURE price_promo.pc_refresh_fiscal_calendar_mv()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN

    REFRESH MATERIALIZED VIEW pricesmart.mvw_fiscal_calendar_year WITH DATA;

END;
$procedure$
;
