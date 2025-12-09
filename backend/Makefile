IMAGE_NAME = postgres:16
CONTAINER_NAME = backend_postgres
ROOT := $(shell cd)

.PHONY: run stop clean check

run:
	docker-compose up --build -d
# 	docker logs -f $(CONTAINER_NAME)
	npm run dev
	

stop:
	docker-compose down

clean:
	docker system prune -f
	docker volume prune -f
	-rmdir /s /q docker\postgres-data
# restarting postgres data
# 	rd /s /q "$(ROOT)\docker\postgres-data"

check:
	docker exec -it backend_postgres psql -U admin -d fyp_db -c "\dt fyp_25_s4_20.*"