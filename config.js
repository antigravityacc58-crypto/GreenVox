// GreenVox shared-data configuration.
// Leave these blank to use device-local demo mode.
// To enable shared online citizen-science data, create a Supabase project,
// run supabase/schema.sql, then paste your Project URL and anon/public key here.
window.GREENVOX_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  COMMUNITY_OBSERVATION_GOAL: 50
};
window.GREENSCOPE_CONFIG = window.GREENVOX_CONFIG;
