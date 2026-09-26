--liquibase formatted sql
--changeset bingimalla.divyasree@impactanalytics.co:pc_simulation_cannibalization_coefficientv1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:  changes for pc_simulation_cannibalization_coefficientv1

DROP PROCEDURE if exists price_promo_opt.pc_simulation_cannibalization_coefficient;
-- DROP PROCEDURE price_promo_opt.pc_simulation_cannibalization_coefficient(int4, varchar, date, date, _int4, bool);

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_cannibalization_coefficient(IN var_promo_id integer, IN var_discount_filter_name character varying, IN var_start_date date, IN var_end_date date, IN arr_scenario_id integer[], IN var_stack_flag boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

    query varchar;
BEGIN

   query := format('
        DROP TABLE IF EXISTS price_promo_opt_temp.promo_simulation_cannibalization_coefficient%s_%s_%s;
		CREATE UNLOGGED TABLE price_promo_opt_temp.promo_simulation_cannibalization_coefficient%s_%s_%s AS

        WITH victim_brand_products AS MATERIALIZED (

			Select distinct victim_brand, cannibalizer_brand, multiplier, min_value, max_value
			from
			(
            	SELECT distinct dd.product_id, concat_ws(''_'',pm.l0_id, pm.l1_id, pm.l2_id, pm.l3_id, pm.brand) as victim_brand, dd.effective_discount
			        FROM %s dd
					inner join price_promo.product_master as pm using (product_id)
			) a
			inner join price_promo_opt.tb_cannibalization_coefficient_opt b using (victim_brand)
        )

			select victim_brand, cannibalizer_brand, product_id, recommendation_date, min_value, max_value, multiplier,
			sum(sales_units) over (partition by cannibalizer_brand) as cannibalizer_brand_sales, effective_discount
			from
			( 
	            SELECT a.cannibalizer_brand, a.product_id, a.recommendation_date, effective_discount, sales_units
	            FROM (
		                SELECT fin.product_id, concat_ws(''_'',l0_id, l1_id, l2_id, l3_id,brand) as cannibalizer_brand,
						fin.recommendation_date, fin.effective_discount, sales_units
	
		                FROM price_promo.ps_recommended_finalized_stack fin
	
						inner join price_promo.product_master as pm using (product_id)
	
		                WHERE fin.recommendation_date BETWEEN %L AND %L and pm.is_active =1
	            	) a
					LEFT JOIN (select distinct product_id from %s) b USING (product_id)
            		WHERE b.product_id IS NULL
			)a
            INNER JOIN victim_brand_products b using (cannibalizer_brand) 
;

		CREATE INDEX IDX_promo_cannib_level%s_%s_%s
        ON price_promo_opt_temp.promo_simulation_cannibalization_coefficient%s_%s_%s
        USING btree (victim_brand);
    ',
	case when var_stack_flag then '_stack' else '' END,
	var_promo_id, array_to_string(arr_scenario_id, '_'),
	case when var_stack_flag then '_stack' else '' END,
    var_promo_id, array_to_string(arr_scenario_id, '_'),
    var_discount_filter_name,
    var_start_date, var_end_date,
	var_discount_filter_name,

    -- 3. Create index
	case when var_stack_flag then '_stack' else '' END,
    var_promo_id, array_to_string(arr_scenario_id, '_'),
	case when var_stack_flag then '_stack' else '' END,
    var_promo_id, array_to_string(arr_scenario_id, '_')
);

RAISE NOTICE '%', query;



    -- Execute the query

    EXECUTE query;


END;
$procedure$
;
