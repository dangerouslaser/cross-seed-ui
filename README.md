# CrossSeed UI

A web-based graphical interface for managing [cross-seed](https://github.com/cross-seed/cross-seed) installations. Configure all options, manage integrations, and monitor your cross-seeding activity without manually editing `config.js`.

![Dashboard Screenshot](docs/dashboard.png)

## Features

- **Complete Configuration UI** - All cross-seed options configurable through the web interface
- **Connection Management** - Configure and test torrent clients, Prowlarr, Sonarr, Radarr, and autobrr
- **Prowlarr Integration** - Sync indexers automatically on a schedule
- **Config Backup & Restore** - Automatic backups with one-click restore
- **Dark/Light Theme** - System-aware theme switching
- **Mobile Responsive** - Works on desktop and mobile devices

## Installation (Docker)

Docker is the recommended installation method.

### Quick Start

```yaml
# docker-compose.yml
services:
  cross-seed:
    image: ghcr.io/cross-seed/cross-seed:latest
    container_name: cross-seed
    restart: unless-stopped
    user: 1000:1000
    volumes:
      - ./config:/config
      - /path/to/torrents:/torrents:ro
      - /path/to/data:/data
      - /path/to/links:/links
    ports:
      - "2468:2468"
    command: daemon

  crossseed-ui:
    image: ghcr.io/dangerouslaser/cross-seed-ui:latest
    container_name: crossseed-ui
    restart: unless-stopped
    volumes:
      - ./config:/config          # Shared with cross-seed
      - ./ui-data:/app/data       # UI database
    ports:
      - "3000:3000"
    environment:
      - CROSSSEED_URL=http://cross-seed:2468
      - CROSSSEED_CONFIG_PATH=/config/config.js
      - TZ=America/New_York
    depends_on:
      - cross-seed
```

```bash
docker compose up -d
```

Open http://localhost:3000 to access the UI.

### Adding to Existing Installation

If you already have cross-seed running, just add the UI container:

```yaml
# Add to your existing docker-compose.yml
services:
  crossseed-ui:
    image: ghcr.io/dangerouslaser/cross-seed-ui:latest
    container_name: crossseed-ui
    restart: unless-stopped
    volumes:
      # Point to your existing cross-seed config directory
      - /path/to/your/.cross-seed:/config:rw
      # UI data (new volume)
      - crossseed-ui-data:/app/data
    ports:
      - "3000:3000"
    environment:
      # Point to your existing cross-seed daemon
      - CROSSSEED_URL=http://cross-seed:2468
      # Or if on different host: http://192.168.1.100:2468
      - CROSSSEED_CONFIG_PATH=/config/config.js
    networks:
      - cross-seed_default  # Join cross-seed's network if needed

volumes:
  crossseed-ui-data:

# If cross-seed is in a different compose file:
networks:
  cross-seed_default:
    external: true
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CROSSSEED_URL` | Yes | - | URL to cross-seed daemon API |
| `CROSSSEED_CONFIG_PATH` | Yes | - | Path to config.js inside container |
| `PORT` | No | `3000` | Web UI port |
| `DISABLE_AUTH` | No | `false` | Disable authentication (for trusted networks) |
| `TZ` | No | `UTC` | Timezone |

### First Run

1. Access the UI at http://localhost:3000
2. Create an admin account (or set `DISABLE_AUTH=true` to skip)
3. Configure your connections and settings
4. Restart cross-seed when prompted to apply changes

## Building from Source

### Docker Build

```bash
git clone https://github.com/dangerouslaser/cross-seed-ui.git
cd cross-seed-ui
docker build -t cross-seed-ui .
```

### Local Development

```bash
git clone https://github.com/dangerouslaser/cross-seed-ui.git
cd cross-seed-ui
npm install
npm run dev
```

Create a `.env.local` file:

```env
CROSSSEED_URL=http://localhost:2468
CROSSSEED_CONFIG_PATH=/path/to/your/config.js
DISABLE_AUTH=true
```

## Configuration Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview of connections, stats, and quick setup |
| **Connections** | Torrent clients, Prowlarr, indexers, Sonarr/Radarr, autobrr |
| **Matching** | Match mode, size thresholds, content filters |
| **Paths** | Data directories, link directories, link type |
| **Scheduling** | RSS/search cadence, timeouts, limits |
| **Behavior** | Action mode, delay, recheck settings |
| **Network** | Host, port, API key |
| **Advanced** | Block list, raw config, backups |

## Architecture

CrossSeed UI is a companion application that:
- Reads and writes cross-seed's `config.js` file
- Communicates with the cross-seed daemon API for status
- Maintains its own SQLite database for UI state (Prowlarr sync, backups, etc.)

It does **not** fork or modify cross-seed. You continue to run the official cross-seed container and receive updates directly from the cross-seed project.

```
┌─────────────────────┐         ┌─────────────────────────────┐
│   CrossSeed UI      │  API    │   cross-seed (official)     │
│   Port: 3000        │◄───────►│   Port: 2468                │
└──────────┬──────────┘         └──────────────┬──────────────┘
           │                                    │
           │ read/write config.js               │ read config.js
           │                                    │
           ▼                                    ▼
┌──────────────────────────────────────────────────────────────┐
│                    Shared Config Volume                       │
│         /config: config.js, logs/, cross-seed.db             │
└──────────────────────────────────────────────────────────────┘
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.
