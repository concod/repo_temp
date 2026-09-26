--liquibase formatted sql
--changeset liquibase:dc_transfer_recommendation_result_1 stripComments:false splitStatements:false context:MTP-81474 labels:MTP-81474
--comment: initial changeset for dc_transfer_recommendation_result
CREATE TABLE IF NOT EXISTS inventory_smart.dc_transfer_recommendation_result (
	article varchar NOT NULL,
	"size" varchar NOT NULL,
	launch_date date NULL,
	launch_floorset varchar(50) NULL,
	floorset_start_date date NULL,
	floorset_end_date date NULL,
	ship_date date NULL,
	dc_source varchar NULL,
	dc_destination varchar NULL,
	source_partner_count int4 NULL,
	destination_partner_count int4 NULL,
	source_oh int4 NULL,
	destination_oh int4 NULL,
	source_promised_quantity int4 NULL,
	destination_promised_quantity int4 NULL,
	source_need int4 NULL,
	destination_need int4 NULL,
	recommended_transfer_quantity int4 NULL,
	user_adjusted_transfer_quantity int4 NULL,
	po varchar NULL,
	reserved_quantity int4 NULL,
	partner_po_quantity int4 NULL,
	order_status int4 NULL,
	color_coding varchar NULL,
	article_date varchar NOT NULL,
	"type" varchar NULL,
	created_at timestamp DEFAULT now() NULL,
	created_by varchar NULL,
	updated_at timestamp NULL,
	is_deleted bool DEFAULT false NULL,
	allocation_codes varchar[] NULL,
	partner_list _text NULL
)

PARTITION BY RANGE (created_at);

CREATE INDEX idx_article 
ON inventory_smart.dc_transfer_recommendation_result 
USING btree (article);

CREATE INDEX idx_dc_transfer_recommendation_result_article_date 
ON inventory_smart.dc_transfer_recommendation_result 
USING btree (article_date);

CREATE INDEX idx_dc_transfer_recommendation_result_conflict 
ON inventory_smart.dc_transfer_recommendation_result 
USING btree (article_date, size, dc_source, dc_destination, type);
