IMAGE_NAME = postgres:16
CONTAINER_NAME = backend_postgres
ROOT := $(shell cd)

.PHONY: run stop clean

run:
	docker-compose up --build -d
# 	docker logs -f $(CONTAINER_NAME)
# 	npx nodemon index.js
	npm run dev

stop:
	docker-compose down

clean:
	docker system prune -f
	rmdir /s /q docker\postgres-data
# restarting postgres data
	rd /s /q "$(ROOT)\docker\postgres-data"
	
restart: stop run