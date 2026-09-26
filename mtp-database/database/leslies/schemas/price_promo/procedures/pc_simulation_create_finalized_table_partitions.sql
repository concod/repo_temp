--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_simulation_create_finalized_table_partitions.2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_create_finalized_table_partitions

DROP PROCEDURE IF EXISTS price_promo.pc_simulation_create_finalized_table_partitions(_int4);

CREATE OR REPLACE PROCEDURE price_promo.pc_simulation_create_finalized_table_partitions(IN arr_promo_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    var_promo_id integer;
    var_start_date date;
    var_end_date date;
BEGIN
    -- Loop through each promo ID in the input array
    FOREACH var_promo_id IN ARRAY arr_promo_id
    LOOP
        -- Get start and end dates for the promo ID
        SELECT start_date, end_date
        INTO var_start_date, var_end_date
        FROM price_promo_opt.fn_get_promo_details(var_promo_id);

        -- Call the procedure to create partitions
        CALL price_promo_opt.pc_simulation_create_column_day_partitions(
            'price_promo.ps_recommended_finalized',
            ARRAY[var_promo_id],
            var_start_date,
            var_end_date
        );
    END LOOP;
END;
$procedure$
;