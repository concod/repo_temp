--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_drop_temp_tables_finalize runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_opt_drop_temp_tables_finalize

DROP PROCEDURE if exists price_promo_opt.pc_opt_drop_temp_tables_finalize;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_drop_temp_tables_finalize(IN _schema_temp text, IN _action_log_id character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Drop tables directly using EXECUTE format
    EXECUTE format('DROP TABLE IF EXISTS %I._pccd_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._sc_multiplier_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._sco_temp_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._scso_temp_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._ia_multiplier_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._iao_temp_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._iaso_temp_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._fo_temp_table_%s ;', _schema_temp, _action_log_id);
    EXECUTE format('DROP TABLE IF EXISTS %I._fso_temp_table_%s ;', _schema_temp, _action_log_id);

    RAISE NOTICE 'Tables dropped successfully for action_log_id: %', _action_log_id;
END;
$procedure$



;