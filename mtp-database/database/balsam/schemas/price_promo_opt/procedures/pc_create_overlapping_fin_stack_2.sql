--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_create_overlapping_fin_stack_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_create_overlapping_fin_stack_2

DROP PROCEDURE if exists price_promo_opt.pc_create_overlapping_fin_stack_2;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_create_overlapping_fin_stack_2(IN _promo_ids integer[], IN _suffix text)
 LANGUAGE plpgsql
AS $procedure$ 

DECLARE

    _min_start_date DATE;

    _max_start_date DATE;

    _overlap_promo_ids INT[];

    start_time TIMESTAMP;

    end_time TIMESTAMP;

    vl_test_query TEXT;

BEGIN

    -- Query 1: Get the date range for the provided promo IDs

    RAISE NOTICE 'query- 1 --%' , 'SELECT MIN(start_date), MAX(end_date) FROM price_promo.promo_master WHERE promo_id = ANY($1)';

    start_time := clock_timestamp();

    

    -- Ensure the query executes properly and stores the result into variables

    SELECT MIN(start_date), MAX(end_date)

    INTO _min_start_date, _max_start_date

    FROM price_promo.promo_master

    WHERE promo_id = ANY(_promo_ids);

    

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;



    -- Log the results for min and max dates

    RAISE NOTICE 'min_start_date: %, max_start_date: %', _min_start_date, _max_start_date;



    -- Query 2: Get promo_ids with overlapping dates and status in (4, 8)

    vl_test_query := format(

        'SELECT array_agg(promo_id) FROM price_promo.promo_master WHERE status IN (4, 8) AND end_date >= %L AND start_date <= %L', 

        _min_start_date, _max_start_date

    );

    RAISE NOTICE 'query- 2 --%', vl_test_query;

    start_time := clock_timestamp();

    

    EXECUTE vl_test_query INTO _overlap_promo_ids;



    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;



    -- Log the overlapping promo IDs (Optional)

    RAISE NOTICE 'overlap_promo_ids: %', _overlap_promo_ids;



    -- Query 3: Drop and create the first unlogged table (temp_table_1) in the correct schema

    vl_test_query := format(

        'DROP TABLE IF EXISTS price_promo_opt_temp.st_%1$s_tb1; 

         CREATE UNLOGGED TABLE price_promo_opt_temp.st_%1$s_tb1 AS 

         SELECT * 

         FROM price_promo.ps_recommended_finalized 

         WHERE promo_id = ANY (%L)', 

        _suffix, _promo_ids

    );

    RAISE NOTICE 'query- 3 --%', vl_test_query;

    start_time := clock_timestamp();

    

    EXECUTE vl_test_query;



    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;



    -- Query 3.1: Create index on product_id and recommendation_date in temp_table_1

    vl_test_query := format(

        'CREATE INDEX IF NOT EXISTS idx_st_%1$s_tb1_product_date ON 

		 price_promo_opt_temp.st_%1$s_tb1 (product_id, recommendation_date)',

        _suffix

    );

    RAISE NOTICE 'query- 3.1 --%', vl_test_query;

    start_time := clock_timestamp();

    

    EXECUTE vl_test_query;



    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 3.1 statement: %', end_time - start_time;



    -- Query 4: Drop and create the second unlogged table (temp_table_2) in the correct schema

    vl_test_query := format(

        'DROP TABLE IF EXISTS price_promo_opt_temp.st_%1$s_tb2; 

         CREATE UNLOGGED TABLE price_promo_opt_temp.st_%1$s_tb2 AS

         SELECT f2.* 

         FROM price_promo.ps_recommended_finalized f2

         INNER JOIN price_promo_opt_temp.st_%1$s_tb1 t1

            ON f2.product_id = t1.product_id

           AND f2.s0_id = t1.s0_id

           AND f2.s1_id = t1.s1_id

           AND f2.recommendation_date = t1.recommendation_date

         WHERE f2.promo_id = ANY (%L)', 

        _suffix, _overlap_promo_ids

    );

    RAISE NOTICE 'query- 4 --%', vl_test_query;

    start_time := clock_timestamp();

    

    EXECUTE vl_test_query;



    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;



    -- Query 5: Drop and create the final unlogged table in the correct schema

    vl_test_query := format(

        'DROP TABLE IF EXISTS price_promo_opt_temp.st_%1$s_tb3; 

         CREATE UNLOGGED TABLE price_promo_opt_temp.st_%1$s_tb3 AS

         SELECT promo_id, recommendation_date

         FROM price_promo_opt_temp.st_%1$s_promo_fin_overlap_product

         GROUP BY promo_id, recommendation_date', 

        _suffix

    );

    RAISE NOTICE 'query- 5 --%', vl_test_query;

    start_time := clock_timestamp();

    

    EXECUTE vl_test_query;



    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;



END;

$procedure$



;