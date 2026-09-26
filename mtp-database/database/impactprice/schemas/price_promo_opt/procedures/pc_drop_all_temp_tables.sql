--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_drop_all_temp_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_drop_all_temp_tables

DROP PROCEDURE if exists price_promo_opt.pc_drop_all_temp_tables;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_drop_all_temp_tables()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _tbl text;
BEGIN
    FOR _tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema in( 'price_promo_opt_temp_old', 'price_promo_opt_temp')
        --  AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS price_promo_opt_temp.%I CASCADE;', _tbl);
		EXECUTE format('DROP TABLE IF EXISTS price_promo_opt_temp.%s CASCADE;', _tbl);
        EXECUTE format('DROP TABLE IF EXISTS price_promo_opt_temp_old.%I CASCADE;', _tbl);
		EXECUTE format('DROP TABLE IF EXISTS price_promo_opt_temp_old.%s CASCADE;', _tbl);
    END LOOP;
END;
$procedure$
;


