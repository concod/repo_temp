--liquibase formatted sql
--changeset source_smart:decision_dashboard_alert_on_new_forecast stripComments:false splitStatements:false context:Release_1_0 labels:decision_dashboard_alerts runOnChange:true
--comment: FOR EACH STATEMENT trigger with transition table; processes entire bulk insert in one set-based query instead of row-by-row to avoid per-row overhead on large ETL loads

CREATE OR REPLACE FUNCTION source_smart.decision_dashboard_alert_on_new_forecast()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO source_smart.decision_dashboard_alerts (
        alert_type, season_name, division, forecast_version, message
    )
    SELECT DISTINCT ON (COALESCE(sm.season_name, nr.season_id), paf.l0_name, nr.forecast_version)
        'Forecast Update',
        COALESCE(sm.season_name, nr.season_id),
        paf.l0_name,
        nr.forecast_version,
        'New variant forecast available'
    FROM (
        SELECT DISTINCT season_id, forecast_version, product_code
        FROM new_rows
    ) nr
    JOIN global.product_attributes_filter paf ON paf.product_code = nr.product_code
    LEFT JOIN source_smart.season_master sm ON sm.season_id = nr.season_id
    ON CONFLICT (season_name, division, forecast_version)
    WHERE alert_type = 'Forecast Update'
    DO NOTHING;

    RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_decision_dashboard_alert_on_new_forecast
AFTER INSERT ON source_smart.granular_forecast_table_ua
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION source_smart.decision_dashboard_alert_on_new_forecast();
