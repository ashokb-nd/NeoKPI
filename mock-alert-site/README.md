# Mock Alert Site

Simple local website to browse alert folders that contain videos and metadata.

## Expected folder shape

Each alert should be a subfolder under your data root:

- <alert-id>/0.mp4
- <alert-id>/1.mp4
- <alert-id>/metadata.txt

## Run

From the repository root:

```bash
ALERT_DATA_DIR="/Users/batakalaashok/Code/ak_tools/src/ak_tools/temp" PORT=8090 node mock-alert-site/server.js
```

Open:

- http://localhost:8090
- http://localhost:8090/alert-debug

## Direct annotations (no extension)

1. Open the site and select an alert.
2. Click `Enable Annotations`.
3. Annotations render on the first two videos using NeoKPI's `AnnotationManager` directly.

Notes:

- `metadata.txt` must contain valid JSON for annotations to initialize.
- The page imports modules from this repository via `/repo/src/*`.

## API

- `GET /api/alerts` list alert folders
- `GET /api/alerts/:id` alert details and full metadata text
- `GET /data/:id/:file` stream video or serve file
- `GET /repo/src/:path` serve NeoKPI source modules used by the mock page
