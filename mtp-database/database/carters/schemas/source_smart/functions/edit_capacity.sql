--liquibase formatted sql
--changeset liquibase:edit_capacity stripComments:false splitStatements:false context:Release_1_0 runOnChange:true labels:liquibase_project_start
--comment: initial changeset for edit_capacity
DROP FUNCTION IF EXISTS source_smart.edit_capacity(character varying, integer, date, date, character varying);

CREATE OR REPLACE FUNCTION source_smart.edit_capacity(p_vendor_id character varying, p_monthly_capacity integer, p_valid_from_date date, p_valid_to_date date, p_mode character varying)
 RETURNS TABLE(r_v_capacity_id character varying, r_vendor_id character varying, r_monthly_capacity integer, r_valid_from_date date, r_valid_to_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    overlapping_capacity_count INT;
BEGIN

    CREATE TEMP TABLE IF NOT EXISTS capacity_with_overlap_types (
		v_capacity_id VARCHAR(255),
        vendor_id VARCHAR(255),
        monthly_capacity INTEGER,
        valid_from_date DATE,
        valid_to_date DATE,
        overlap_type TEXT
    ) ON COMMIT DROP;

    TRUNCATE capacity_with_overlap_types;

    INSERT INTO capacity_with_overlap_types
    SELECT 
        vc.v_capacity_id,
        vc.vendor_id,
        vc.monthly_capacity,
        vc.valid_from_date,
        vc.valid_to_date,
        CASE
            WHEN p_valid_from_date <= vc.valid_from_date AND p_valid_to_date >= vc.valid_to_date THEN 'FullOverlap'
            WHEN p_valid_from_date >= vc.valid_from_date AND p_valid_from_date <= vc.valid_to_date AND p_valid_to_date >= vc.valid_to_date THEN 'PartialOverlapEnd'
            WHEN p_valid_from_date <= vc.valid_from_date AND p_valid_to_date <= vc.valid_to_date AND p_valid_to_date >= vc.valid_from_date THEN 'PartialOverlapStart'
            WHEN p_valid_from_date > vc.valid_from_date AND p_valid_to_date < vc.valid_to_date THEN 'PartialOverlapBoth'
            ELSE 'NoOverlap'
        END AS overlap_type
    FROM source_smart.vendor_capacity vc
    WHERE vc.vendor_id = p_vendor_id
      AND (
            (p_valid_from_date <= vc.valid_from_date AND p_valid_to_date >= vc.valid_to_date)
         OR (p_valid_from_date >= vc.valid_from_date AND p_valid_from_date <= vc.valid_to_date AND p_valid_to_date >= vc.valid_to_date)
         OR (p_valid_from_date <= vc.valid_from_date AND p_valid_to_date <= vc.valid_to_date AND p_valid_to_date >= vc.valid_from_date)
         OR (p_valid_from_date > vc.valid_from_date AND p_valid_to_date < vc.valid_to_date)
      )
    ORDER BY vc.valid_from_date ASC;

    IF p_mode = 'add' THEN
        SELECT COUNT(*) INTO overlapping_capacity_count FROM capacity_with_overlap_types;

        IF overlapping_capacity_count > 0 THEN
            RAISE EXCEPTION 'Cannot add capacity: Overlapping records found';
        ELSE
            INSERT INTO source_smart.vendor_capacity (
                v_capacity_id, vendor_id, monthly_capacity, valid_from_date, valid_to_date
            )
            VALUES (
                uuid_generate_v4(), p_vendor_id, p_monthly_capacity, p_valid_from_date, p_valid_to_date
            );

        END IF;

    ELSIF p_mode = 'replace' THEN
		SELECT COUNT(*) INTO overlapping_capacity_count FROM capacity_with_overlap_types where overlap_type = 'FullOverlap';

		IF overlapping_capacity_count = 0 THEN
			RAISE EXCEPTION 'Did not find any capacity that can be replaced';
		END IF;

		SELECT COUNT(*) INTO overlapping_capacity_count FROM capacity_with_overlap_types where overlap_type <> 'FullOverlap';

		IF overlapping_capacity_count <> 0 THEN
			RAISE EXCEPTION 'Found capacities that has partial overlap. Please run with extend';
		END IF;

        DELETE FROM source_smart.vendor_capacity 
        WHERE v_capacity_id IN (
            SELECT v_capacity_id 
            FROM capacity_with_overlap_types 
            WHERE overlap_type = 'FullOverlap'
        );

        INSERT INTO source_smart.vendor_capacity (
            v_capacity_id, vendor_id, monthly_capacity, valid_from_date, valid_to_date
        )
        VALUES (
            uuid_generate_v4(), p_vendor_id, p_monthly_capacity, p_valid_from_date, p_valid_to_date
        );

	ELSIF p_mode in ('extend_new', 'extend_old') THEN

		SELECT COUNT(*) INTO overlapping_capacity_count FROM capacity_with_overlap_types where overlap_type <> 'FullOverlap';

		IF overlapping_capacity_count = 0 THEN
			RAISE EXCEPTION 'Found 0 capacities that has partial overlap. Run with add or replace';
		END IF;
		
		--split existing record and update monthly capacity accordingly
		UPDATE source_smart.vendor_capacity vc
		SET 
		    valid_from_date = CASE 
		        WHEN cu.overlap_type IN ('PartialOverlapStart') 
		            THEN p_valid_to_date + INTERVAL '1 day'
		        ELSE vc.valid_from_date 
		    END,
		    valid_to_date = CASE 
		        WHEN cu.overlap_type IN ('PartialOverlapEnd', 'PartialOverlapBoth') 
		            THEN p_valid_from_date - INTERVAL '1 day'
		        ELSE vc.valid_to_date 
		    END,
		    monthly_capacity = CASE 
		        WHEN p_mode = 'extend_new' 
		            THEN p_monthly_capacity
		        ELSE vc.monthly_capacity 
		    END

		FROM capacity_with_overlap_types cu 

		WHERE vc.v_capacity_id = cu.v_capacity_id
		AND cu.overlap_type IN ('PartialOverlapStart', 'PartialOverlapEnd', 'PartialOverlapBoth');

		-- FOR overlap at both end after truncating existing record and adding new record we need to add another record after the new record we added
		INSERT INTO source_smart.vendor_capacity (
            v_capacity_id, vendor_id, monthly_capacity, valid_from_date, valid_to_date
        )
        SELECT
            uuid_generate_v4(), 
			p_vendor_id, 
			CASE WHEN co.overlap_type = 'extend_new' THEN p_monthly_capacity ELSE co.monthly_capacity END, 
			p_valid_to_date + INTERVAL '1 day', 
			co.valid_to_date
		FROM capacity_with_overlap_types co
		WHERE overlap_type = 'PartialOverlapBoth' LIMIT 1;
		
		-- replace records that have full overlap
		DELETE FROM source_smart.vendor_capacity 
        WHERE v_capacity_id IN (
            SELECT v_capacity_id 
            FROM capacity_with_overlap_types 
            WHERE overlap_type = 'FullOverlap'
        );

		-- insert new record we received from user
        INSERT INTO source_smart.vendor_capacity (
            v_capacity_id, vendor_id, monthly_capacity, valid_from_date, valid_to_date
        )
        VALUES (
            uuid_generate_v4(), p_vendor_id, p_monthly_capacity, p_valid_from_date, p_valid_to_date
        );

	END IF;

	RETURN QUERY 
	SELECT 
		v_capacity_id, 
		vendor_id, 
		monthly_capacity, 
		valid_from_date, 
		valid_to_date 
	from source_smart.vendor_capacity
	where vendor_id = p_vendor_id;
END;
$function$
;
