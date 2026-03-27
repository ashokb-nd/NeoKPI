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
ALERT_DATA_DIR="/Users/batakalaashok/Code/ak_tools/src/ak_tools/temp" PORT=8090 node server.js
```

Open:

- http://localhost:8090
- http://localhost:8090/alert-debug

## Direct annotations (no extension)

1. Open the site and select an alert.
2. Keep `Annotations` enabled in the top bar.
3. Annotations render on the first two videos using the bundled `markrEdge` visualizers.

Notes:

- `metadata.txt` must contain valid JSON for annotations to initialize.
- Runtime dependencies are bundled under `markrEdge/` and served via `/markrEdge/*`.

## API

- `GET /api/alerts` list alert folders
- `GET /api/alerts/:id` alert details and full metadata text
- `GET /data/:id/:file` stream video or serve file
- `GET /markrEdge/:path` serve bundled runtime modules used by the mock page
