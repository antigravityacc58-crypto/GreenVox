# GreenVox Online Setup

## A. Public website only — fastest for ISIF

Deploy the folder as a static website. The site, map, satellite metrics, chart, survey tool, and local GeoJSON export will work immediately.

This is enough for a booth prototype.

## B. Shared community participation — recommended for social movement

GreenVox can switch automatically to a shared database when `config.js` contains valid Supabase credentials.

### Setup

1. Create a Supabase project.
2. In SQL Editor, run `supabase/schema.sql`.
3. In Project Settings / API, copy:
   - Project URL
   - anon/public key
4. Edit `config.js`:

```js
window.GreenVox_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
  COMMUNITY_OBSERVATION_GOAL: 50
};
```

5. Redeploy.

### What happens in shared mode

- all visitors read the same anonymous environmental observations;
- new field observations are inserted into the shared database;
- the impact counter becomes a real community counter;
- the public cannot edit or delete other observations through the provided database policy.

## C. Safety/privacy design

The pilot form should collect environmental observations only.

Do not request:
- student names;
- phone numbers;
- email addresses;
- identifiable face photos;
- exact home addresses;
- personal narratives unrelated to the environmental observation.

A school moderator can later be added if the pilot expands publicly.
