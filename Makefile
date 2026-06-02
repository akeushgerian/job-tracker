# Laufbahn — task runner.
# Two ways to run the project:
#   DEMO mode (recruiters): everything in Docker.   ->  make demo / make up / make down
#   DEV mode  (coding):     DB in Docker, app local. ->  make dev-db, then make dev-api / make dev-web
#
# Postgres always runs in Docker. The "test" database (port 5433) is a throwaway
# DB used only by `make test`; you never touch it directly.

.DEFAULT_GOAL := help
.PHONY: help demo up down stop start build rebuild seed reset logs ps \
        dev-db dev-api dev-web test clean wait wait-api

## ----------------------------------------------------------------------------
## Demo mode (full Docker — for recruiters / a shareable running instance)
## ----------------------------------------------------------------------------

demo: build up wait-api seed ## Build images, start everything, load demo data (recruiter-ready)
	@echo ""
	@echo "  Laufbahn is up:  http://localhost:5173"
	@echo "  Demo login:      recruiter@laufbahn.app / laufbahn-demo"

up: ## Start all containers (postgres + api + frontend) in the background
	docker compose up -d

down: ## Stop and remove all containers (keeps the database volume)
	docker compose down

stop: ## Pause containers without removing them
	docker compose stop

start: ## Resume previously stopped containers
	docker compose start

build: ## (Re)build the api + frontend images from current source
	docker compose build api frontend

rebuild: down build up ## Full clean restart with freshly built images

seed: ## Load demo data into the running app DB (idempotent)
	docker compose exec api node dist/db/seed.js

reset: ## DESTROY the database volume, then start fresh (api migrates on boot)
	docker compose down -v
	docker compose up -d
	@$(MAKE) wait
	@echo "Fresh database created and migrated. Run 'make seed' for demo data."

logs: ## Tail logs for api + frontend
	docker compose logs -f api frontend

ps: ## Show container status
	docker compose ps

## ----------------------------------------------------------------------------
## Dev mode (DB in Docker, API + web run locally with hot reload)
## ----------------------------------------------------------------------------

dev-db: ## Start ONLY the databases (dev on 5432, test on 5433)
	docker compose up -d postgres postgres_test
	@$(MAKE) wait
	pnpm --filter backend db:migrate

dev-api: ## Run the API locally with hot reload (needs `make dev-db` first)
	pnpm --filter backend dev

dev-web: ## Run the frontend locally with hot reload (proxies /api -> :3000)
	pnpm --filter frontend dev

## ----------------------------------------------------------------------------
## Tests & housekeeping
## ----------------------------------------------------------------------------

test: ## Run backend tests against the throwaway test DB (port 5433)
	docker compose up -d postgres_test
	@$(MAKE) wait
	pnpm --filter backend test

clean: ## Stop everything AND delete the database volume (full wipe)
	docker compose down -v

wait: ## (internal) Block until the dev Postgres is accepting connections
	@echo "Waiting for Postgres to be healthy..."
	@until docker compose exec -T postgres pg_isready -U jobtracker >/dev/null 2>&1; do sleep 1; done
	@echo "Postgres is ready."

wait-api: ## (internal) Block until the API is up (migrations run before it serves)
	@echo "Waiting for the API to be ready (migrations run on boot)..."
	@until curl -sf http://localhost:3000/health >/dev/null 2>&1; do sleep 1; done
	@echo "API is ready."

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
