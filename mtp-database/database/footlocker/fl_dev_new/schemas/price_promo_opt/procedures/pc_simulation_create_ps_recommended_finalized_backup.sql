--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_ps_recommended_finalized_backup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_ps_recommended_finalized_backup

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_ps_recommended_finalized_backup;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_ps_recommended_finalized_backup(IN arr_promo_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



BEGIN



    -- Drop the oldest backup if it exists



    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ps_recommended_finalized_backup_lwlw' AND schemaname = 'price_promo_opt') THEN



        DROP TABLE price_promo_opt.ps_recommended_finalized_backup_lwlw;



    END IF;







    -- Rename the backups to shift them



    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ps_recommended_finalized_backup_lw' AND schemaname = 'price_promo_opt') THEN



        ALTER TABLE price_promo_opt.ps_recommended_finalized_backup_lw



        RENAME TO ps_recommended_finalized_backup_lwlw;



    END IF;







    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'ps_recommended_finalized_backup_current' AND schemaname = 'price_promo_opt') THEN



        ALTER TABLE price_promo_opt.ps_recommended_finalized_backup_current



        RENAME TO ps_recommended_finalized_backup_lw;



    END IF;







    -- Create the new backup as '_current'



    DROP TABLE IF EXISTS price_promo_opt.ps_recommended_finalized_backup_current;



    CREATE TABLE price_promo_opt.ps_recommended_finalized_backup_current AS



    SELECT *, now() as backup_date



    FROM price_promo.ps_recommended_finalized



    WHERE promo_id = ANY(arr_promo_id);



    



    RAISE NOTICE 'Backup tables updated successfully.';



END;



$procedure$
;

