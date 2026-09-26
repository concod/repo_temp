--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:log_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for log_data

DROP FUNCTION IF EXISTS price_promo_opt.log_data ;
CREATE OR REPLACE FUNCTION price_promo_opt.log_data(data_input character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$



BEGIN

	 SET TIME ZONE 'Asia/Kolkata';



    INSERT INTO price_promo_opt.logs_temp_be_opt (log_time, data)



    VALUES (CURRENT_TIMESTAMP, data_input);



END;



$function$
;
