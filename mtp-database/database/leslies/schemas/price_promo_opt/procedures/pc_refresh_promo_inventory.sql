--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_refresh_promo_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_refresh_promo_inventory

DROP PROCEDURE IF EXISTS price_promo_opt.pc_refresh_promo_inventory ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_refresh_promo_inventory(IN promo_ids integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
AS $procedure$

DECLARE

    promo_id_to_process INT;

    inventory_count INT;

BEGIN

    -- If no promo_ids are provided, get future promo_ids

    IF promo_ids IS NULL OR array_length(promo_ids, 1) IS NULL THEN

        CREATE TEMP TABLE temp_promo_ids ON COMMIT DROP AS

        SELECT promo_id

        FROM price_promo.promo_master

        WHERE start_date > CURRENT_DATE;



        IF NOT FOUND THEN

            RETURN;

        END IF;



        FOR promo_id_to_process IN SELECT promo_id FROM temp_promo_ids LOOP

            CALL price_promo_opt.pc_calculate_total_promo_inventory(promo_id_to_process, inventory_count);

            UPDATE price_promo.promo_master

            SET total_inventory = inventory_count

            WHERE promo_id = promo_id_to_process;

        END LOOP;



    ELSE

        -- Process the provided array of promo_ids

        FOREACH promo_id_to_process IN ARRAY promo_ids LOOP

            CALL price_promo_opt.pc_calculate_total_promo_inventory(promo_id_to_process, inventory_count);

            UPDATE price_promo.promo_master

            SET total_inventory = inventory_count

            WHERE promo_id = promo_id_to_process;

        END LOOP;

    END IF;

END;

$procedure$
;
