--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:allocate_replen_tag_1 stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for allocate_replen_tag

CREATE TABLE IF NOT EXISTS inventory_smart.allocate_replen_tag (
	article text NOT NULL,
	ph_code int4 NOT NULL,
	replenishment_status text NULL,
	last_updated_by int4 NULL,
	last_updated_at timestamptz NULL,
	CONSTRAINT allocate_replen_tag_un UNIQUE (article, ph_code),
	CONSTRAINT allocate_replen_tag_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE CASCADE,
	CONSTRAINT allocate_replen_tag_updated_by_fk FOREIGN KEY (last_updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

