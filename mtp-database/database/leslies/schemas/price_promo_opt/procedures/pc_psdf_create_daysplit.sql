--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_daysplit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_daysplit

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_daysplit ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_daysplit(IN temp_table_name character varying, IN promo_start_date date, IN promo_end_date date, IN table_suffix character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

start_time timestamp; end_time timestamp; query2_tmp_day_split_ratio TEXT; 

begin


start_time := clock_timestamp();

query2_tmp_day_split_ratio := format (
$sql$

DROP TABLE IF EXISTS %s_tmp_day_split_ratio;
CREATE UNLOGGED TABLE %s_tmp_day_split_ratio AS

 
        WITH 
        pe AS materialized (
            SELECT DISTINCT df.product_id, df.s0_id, df.c0_id, 
            df.l0_cid, df.l1_cid, df.l2_cid, df.l3_cid
            FROM price_promo_opt_temp.promo_scenario_discount_filter_%s_base df -- table suffix
        ),

        pe2_prod AS (
          SELECT distinct df.product_id, df.l0_cid, df.l1_cid, df.l2_cid, df.l3_cid
            FROM pe df
        ),

        pe_l3 AS  (
            SELECT  distinct df.l0_cid, l1_cid, l2_cid, l3_cid, df.c0_id, df.s0_id
            FROM pe df
			group by 1,2,3,4,5,6
        ),
        
        dso_kvi AS (
            SELECT product_id, s0_id, c0_id,l0_cid, l1_cid, l2_cid, l3_cid, date as recommendation_date,
                   day_split_ratio AS day_split_ratio_kvi
            FROM (
                SELECT tdso.*, pe.l0_cid, pe.l1_cid, pe.l2_cid, pe.l3_cid
                FROM price_promo_opt.tb_day_split_opt_kvi tdso

				INNER JOIN pe 
				using(product_id, c0_id, s0_id)

                WHERE tdso.date BETWEEN '%s' AND '%s'
				--and tdso.day_split_ratio > 0 
				) foo
			
--            INNER JOIN dt on dso_kvi.date = dt.recommendation_date
--            INNER JOIN pe2_prod USING(product_id, c0_id) 
            ),

        dso AS (
            SELECT product_id, l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, date as recommendation_date,
                   day_split_ratio AS day_split_ratio,phase,coupon_rev_proportion, unique_coupon_cust
            FROM (
                SELECT tdso.*, CASE 
        WHEN EXTRACT(MONTH FROM date) BETWEEN 3 AND 5 THEN 1
        WHEN EXTRACT(MONTH FROM date) BETWEEN 6 AND 7 THEN 2
        WHEN EXTRACT(MONTH FROM date) BETWEEN 8 AND 9 THEN 3
        WHEN EXTRACT(MONTH FROM date) IN (10, 11, 12, 1, 2) THEN 4
    	END AS phase 
                FROM price_promo_opt.tb_day_split_opt tdso

				INNER JOIN pe_l3 p using(l0_cid, l1_cid, l2_cid, l3_cid, c0_id, s0_id)

                WHERE tdso.date BETWEEN '%s' AND '%s'
				--and tdso.day_split_ratio > 0 
            ) dso
--            INNER JOIN dt  on dso.date = dt.recommendation_date
            INNER JOIN pe2_prod USING(l0_cid, l1_cid, l2_cid, l3_cid) 
			LEFT JOIN price_promo.tb_coupon_redemption tcr
		 	using(l0_cid, l1_cid, l2_cid, l3_cid, c0_id,s0_id, phase)
           
        )

        SELECT  
            COALESCE(dso_kvi.product_id, dso.product_id) AS product_id,
		    COALESCE(dso_kvi.s0_id, dso.s0_id) AS s0_id,
		    COALESCE(dso_kvi.c0_id, dso.c0_id) AS c0_id,
		    COALESCE(dso_kvi.recommendation_date, dso.recommendation_date) AS recommendation_date,
		     week_start_date, phase, coupon_rev_proportion, unique_coupon_cust,
 
            COALESCE(day_split_ratio_kvi, dso.day_split_ratio, 0) AS day_split_ratio
from 
        dso 
        FULL OUTER JOIN dso_kvi USING(product_id, recommendation_date, s0_id, c0_id)
		INNER JOIN 
		(
			select date as recommendation_date, weeks_start_date as week_start_date from global.tb_fiscal_date_mapping
			where date between %L and %L
		) tfdm
		using(recommendation_date)
        

        $sql$,
        temp_table_name, temp_table_name,
        table_suffix, 
		promo_start_date, promo_end_date, 
		promo_start_date, promo_end_date, 
		promo_start_date, promo_end_date
		); 

RAISE NOTICE 'Query: %', query2_tmp_day_split_ratio;
EXECUTE query2_tmp_day_split_ratio;

end_time := clock_timestamp();
RAISE NOTICE 'Time taken _tmp_day_split table : %', end_time - start_time;

	
end; 
$procedure$
;
