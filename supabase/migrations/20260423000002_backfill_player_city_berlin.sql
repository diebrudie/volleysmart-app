-- Backfill existing players with Berlin, Germany, DE
UPDATE players
SET city = 'Berlin',
    country = 'Germany',
    country_code = 'DE'
WHERE city IS NULL;
