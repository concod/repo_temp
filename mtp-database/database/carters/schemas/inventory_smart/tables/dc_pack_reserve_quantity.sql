--liquibase formatted sql
--changeset liquibase:product_profile_user_mapping stripComments:false splitStatements:false context:MTP-42310 labels:MTP-42310
--comment: MTP-42310-dc-pack-user-reserve
CREATE TABLE inventory_smart.dc_pack_reserve_quantity (
	pack_type_id varchar NULL,
	quantity int4 NULL,
	is_reserved bool NULL DEFAULT false,
	reserve_perc float4 NULL,
	channel varchar NULL,
	updated_at timestamptz NULL,
	reservation_till_date date NULL,
	created_at timestamptz NULL DEFAULT now(),
	instock_inclusion bool NULL DEFAULT true,
	updated_by varchar NULL,
	"comment" varchar NULL,
	article varchar NULL,
	dc_code int4 NULL,
	"type" varchar NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	CONSTRAINT article_pack_un UNIQUE (article, pack_type_id)
);
--changeset adesh.kumar:dc_pack_reserve_quantity stripComments:false splitStatements:false context:MTP-42310 labels:MTP-42310
--comment: MTP-42310-alter-column-name
ALTER TABLE inventory_smart.dc_pack_reserve_quantity RENAME COLUMN reserve_perc TO "percentage";

--changeset shrinidhi.choragi:drop_article_pack_un_constraint stripComments:false splitStatements:false context:modify constraint labels: modify constraint
--comment: Modifying existing unique constraint on article and pack_type_id to article, pack_type_id, dc_code
ALTER TABLE inventory_smart.dc_pack_reserve_quantity DROP CONSTRAINT article_pack_un;
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT article_pack_un UNIQUE (article, pack_type_id, dc_code);

--changeset shrinidhi.choragi:add_constraint stripComments:false splitStatements:false context:add dc constraint labels: add dc constraint
--comment: adding dc_code constraint from distribution centres
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD CONSTRAINT dc_pack_reserve_quantity_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;
--changeset shrinidhi.choragi@impactanalytics.co:dc_pack_reserve_quantity1 stripComments:false splitStatements:false context: dc_name addition labels:schema 
--comment: dc_name addition in dc_pack_reserve_quantity
ALTER TABLE inventory_smart.dc_pack_reserve_quantity ADD COLUMN IF NOT EXISTS dc_name varchar NULL ;