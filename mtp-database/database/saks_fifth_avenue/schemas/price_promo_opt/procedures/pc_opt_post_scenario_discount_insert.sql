
--liquibase formatted sql
--changeset vaibhav@:pc_opt_post_scenario_discount_insert._v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_post_scenario_discount_insert

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_post_scenario_discount_insert ;    
     
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_post_scenario_discount_insert(IN var_promo_id integer, IN arr_speed_id integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

	var_start_date date;

	var_end_date date;

	var_week_start_date date;

	var_week_end_date date;

    query TEXT;

	table_suffix text;

BEGIN

	table_suffix := format('%s_%s', var_promo_id, array_to_string(arr_speed_id, '_'));

	RAISE NOTICE 'time_1_%', clock_timestamp();



	SELECT start_date, end_date, week_start_date, week_end_date FROM price_promo_opt.fn_get_promo_details(var_promo_id)

	INTO 	var_start_date, var_end_date, var_week_start_date, var_week_end_date;



	DELETE FROM price_promo.ia_ps_scenario_discounts

	WHERE promo_id = var_promo_id;





   	--     Additional logic for joining and calculations

    query := format('



		INSERT INTO price_promo.ia_ps_scenario_discounts

		(promo_id, scenario_id, discount_level_value, offer_type_id, offer_type, 

		offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, 

		offer_type_combined_display_name, created_by, created_at)

		SELECT distinct

		promo_id,promo_id, discount_level_value, opt_discount_type_id as offer_type_id, offer_type,

		offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value,

		price_promo.get_offer_description(discount_level::integer, offer_type::text, offer_x_value::numeric, offer_x_type::text, offer_y_value::numeric, offer_y_type::text, offer_z_value::numeric)

		AS offer_type_combined_display_name, created_by, created_at

		FROM 

		( 

		select 

		trim(offer_type::varchar) as offer_type , trim(opt_level_bins::varchar)::int8 as discount_level_value, trim(offer_identifier::varchar) as offer_identifier 

		from  

			public.gurobi_output_result_%s) subq

		left join (select trim(offer_type::varchar) as offer_type, offer_x_value, offer_x_type, offer_y_value, offer_y_type, offer_z_value, 
								offer_z_type, trim(offer_identifier::varchar) as offer_identifier , discount_filter
 from price_promo.master_valid_offers ) mv

		using(offer_identifier, offer_type)

		left join

		price_promo_opt.fn_get_rules_data(%s)

		using(offer_type)

;

 ', 

    --	table name

    table_suffix, var_promo_id

   );



    --	Print the query

    RAISE NOTICE '%', query;



    --	Execute the query

    EXECUTE query;

--   

--    CALL price_promo_opt.pc_create_date_partitions('price_promo','ps_recommended_ia_projected', 'day', '6 months');



END;

$procedure$

;