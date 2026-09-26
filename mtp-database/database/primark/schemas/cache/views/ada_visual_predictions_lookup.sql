--liquibase formatted sql
--changeset liquibase:ada_visual_predictions_lookup runOnChange:true stripComments:false splitStatements:false ignore:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ada_visual_predictions_lookup
--rollback: SELECT 1
DROP VIEW IF EXISTS "cache".ada_visual_predictions_lookup;
CREATE OR REPLACE VIEW "cache".ada_visual_predictions_lookup
AS SELECT 1 AS common,
    fw.fiscal_year_week,
    paf.*
   FROM ( SELECT fdm.fiscal_year_week
           FROM global.fiscal_date_mapping fdm
          WHERE fdm.date >= now() AND fdm.date <= (now() + '1 year'::interval)
          GROUP BY fdm.fiscal_year_week) fw
     CROSS JOIN global.product_attributes_filter paf;