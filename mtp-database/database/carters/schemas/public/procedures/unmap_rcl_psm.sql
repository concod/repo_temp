--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:unmap_rcl_psm1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start1
--comment: initial changeset for unmap_rcl_psm1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.unmap_rcl_psm();
CREATE OR REPLACE PROCEDURE public.unmap_rcl_psm()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.unmap_rcl_psm';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _rcl_code INT;
        _rcl_dt TEXT;
        _rcl_jsonb TEXT;
        _sql TEXT;
    BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        FOR _rcl_code, _rcl_dt, _rcl_jsonb IN
            SELECT 
                x.rcl_code, 
                string_agg(x.level || ' ' || y.generic_column_datatype, ', '), 
                string_agg(quote_literal(x.level) || ', ' || x.level, ', ')
            FROM 
                (SELECT rcl_code, unnest(level) AS level FROM global.rcl_master) x
            JOIN 
                global.product_generic_schema_mapping y 
            ON 
                x.level = y.generic_column_name
            GROUP BY 
                1
        LOOP
            EXECUTE '
                CREATE TEMP TABLE rcl_psm_master_rule_' || _rcl_code || ' ON COMMIT DROP AS
                SELECT 
                    rcl_code,
                    psa_code,
                    psa_name,
                    validity,
                    jsonb_build_object(' || _rcl_jsonb || ') AS rcl_dimension
                FROM (
                    SELECT 
                        concat(''{"'',
                            replace(replace(rcl_dimension,
                            ''::'',
                            ''":"''),
                            '';;'',
                            ''","''),
                            ''"}'')::jsonb as rcl_dimension,
                        rcl_code,
                        psa_code,
                        psa_name,
                        range_agg(daterange(start_date::date, end_date::date)) AS validity
                    FROM 
                    (     
                    select 
                    rcl_code:: int4,
                    rcl_dimension:: text,
                    psa_code::text,
                    article::text,
                    "size"::text,
                    psa_name:: text,
                    start_date:: date,
                    end_date:: date,
                    mapping_type:: text
                    from

                    public.unmapped_psm )  a
                    WHERE rcl_code = ' || _rcl_code || '
                    GROUP BY rcl_dimension, rcl_code, psa_code, psa_name
                ) x,
                jsonb_to_record(rcl_dimension) AS (' || _rcl_dt || ');';
            
            EXECUTE '
                DELETE FROM global.rcl_product_mapping_product_store x
                USING (
                    SELECT
                        rcl_code,
                        rule_code,
                        psa_code
         
                    FROM rcl_psm_master_rule_' || _rcl_code || ' x
                    JOIN global.rcl_product_mapping_product_store_rule y
                    USING (rcl_code, rcl_dimension)
                    GROUP BY 1, 2, 3
                ) y
                WHERE (x.rcl_code, x.rule_code, x.psa_code) = 
                      (y.rcl_code, y.rule_code, y.psa_code);';
        END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    END
$procedure$;