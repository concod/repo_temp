--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:price_promo_opt_drop_temp_tables runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for price_promo_opt.drop_temp_tables

DROP PROCEDURE IF EXISTS price_promo_opt.drop_temp_tables;


CREATE OR REPLACE PROCEDURE price_promo_opt.drop_temp_tables()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename, schemaname
        FROM pg_tables 
        WHERE schemaname = 'price_markdown_opt_temp' OR schemaname = 'price_promo_opt_temp'
    ) 
    LOOP
        BEGIN
            EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE;';
        EXCEPTION 
            WHEN others THEN
                RAISE WARNING 'Failed to drop table: % - Error: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;