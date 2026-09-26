--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_get_configuration_value runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_configuration_value

DROP FUNCTION IF EXISTS price_promo.fn_get_configuration_value;
CREATE OR REPLACE FUNCTION price_promo.fn_get_configuration_value(
    p_module text,
    p_config_name text
)
 RETURNS text
 LANGUAGE plpgsql
AS $procedure$
declare
BEGIN

    return (
        select config_value 
        from price_promo.tb_tool_configurations
        where module = p_module and config_name = p_config_name
    );

END;
$procedure$
;
