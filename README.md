# Tafteria

Tafteria is a student-powered food discovery and review map for the Taft community. It combines searchable establishment listings, community reviews, profiles, photo uploads, and an interactive Leaflet map.

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB connection string

## Setup

1. Install packages:

   ```bash
   npm install
   ```

2. Create `key.env`:

   ```env
   SECRET_KEY=replace-with-a-long-random-value
   MONGODB_URI=mongodb://localhost:27017/tafteria
   OVERPASS_API_URL=https://overpass-api.de/api/interpreter
   MAPILLARY_ACCESS_TOKEN=replace-with-your-mapillary-client-token
   COVER_PHOTO_MODERATOR_USERNAMES=your-tafteria-username
   ```

   `COVER_PHOTO_MODERATOR_USERNAMES` accepts a comma-separated list. These accounts can approve or reject community cover-photo submissions. Establishment owners assigned through `ownerUser` can also manage cover photos for their listing, and their own uploads publish immediately.

   Signed-in members can suggest a cover photo from an establishment page. Community submissions remain private and pending until an owner or moderator approves them; approved photos replace API imagery across cards, maps, and detail pages while retaining visible contributor attribution.

3. Import `tafteria.users.json` and `tafteria.reviews.json` only if you need the legacy sample accounts and review. Establishments now come from the OpenStreetMap sync below.

   To replace the establishment collection with current OpenStreetMap food places around DLSU, preview and then run:

   ```bash
   node scripts/sync-openstreetmap-establishments.js
   node scripts/sync-openstreetmap-establishments.js --replace
   ```

   The replace command archives the previous collection and preserves ObjectIds for exact name matches so linked reviews remain valid.

   To fill placeholder images with the nearest Mapillary street-level capture, preview and then apply the backfill:

   ```bash
   npm run mapillary:backfill
   npm run mapillary:backfill -- --apply
   ```

   Nearby captures are limited to 60 meters by default and are labeled as nearby street views, since they are not guaranteed to show the establishment itself. Set `MAPILLARY_NEARBY_RADIUS_METERS` to a value from 20–100 only if you deliberately want a different limit.

4. Start the application:

   ```bash
   npm start
   ```

   For automatic restarts during development, use `npm run dev`.

5. Open [http://localhost:3000](http://localhost:3000).

## Verification

Run the automated tests with:

```bash
npm test
```

The application uses Express, Handlebars, Mongoose, Leaflet, Manrope, and Space Grotesk. Nearby open-data discovery is provided by OpenStreetMap contributors through the Overpass API and cached in memory to protect the shared service. Tafteria resolves Mapillary thumbnails server-side without exposing the token to browsers, prioritizing explicitly linked photos and using clearly labeled nearby street views for otherwise blank listings. Public uploads are intended for local development; production deployments should use a managed object-storage service and a persistent session store.
