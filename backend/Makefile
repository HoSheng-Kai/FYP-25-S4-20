IMAGE_NAME = postgres:16
CONTAINER_NAME = backend_postgres

.PHONY: run run-prod stop clean check

# Development mode (foreground)
run:
	docker-compose up --build -d
	timeout /t 15 /nobreak
	npm install
	npm run dev

# Production mode (background with pm2)
run-prod:
	-pm2 delete fyp-backend 2>/dev/null || true
	docker-compose up --build -d
	docker-compose exec postgres pg_isready -h localhost -U admin -d fyp_db --timeout=30
	npm install
	npm run build
	pm2 start dist/index.js --name fyp-backend
	pm2 save

stop:
	docker-compose down
	-pm2 stop fyp-backend 2>/dev/null || true

clean:
	docker system prune -f
	docker volume prune -f
# 	-rmdir /s /q docker\postgres-data
	-sudo rm -rf docker/postgres-data

check:
	docker exec -it backend_postgres psql -U admin -d fyp_db -c "\dt fyp_25_s4_20.*"

logs:
	pm2 logs fyp-backend
