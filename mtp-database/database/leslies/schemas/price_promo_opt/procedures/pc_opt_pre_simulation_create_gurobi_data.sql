--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_pre_simulation_create_gurobi_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_pre_simulation_create_gurobi_data

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_pre_simulation_create_gurobi_data ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_pre_simulation_create_gurobi_data(IN var_promo_id integer, IN arr_speed_id integer[], IN var_week_start_date date, IN var_week_end_date date, IN var_start_date date, IN var_end_date date, IN table_suffix character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE
    query varchar;
BEGIN

---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------


query := format(

$sql$

DROP TABLE IF EXISTS price_promo_opt_temp.promo_gurobi_data_pre_%s;
CREATE UNLOGGED TABLE price_promo_opt_temp.promo_gurobi_data_pre_%s AS


select 1 as discount_constraint_hierarchy, discount_level_value as opt_level_bins, offer_type, offer_identifier, 
discount_filter as offer_value, 
calculated_discount as effective_discount_percentage,

round(coalesce(sum(sales_units),0)::numeric,2) as sales_units,
round(coalesce(sum((sales_units * discounted_price)),0)::numeric,2) as revenue,
round(coalesce(sum((sales_units * (discounted_price - cost))),0)::numeric,2) as margin,
round(coalesce(count(distinct product_id),1),0) as sku_count

from price_promo_opt_temp.promo_opt_pre_discount_filter_%s_final
where recommendation_date between '%s' and '%s' 
group by 1,2,3,4,5,6

$sql$,
-- parameters here 
table_suffix, table_suffix, table_suffix,
var_start_date, var_end_date
);

RAISE NOTICE 'Query : %',query;
execute query;


END;
$procedure$
;
