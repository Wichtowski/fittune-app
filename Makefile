# The API checkout whose dev fixtures `make fixtures` seeds
FITTUNE_API_DIR ?= ../fittune-api

.PHONY: install dev build preview typecheck lint test check deploy anatomy fixtures

install:
	bun install

dev:
	bun run dev

build:
	bun run build

preview:
	bun run preview

typecheck:
	bun run typecheck

lint:
	bun run lint

test:
	bun run test

check: typecheck lint test

deploy:
	bun run deploy

anatomy:
	uv run scripts/anatomy/build.py

fixtures:
	$(MAKE) -C $(FITTUNE_API_DIR) seed
