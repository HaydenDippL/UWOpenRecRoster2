# UWOpenRecRoster 2

This is a revamp of my original [BadgerBasketball](https://github.com/HaydenDippL/BadgerBasketball) project. This new and improved version maintains the court schedules for both the Nick and Bakke, but also contains the **Climbing Wall, Esports, and Pool** schedules!

## Dev

```
docker compose up --build
```

The app is hosted on port *8000*, *8001*, *8002*. To access the website go to http://localhost:8000.

## Docker Cluster

This project is build on a docker cluster. The `docker-compose.yml` defines the functionality. There are three containers in the cluster: 
- A postgres container on port `8002` which contains the psql server for user analytics and schedule memoization
- Backend container on port `8001` which contains the go server for the backend endpoints
- A frontend container on port `8000` which doubles as the frontend app location aswell as a reverse proxy to map API calls to the backend with nginx.

Check out the [Frontend](frontend/README.md) and [Backend](backend/README.md) READMEs

### Connect

The service names are `nginx`, `postgres`, and `backend`. 

---

Connect to the psql server

```
docker compose exec postgres sh
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -p <DB_PORT>
```

Connect to the nginx server or backend

```
docker compose exec nginx sh
```

```
docker compose exec backend sh
```

---

Get the logs with 

```
docker compose logs <service-name>
```