--liquibase formatted sql
--changeset charan.reddy:pack_config_valid_fiscal_weeks_4 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_2
--comment: exclude manual orders


DROP FUNCTION IF EXISTS oms.oms_get_pack_config_valid_fiscal_weeks(text);

CREATE OR REPLACE FUNCTION oms.oms_get_pack_config_valid_fiscal_weeks(in_style text)
 RETURNS TABLE(fiscal_week text, label text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    fiscal_year_week::TEXT,
   fiscal_year_week::TEXT AS label  
    FROM oms.oms_orders_recommended
    WHERE article = in_style and order_gen_type <> 'Manual'
      AND order_quantity_eaches > 0
  ORDER BY fiscal_year_week;
END;
$function$
;
