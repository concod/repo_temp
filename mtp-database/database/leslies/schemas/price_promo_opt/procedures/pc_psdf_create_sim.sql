--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_sim runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_sim

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_sim ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_sim(IN temp_table_name character varying, IN max_week_start_date date, IN max_week_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

start_time timestamp; end_time timestamp; query2_tmp_simulation TEXT; 

begin


start_time := clock_timestamp();

query2_tmp_simulation := format(
    $query$
    DROP TABLE IF EXISTS %s_tmp_simulation;
    CREATE UNLOGGED TABLE %s_tmp_simulation AS
    SELECT
        df.product_id,
        df.s0_id,
        week_start_date,
		--df.phase,
        df.customer_id,
        df.offer_type_id,
        tswo.baseline_sales_units,
        tswo.elasticity,
		df.offer_type_combined_display_name
    FROM (
        SELECT distinct
            df.product_id,
            df.s0_id,
--            df.week_start_date,
			--df.phase,
            df.customer_id,
            df.offer_type_id,
			df.offer_type_combined_display_name
        FROM %s_base df
    ) df
    INNER JOIN price_promo_opt.tb_simulation_week_opt tswo
        ON df.product_id = tswo.product_id
        AND df.s0_id = tswo.s0_id
        --AND df.week_start_date = tswo.week_start_date
        AND df.customer_id = tswo.c2_id
--        AND df.offer_type_id = tswo.deal_type;
	where tswo.week_start_date between '%s' and '%s'
    $query$,
    temp_table_name, temp_table_name, temp_table_name, max_week_start_date, max_week_end_date
);

 
-- Execute the table creation
RAISE NOTICE 'Creating temp table: %', query2_tmp_simulation;
EXECUTE query2_tmp_simulation;

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _tmp_simulation table : %', end_time - start_time;

	
end; 
$procedure$
;
