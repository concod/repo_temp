
--liquibase formatted sql
--changeset vaibhav@:pc_wrapper_create_partitions_2911 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_wrapper_create_partitions

DROP PROCEDURE IF EXISTS price_promo_opt.pc_wrapper_create_partitions;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_wrapper_create_partitions
(IN table_name text,
IN scenario_ids integer[],
IN var_start_date date,
IN var_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

    sql text;

    scenario_id INT;

    var_date DATE;

    partition_name TEXT;

    parent_partition_name TEXT;

BEGIN

    -- Loop through each scenario_id in the array

    FOREACH scenario_id IN ARRAY scenario_ids

    LOOP

        -- Create the first-level partition by scenario_id

        parent_partition_name := format('%s_%s', table_name, scenario_id);



        EXECUTE format(

            'CREATE TABLE IF NOT EXISTS %s PARTITION OF %s

             FOR VALUES IN (%s) PARTITION BY RANGE (recommendation_date)',

            parent_partition_name,

            table_name,

            scenario_id

        );



        -- Loop through each date between var_start_date and var_end_date

        var_date := var_start_date;



        WHILE var_date <= var_end_date LOOP

            -- Generate the subpartition name using the provided format

            partition_name := format('%s_%s', parent_partition_name, TO_CHAR(var_date, 'yyyymmdd'));



            -- Create a subpartition for the specific date

            sql := format(

                'CREATE TABLE IF NOT EXISTS %s PARTITION OF %s

                 FOR VALUES FROM (''%s'') TO (''%s'')',

                partition_name,

                parent_partition_name,

                var_date,

                var_date + INTERVAL '1 day'

            );



            -- Execute the SQL statement

            EXECUTE sql;



            -- Move to the next date

            var_date := var_date + INTERVAL '1 day';

        END LOOP;

    END LOOP;

END;

$procedure$
;