-- Drop existing tables

DROP TABLE IF EXISTS public.stages_cost;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.wallets;

-- Create wallets table

CREATE TABLE public.wallets (
	wallet_id			VARCHAR(36)		NOT NULL	PRIMARY KEY,
	address				VARCHAR(128)	NOT NULL	UNIQUE,
	private_key 		VARCHAR(128)	NOT NULL
);

-- Create projects table

DROP TYPE IF EXISTS  status_type;
CREATE TYPE status_type AS ENUM ('FUNDING', 'CANCELED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE public.projects (
	tx_hash				VARCHAR(128)	NOT NULL	PRIMARY KEY,
	project_id			INTEGER			NOT NULL	UNIQUE,
	current_stage		INTEGER			NOT NULL	DEFAULT 0,
	total_stages		INTEGER			NOT NULL,
	current_status		status_type		NOT NULL	DEFAULT 'FUNDING',
	owner_address 		VARCHAR(128)	NOT NULL 	REFERENCES public.wallets (address) ON DELETE RESTRICT,
	reviewer_address	VARCHAR(128)	NOT NULL 	REFERENCES public.wallets (address) ON DELETE RESTRICT
);

CREATE TABLE public.stages_cost (
	project_id			INTEGER			NOT NULL	REFERENCES public.projects (project_id) ON DELETE RESTRICT,
	stage				INTEGER			NOT NULL	DEFAULT 0,
	cost				NUMERIC			NOT NULL,
	PRIMARY KEY (project_id, stage)
);
