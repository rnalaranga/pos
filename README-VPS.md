# VPS Deployment Guide

This project is fully dockerized and ready to be deployed on any VPS (Ubuntu, Debian, CentOS, etc.) that has **Docker** and **Docker Compose** installed.

## 1. Prerequisites

Make sure your VPS has Docker and Docker Compose installed.
If not, you can install them on Ubuntu using:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker
```

## 2. Clone the Repository

Clone this repository on your VPS:
```bash
git clone <your-github-repo-url>
cd pos
```

## 3. Start the Application

Run the following command to build and start the database, backend, and frontend containers:
```bash
sudo docker-compose up -d --build
```
*Note: Depending on your docker-compose version, the command might be `docker compose` (without the hyphen).*

## 4. Setup Initial Admin User

Since it's a fresh database, you need to create the default admin user. Run the seeder inside the backend container:
```bash
sudo docker exec -it pos_backend npm run seed
```
This will create the default admin user:
- **Username:** `admin`
- **Password:** `admin`

## 5. Access the System

You can now access the POS system from your browser using your VPS's IP address:
```
http://<YOUR-VPS-IP>/
```

The frontend runs on port 80 and automatically proxies `/api` requests to the backend API running on port 5001.

## Notes
- To stop the system, run: `sudo docker-compose down`
- To view logs, run: `sudo docker-compose logs -f`
- To reset the database (WARNING: DELETES ALL DATA), run: `sudo docker-compose down -v`
