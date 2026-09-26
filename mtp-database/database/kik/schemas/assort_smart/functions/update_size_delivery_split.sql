--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co:update_size_split_master_insert_logic runOnChange:true stripComments:false splitStatements:false context:fix_table_name_add_year labels:liquibase_project_start
--comment: update_size_split_master_insert_logic
DROP FUNCTION IF EXISTS assort_smart.update_size_delivery_split(order_placed_data jsonb, new_data jsonb, update_data jsonb, ssm_update_data jsonb);

CREATE OR REPLACE FUNCTION assort_smart.update_size_delivery_split(order_placed_data jsonb, new_data jsonb, update_data jsonb, ssm_update_data jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    
BEGIN
    -- update order placed data
    UPDATE assort_smart.size_delivery_split sds
    SET order_placed = (d.order_rec->>'order_placed')::boolean
    FROM (SELECT jsonb_array_elements(order_placed_data) AS order_rec) d
    WHERE sds.plan_code = (d.order_rec->>'plan_code')::integer
      AND sds.choice_id = d.order_rec->>'choice_id'
      AND sds.delivery = d.order_rec->>'delivery';

    
    /* -- update order placed data
    FOR record in SELECT * FROM jsonb_array_elements(order_placed_data) LOOP
        UPDATE assort_smart.size_delivery_split sds
        SET order_placed = (record->>'order_placed')::boolean
        WHERE sds.plan_code = (record->>'plan_code')::integer
        AND sds.choice_id = (record->>'choice_id')
        AND sds.delivery = (record->>'delivery');
    END LOOP;
    */

-------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------

    -- Insert new data in size_delivery_split
    INSERT INTO assort_smart.size_delivery_split
        (plan_code, choice_id, style_id, color_id, delivery,
         delivery_date, size_name, buy_units, delivery_perc)
    SELECT
        (new_rec->>'plan_code')::integer,
        new_rec->>'choice_id',
        new_rec->>'style_id',
        new_rec->>'color_id',
        new_rec->>'delivery',
        (new_rec->>'delivery_date')::date,
        new_rec->>'size_name',
        (new_rec->>'buy_units')::float,
        (new_rec->>'delivery_perc')::float
    FROM jsonb_array_elements(new_data) AS new_rec;

    /*-- Insert new data in size_delivery_split
    FOR record in SELECT * FROM jsonb_array_elements(new_data)
    LOOP
        INSERT INTO assort_smart.size_delivery_split (plan_code, choice_id, style_id, color_id, delivery, delivery_date, size_name, buy_units, delivery_perc)
        SELECT
            (record->>'plan_code')::integer,
            (record->>'choice_id'),
            (record->>'style_id'),
            (record->>'color_id'),
            (record->>'delivery'),
            (record->>'delivery_date')::date,
            (record->>'size_name'),
            (record->>'buy_units')::float,
            (record->>'delivery_perc')::float;
    END LOOP;*/
    
-------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------
    -- Update existing data in size_delivery_split
    UPDATE assort_smart.size_delivery_split sds
    SET buy_units = (d.upd_rec->>'buy_units')::float,
        delivery_perc = (d.upd_rec->>'delivery_perc')::float
    FROM (SELECT jsonb_array_elements(update_data) AS upd_rec) d
    WHERE sds.plan_code = (d.upd_rec->>'plan_code')::integer
      AND sds.choice_id = d.upd_rec->>'choice_id'
      AND sds.delivery = d.upd_rec->>'delivery'
      AND sds.size_name = d.upd_rec->>'size_name';

    /*-- Update existing data in size_delivery_split
    FOR record in SELECT * FROM jsonb_array_elements(update_data)
    LOOP
        UPDATE assort_smart.size_delivery_split sds
        SET
            buy_units = (record->>'buy_units')::float,
            delivery_perc = (record->>'delivery_perc')::float
        WHERE sds.plan_code = (record->>'plan_code')::integer 
            AND sds.choice_id = (record->>'choice_id')
            AND sds.delivery = (record->>'delivery')
            AND sds.size_name = (record->>'size_name');
    END LOOP;*/
    
-------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------

    WITH upd AS (
        SELECT
            (ssm_rec->>'plan_code')::INT AS plan_code,
            ssm_rec->>'choice_id' AS choice_id,
            ssm_rec->>'size_name' AS size_name,
            ssm_rec->>'cluster' AS cluster,
            (ssm_rec->>'buy_units')::FLOAT8 AS ssm_buy_units,
            (ssm_rec->>'store_count')::INT AS store_count
        FROM jsonb_array_elements(ssm_update_data) AS ssm_rec
    ),
    sds_totals AS (
        SELECT u.plan_code, u.choice_id, u.size_name, u.cluster,
               u.ssm_buy_units, u.store_count,
               SUM(sds.buy_units) AS sds_buy_units
        FROM assort_smart.size_delivery_split sds
        INNER JOIN upd u
            ON sds.plan_code = u.plan_code
            AND sds.choice_id = u.choice_id
            AND sds.size_name = u.size_name
        GROUP BY u.plan_code, u.choice_id, u.size_name, u.cluster,
                 u.ssm_buy_units, u.store_count
    )
    UPDATE assort_smart.size_split_master ssm
    SET buy_units = ssm.buy_units + (t.sds_buy_units - t.ssm_buy_units) / t.store_count
    FROM sds_totals t
    WHERE ssm.plan_code = t.plan_code
      AND ssm.choice_id = t.choice_id
      AND ssm.cluster = t.cluster
      AND ssm.size_name = t.size_name;

    /*-- update main table data in size_split_master
    FOR record in SELECT * FROM jsonb_array_elements(ssm_update_data)
    LOOP
        plancode := (record->>'plan_code')::INT;
        choiceid := record->>'choice_id';
        sizename := record->>'size_name';
        clustername := record->>'cluster';
        ssm_buy_units := (record->>'buy_units')::FLOAT8;
        storecount := (record->>'store_count')::INT;
        
        SELECT SUM(buy_units) INTO sds_buy_units
        FROM assort_smart.size_delivery_split sds
        WHERE sds.plan_code = plancode
          AND sds.choice_id = choiceid
          AND sds.size_name = sizename;
        
        UPDATE assort_smart.size_split_master ssm
        SET buy_units = buy_units + (sds_buy_units-ssm_buy_units)/storecount
        WHERE ssm.plan_code = plancode 
            AND ssm.choice_id = choiceid
            AND ssm.cluster = clustername
            AND ssm.size_name = sizename;
    END LOOP;*/

    RAISE NOTICE 'Size delivery split updated.';
    
END;
$function$
;