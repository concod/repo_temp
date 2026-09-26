--liquibase formatted sql
--changeset shashwat.yadav:supply_route_delete runOnChange:true stripComments:false splitStatements:false context:MTP-72821 labels:MTP-72821
--comment: MTP-72821 Delete a network and its routes by network_id

DROP FUNCTION IF EXISTS inventory_smart.supply_route_delete(integer);
CREATE OR REPLACE FUNCTION inventory_smart.supply_route_delete(p_network_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM inventory_smart.supply_route
    WHERE network_id = $1;

    DELETE FROM inventory_smart.supply_network
    WHERE network_id = $1;
END;
$function$
;