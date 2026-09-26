--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_column_day_partitions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_simulation_create_column_day_partitions

DROP PROCEDURE if exists price_promo_opt.pc_simulation_create_column_day_partitions;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_create_column_day_partitions(IN table_name character varying, IN scenario_ids integer[], IN var_start_date date, IN var_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$



DECLARE

    parent_partition_name varchar;

    scenario_id INT;



BEGIN

    -- Try to run the main partition creation procedure

    BEGIN

        CALL price_promo_opt.pc_wrapper_create_partitions(

            table_name,

            scenario_ids,

            var_start_date,

            var_end_date

        );

    EXCEPTION WHEN OTHERS THEN

        -- If the main procedure fails, handle the error

        RAISE NOTICE 'Main procedure failed. Dropping and recreating partitions.';



        -- Drop all main partitions for the provided scenario_ids

        FOREACH scenario_id IN ARRAY scenario_ids LOOP

            parent_partition_name := format('%s_%s', table_name, scenario_id);

            --EXECUTE format('DROP TABLE IF EXISTS %s CASCADE', parent_partition_name);

        END LOOP;



        -- Retry the main procedure

        RAISE NOTICE 'Retrying partition creation.';

        CALL price_promo_opt.pc_wrapper_create_partitions(

            table_name,

            scenario_ids,

            var_start_date,

            var_end_date

        );

    END;



END;



$procedure$
;

