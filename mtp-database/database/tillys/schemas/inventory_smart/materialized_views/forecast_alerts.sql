--liquibase formatted sql
--changeset anish.a:forecast_alerts_v3 runOnChange:false stripComments:false splitStatements:false context:zdt-views labels:MTP-1_v2
--comment: initial changeset for forecast_alerts_v3
--rollback: SELECT 1

--No dependency handling for this mv as it is recreated daily as part of kpi config. 
--No dependency allowed unless handled separately.
DROP MATERIALIZED VIEW IF EXISTS inventory_smart.forecast_alerts CASCADE ;
-- inventory_smart.forecast_alerts source

CREATE MATERIALIZED VIEW inventory_smart.forecast_alerts
AS SELECT *
   FROM inventory_smart.forecast_alerts_version
  WHERE version_code = global.get_table_version('inventory_smart.forecast_alerts_version'::text);
  
--changeset linu.nazil:forecast_alerts_v4 runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1_v2
--comment: initial changeset for forecast_alerts_v4
CREATE UNIQUE INDEX IF NOT EXISTS forecast_alerts_unique_idx ON inventory_smart.forecast_alerts
USING btree (article);
