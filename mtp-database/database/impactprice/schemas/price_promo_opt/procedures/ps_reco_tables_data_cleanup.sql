--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:ps_reco_tables_data_cleanup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for ps_reco_tables_data_cleanup

DROP PROCEDURE IF EXISTS price_promo_opt.ps_reco_tables_data_cleanup;

CREATE OR REPLACE PROCEDURE price_promo_opt.ps_reco_tables_data_cleanup()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_table_name text;
BEGIN
    FOR v_table_name IN
        SELECT unnest(ARRAY[
            'price_promo.ps_recommended_scenarios',
            'price_promo.ps_recommended_scenarios_stack',
            'price_promo.ps_recommended_scenarios_stack_override',
            'price_promo.ps_recommended_ia_projected',
            'price_promo.ps_recommended_stack_ia',
            'price_promo.ps_recommended_stack_override_ia',
            'price_promo.ps_recommended_override',
            'price_promo.ps_recommended_override_ia'
        ])
    LOOP
        EXECUTE format(
            'DELETE FROM %s
             WHERE promo_id IN (
                 SELECT promo_id
                 FROM price_promo.promo_master
                 WHERE status NOT IN (4, 8)
                   AND end_date < current_date - 365
             )',
            v_table_name
        );
    END LOOP;
END;
$procedure$
;
